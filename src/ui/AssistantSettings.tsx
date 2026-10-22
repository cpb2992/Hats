import { useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { getClaudeKey, setClaudeKey } from '../services/secrets';
import { testClaudeKey } from '../services/assistant';
import { Icon } from './icons';
import { Btn, Card, Field, Label, Txt } from './kit';
import { C } from './theme';

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
            <Txt v="sub">Add a Claude API key and Say anything understands what you mean, not just keywords. It reads what you say against your bell schedule, your Hats calendar, tasks and caseload.</Txt>
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
