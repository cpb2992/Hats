import { useEffect, useState } from 'react';
import { Linking, Pressable, Switch, Text, View } from 'react-native';
import { askCalendarAccess, calendarSupported, defaultCalendar, hasCalendarAccess, listCalendars, type PhoneCalendar } from '../services/calendar';
import { getClaudeKey, setClaudeKey } from '../services/secrets';
import { testClaudeKey } from '../services/assistant';
import { useApp } from '../store/AppStore';
import { Icon } from './icons';
import { Btn, Card, Field, Label, tap, Txt } from './kit';
import { C, F } from './theme';

/** Connect the phone calendar, pick where new events go, and choose whether events show in Hats. */
export function CalendarSection() {
  const { data, mutate, refreshEvents } = useApp();
  const cal = data.settings.calendar;
  const [access, setAccess] = useState<boolean | null>(null);
  const [cals, setCals] = useState<PhoneCalendar[]>([]);

  useEffect(() => {
    let live = true;
    (async () => {
      const ok = await hasCalendarAccess();
      if (!live) return;
      setAccess(ok);
      if (!ok) return;
      setCals(await listCalendars());
      // Access was already granted (say, from the phone's settings) but nothing picked yet: use the main calendar.
      if (!cal.id) {
        const def = await defaultCalendar();
        if (live && def) { mutate(d => { d.settings = { ...d.settings, calendar: { ...d.settings.calendar, id: def.id, name: def.title } }; }); refreshEvents(); }
      }
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCal = (patch: Partial<typeof cal>) => mutate(d => { d.settings = { ...d.settings, calendar: { ...d.settings.calendar, ...patch } }; });

  const connect = async () => {
    tap();
    const ok = await askCalendarAccess();
    setAccess(ok);
    if (!ok) return;
    const list = await listCalendars();
    setCals(list);
    if (!cal.id) { const def = await defaultCalendar(); if (def) setCal({ id: def.id, name: def.title, show: true }); }
    refreshEvents();
  };

  if (!calendarSupported) return null;
  const writable = cals.filter(c => c.writable);
  return (
    <View style={{ gap: 12 }}>
      <Label>Calendar</Label>
      <Card style={{ gap: 12 }}>
        {!access ? (
          <>
            <Txt v="sub">Connect your phone’s calendar and Say anything puts meetings, appointments and IEP meetings straight on it. Your events show in Hats’ day view too.</Txt>
            <Btn title="Connect your calendar" icon="calendar" onPress={connect} />
            {access === false ? <Txt v="fine">If nothing pops up, allow Calendar for Hats in your phone’s Settings → Apps → Hats → Permissions.</Txt> : null}
          </>
        ) : (
          <>
            <Txt v="fine">New events go to</Txt>
            {writable.length ? writable.map(c => {
              const on = cal.id === c.id;
              return (
                <Pressable key={c.id} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${c.title}${c.account ? `, ${c.account}` : ''}`} onPress={() => { tap(); setCal({ id: c.id, name: c.title }); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.color }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.semi, fontSize: 15, color: C.ink }}>{c.title}</Text>
                    {c.account && c.account !== c.title ? <Text style={{ fontFamily: F.med, fontSize: 12, color: C.ink3 }}>{c.account}</Text> : null}
                  </View>
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? C.gold : C.ink3, alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.gold }} /> : null}
                  </View>
                </Pressable>
              );
            }) : <Txt v="sub">No calendar on this phone accepts new events. Add a Google account in your phone’s settings.</Txt>}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderTopWidth: 1, borderTopColor: C.line }}>
              <Txt v="semi" style={{ flex: 1 }}>Show calendar events in Hats</Txt>
              <Switch value={cal.show} onValueChange={show => { setCal({ show }); setTimeout(refreshEvents, 0); }} trackColor={{ true: C.gold, false: C.raised2 }} thumbColor={C.ink} accessibilityLabel="Show calendar events in Hats" />
            </View>
          </>
        )}
      </Card>
    </View>
  );
}

/** The Claude key that lets Say anything understand what Chris means. */
export function ClaudeSection() {
  const [saved, setSaved] = useState<boolean | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => { getClaudeKey().then(k => setSaved(!!k)).catch(() => setSaved(false)); }, []);

  const save = async () => {
    const k = draft.trim();
    if (!k) return;
    setBusy(true);
    setNote(null);
    const problem = await testClaudeKey(k);
    setBusy(false);
    if (problem) { setNote(problem); return; }
    await setClaudeKey(k);
    setDraft('');
    setSaved(true);
    setNote('Claude is on. Try “move my IEP meeting to after school Friday.”');
  };

  return (
    <View style={{ gap: 12 }}>
      <Label>Smart Say anything</Label>
      <Card style={{ gap: 12 }}>
        {saved ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icon name="check" size={18} color={C.gold} width={2.4} />
              <Txt v="semi" style={{ flex: 1 }}>Claude is on</Txt>
            </View>
            <Txt v="fine">Say anything understands what you mean and uses your schedule: “after school Friday”, “during my prep tomorrow”, “plus one for D.W.”, “I emailed Sadie”, “cancel the staff meeting”.</Txt>
            <Btn title="Remove key" kind="ghost" small onPress={async () => { await setClaudeKey(null); setSaved(false); setNote(null); }} />
          </>
        ) : (
          <>
            <Txt v="sub">Add a Claude API key and Say anything understands what you mean, not just keywords. It reads what you say against your bell schedule, calendar, tasks and caseload.</Txt>
            <Field value={draft} onChangeText={setDraft} placeholder="sk-ant-…" secureTextEntry autoCapitalize="none" autoCorrect={false} accessibilityLabel="Claude API key" />
            <Btn title={busy ? 'Checking…' : 'Save key'} disabled={!draft.trim() || busy} onPress={save} />
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://platform.claude.com/settings/keys').catch(() => {})} hitSlop={6}>
              <Txt v="fine" color={C.gold}>Get a key at platform.claude.com</Txt>
            </Pressable>
          </>
        )}
        {note ? <Txt v="fine" color={C.gold}>{note}</Txt> : null}
        <Txt v="fine">What goes to Claude: what you say, today’s schedule, calendar event titles, open task titles and student initials. No names or student details. Each command costs a fraction of a cent on your Claude account.</Txt>
      </Card>
    </View>
  );
}
