import { useEffect, useState } from "react";
import { Platform, Share, View } from "react-native";
import { currentSession } from "./cloud";
import {
  fetchHousehold,
  forgetShareState,
  joinHousehold,
  leaveHousehold,
  newInviteCode,
  showCode,
  startHousehold,
} from "./household";
import { Hat } from "./Hat";
import { SignIn } from "./SignIn";
import { usePersonal } from "./Store";
import { Button, Chip, Field, P, Panel, Row, T, ask } from "./ui";

/** Where someone gets Hats: the web version works on any phone, including iPhones. */
export const HATS_WEB = "https://hats-family.expo.app";
export const HATS_ANDROID = "https://github.com/cpb2992/Hats/releases";

export const inviteText = (name: string, code: string) =>
  `Join ${name} on Hats so we share groceries, dinners, date nights and the family calendar.\n\n` +
  `1. Get Hats: ${HATS_WEB} (any phone; on iPhone, Share → Add to Home Screen)` +
  ` or the Android app: ${HATS_ANDROID}\n` +
  `2. Settings → Family sharing → Join with a code\n` +
  `3. Code: ${showCode(code)}`;

async function shareInvite(text: string, say: (t: string) => void) {
  if (Platform.OS === "web") {
    const nav = typeof navigator === "undefined" ? undefined : navigator;
    try {
      if (nav?.share) return void (await nav.share({ text }));
    } catch {
      return;
    }
    try {
      await nav?.clipboard?.writeText(text);
      say("Invite copied. Paste it into a text.");
    } catch {
      say("Couldn’t copy. The code is on screen to read out.");
    }
    return;
  }
  await Share.share({ message: text });
}
const SHARED = [
  "Groceries and what’s in the kitchen",
  "The dinner plan",
  "Date nights (unless you mark one a surprise)",
  "Family events: partner, kids, home and pets",
  "To-dos you choose to share",
];
const PRIVATE = "Work, Myself, Friends, your own hats, notes, gifts, money and Google events stay on your phone.";

/** Settings → Family sharing. */
export function FamilySettings() {
  const { data, absorb, say } = usePersonal();
  const home = data.household;
  const [account, setAccount] = useState<string | null>(null);
  const [mode, setMode] = useState<"start" | "join">("start");
  const [name, setName] = useState("");
  const [me, setMe] = useState(data.preferences.name);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const keep = (h: NonNullable<typeof home>) =>
    absorb((d) => {
      d.household = h;
      return true;
    });
  useEffect(() => {
    let live = true;
    currentSession()
      .then(async (s) => {
        if (!live) return;
        setAccount(s?.user.email ?? "");
        // Already in a family on the server (a new phone, or a reinstall)? Pick it back up.
        if (s && !data.household) {
          const found = await fetchHousehold().catch(() => null);
          if (live && found) keep(found);
        }
      })
      .catch(() => live && setAccount(""));
    return () => {
      live = false;
    };
    // Only when the screen opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      say(e instanceof Error ? e.message : "That didn’t work. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (account === null)
    return (
      <Panel>
        <T muted>Checking your sign-in…</T>
      </Panel>
    );

  const explainer = (
    <View style={{ gap: 4 }}>
      <T bold size={13}>
        SHARED WITH YOUR FAMILY
      </T>
      {SHARED.map((s) => (
        <T key={s} size={14}>
          • {s}
        </T>
      ))}
      <T size={13} muted>
        {PRIVATE}
      </T>
    </View>
  );

  if (!account)
    return (
      <Panel>
        <Row>
          <Hat id="propeller" size={40} tilt={-8} />
          <View style={{ flex: 1 }}>
            <T bold>Plan the week together</T>
            <T muted size={13}>
              Share groceries, dinners and the family calendar with your partner. Sign in first so
              Hats knows which family is yours.
            </T>
          </View>
        </Row>
        {explainer}
        <SignIn
          say={say}
          cta="Email me a sign-in link"
          onSignedIn={(who) => {
            setAccount(who);
            say("Signed in. Now start or join your family.");
          }}
        />
      </Panel>
    );

  if (!home)
    return (
      <Panel>
        <T bold>Share with your family</T>
        <T muted size={13}>
          One of you starts it and sends the code. Everyone else joins with it.
        </T>
        <Row>
          <Chip title="Start one" selected={mode === "start"} onPress={() => setMode("start")} />
          <Chip title="Join with a code" selected={mode === "join"} onPress={() => setMode("join")} />
        </Row>
        <Field label="Your name, as your family sees it" value={me} onChangeText={setMe} maxLength={40} />
        {mode === "start" ? (
          <>
            <Field
              label="Family name"
              placeholder="The Barnes house"
              value={name}
              onChangeText={setName}
              maxLength={60}
            />
            {explainer}
            <Button
              title="Start sharing"
              disabled={busy || !me.trim()}
              onPress={() =>
                run(async () => {
                  const h = await startHousehold(name.trim() || "Our home", me.trim());
                  await forgetShareState();
                  keep(h);
                  say("Your family is ready. Send the invite code.");
                })
              }
            />
          </>
        ) : (
          <>
            <Field
              label="Invite code"
              placeholder="ABCD-2345"
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
            />
            <T muted size={13}>
              Your groceries, dinners and family events join theirs. Where you both planned the same
              night’s dinner, theirs is kept.
            </T>
            <Button
              title="Join"
              disabled={busy || !me.trim() || code.replace(/[^A-Za-z0-9]/g, "").length !== 8}
              onPress={() =>
                run(async () => {
                  const h = await joinHousehold(code, me.trim());
                  await forgetShareState();
                  keep(h);
                  say(`You joined ${h.name}.`);
                })
              }
            />
          </>
        )}
      </Panel>
    );

  return (
    <Panel>
      <Row>
        <Hat id="propeller" size={40} tilt={-8} />
        <View style={{ flex: 1 }}>
          <T bold size={17}>
            {home.name}
          </T>
          <T muted size={13}>
            {home.members.map((m) => (m.id === home.me ? `${m.name} (you)` : m.name)).join(", ")}
          </T>
        </View>
      </Row>
      {home.members.length < 2 ? (
        <T size={14}>Just you so far. Send the code to your partner (or anyone in the house).</T>
      ) : null}
      <View
        accessible
        accessibilityLabel={`Invite code ${home.code.split("").join(" ")}`}
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: P.ink,
          backgroundColor: P.soft,
        }}
      >
        <T size={12} muted>
          INVITE CODE
        </T>
        <T bold size={26} style={{ letterSpacing: 2, fontVariant: ["tabular-nums"] }} selectable>
          {showCode(home.code)}
        </T>
      </View>
      <Button
        title="Send the invite"
        onPress={() => shareInvite(inviteText(home.name, home.code), say)}
      />
      {explainer}
      <Row>
        <Button
          title="New code"
          quiet
          disabled={busy}
          onPress={() =>
            run(async () => {
              const fresh = await newInviteCode();
              keep({ ...home, code: fresh });
              say("New code made. The old one no longer works.");
            })
          }
        />
        <Button
          title="Stop sharing"
          quiet
          disabled={busy}
          onPress={() =>
            ask(
              "Stop sharing with your family?",
              "Everything already on this phone stays here. New changes won’t go back and forth.",
              "Stop sharing",
              () =>
                run(async () => {
                  await leaveHousehold();
                  absorb((d) => {
                    delete d.household;
                    return true;
                  });
                  say("You stopped sharing. Everything stays on this phone.");
                }),
            )
          }
        />
      </Row>
    </Panel>
  );
}
