import { useEffect, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import { router } from "expo-router";
import {
  currentSession,
  getConfig,
  googleCalendars,
  googleSignIn,
  readGoogleEvents,
  sendCode,
  setConfig,
  signOut,
  verifyCode,
} from "../personal/cloud";
import { exportPersonal, pickBackup } from "../personal/backup";
import { useEditor, required } from "../personal/Editor";
import { makeTask } from "../personal/engine";
import { usePersonal } from "../personal/Store";
import { enableReminders } from "../personal/reminders";
import { legacyHomeTasks, secretGet, secretSet } from "../personal/storage";
import { pinPersonalWidget } from "../personal/widgets";
import {
  DISTRACTIONS,
  focusAvailable,
  openFocusSettings,
  useFocusEnabled,
} from "../personal/focus";
import {
  Button,
  Check,
  Chip,
  Field,
  Header,
  Page,
  Panel,
  Row,
  Section,
  T,
} from "../personal/ui";

function confirm(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Continue", onPress: onConfirm },
    ]);
}
const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export default function Settings() {
  const {
    data,
    mutate,
    replace,
    reload,
    say,
    sync,
    syncStatus,
    conflict,
    resolve,
    today,
    error,
  } = usePersonal();
  const editor = useEditor();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [account, setAccount] = useState("");
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [calendars, setCalendars] = useState<{ id: string; summary: string }[]>(
    [],
  );
  const [selected, setSelected] = useState<string[]>([]);
  const focusEnabled = useFocusEnabled();
  useEffect(() => {
    getConfig().then((c) => setConfigured(!!c));
    currentSession()
      .then((s) => setAccount(s?.user.email ?? ""))
      .catch(() => {});
    secretGet("hats.google.calendars").then((v) => {
      if (v) setSelected(JSON.parse(v));
    });
  }, []);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      say(
        e instanceof Error ? e.message : "That action could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  };
  const routine = () =>
    editor.open({
      title: "Your planning windows",
      detail:
        "These are availability windows, not exact dinner or bedtime appointments. Your evening sequence stays flexible.",
      fields: [
        {
          key: "homeTime",
          label: "Weekday home window starts · HH:MM",
          value: data.preferences.homeTime,
        },
        {
          key: "endTime",
          label: "Weekday window ends · HH:MM",
          value: data.preferences.endTime,
        },
        {
          key: "weekendStart",
          label: "Weekend starts · HH:MM",
          value: data.preferences.weekendStart,
        },
        {
          key: "weekendEnd",
          label: "Weekend ends · HH:MM",
          value: data.preferences.weekendEnd,
        },
        {
          key: "gymStart",
          label: "Gym starts · HH:MM",
          value: data.preferences.gymStart,
        },
        {
          key: "gymMinutes",
          label: "Gym duration in minutes",
          value: String(data.preferences.gymMinutes),
          numeric: true,
        },
      ],
      onSave: (v) => {
        for (const k of [
          "homeTime",
          "endTime",
          "weekendStart",
          "weekendEnd",
          "gymStart",
        ])
          if (!validTime(v[k]))
            throw new Error("Use valid 24-hour times, like 16:45.");
        if (v.endTime <= v.homeTime || v.weekendEnd <= v.weekendStart)
          throw new Error("Each window must end after it starts.");
        const gymMinutes = Number(v.gymMinutes);
        if (!Number.isFinite(gymMinutes) || gymMinutes < 15 || gymMinutes > 180)
          throw new Error("Use 15–180 minutes for the gym.");
        mutate((d) =>
          Object.assign(d.preferences, {
            homeTime: v.homeTime,
            endTime: v.endTime,
            weekendStart: v.weekendStart,
            weekendEnd: v.weekendEnd,
            gymStart: v.gymStart,
            gymMinutes,
          }),
        );
      },
    });
  return (
    <Page tabs={false}>
      <Header title="Your life, your settings." back />
      {error ? (
        <Panel>
          <T>{error}</T>
          <Button
            title="Try opening saved data again"
            onPress={() => run(reload)}
          />
        </Panel>
      ) : null}
      <Section title="Personal setup" />
      <Panel>
        <T size={21} bold>
          {data.preferences.name || "Your profile"}
        </T>
        <T muted>
          {data.preferences.city} · up to {data.preferences.travelMinutes}{" "}
          minutes of travel
        </T>
        <Button
          title="Edit names and preferences"
          quiet
          onPress={() =>
            editor.open({
              title: "Your profile",
              fields: [
                {
                  key: "name",
                  label: "Your name",
                  value: data.preferences.name,
                },
                {
                  key: "partner",
                  label: "Partner’s name",
                  value: data.preferences.partner,
                },
                {
                  key: "city",
                  label: "Home area",
                  value: data.preferences.city,
                },
                {
                  key: "travel",
                  label: "Travel limit in minutes",
                  value: String(data.preferences.travelMinutes),
                  numeric: true,
                },
                {
                  key: "budget",
                  label: "Date budget, excluding childcare and transport",
                  value: String(data.preferences.dateBudget),
                  numeric: true,
                },
              ],
              onSave: (v) => {
                const travel = Number(v.travel),
                  budget = Number(v.budget);
                if (
                  !Number.isFinite(travel) ||
                  travel < 5 ||
                  travel > 240 ||
                  !Number.isFinite(budget) ||
                  budget < 0
                )
                  throw new Error("Use a valid travel limit and budget.");
                mutate((d) =>
                  Object.assign(d.preferences, {
                    name: v.name.trim(),
                    partner: v.partner.trim(),
                    city: required(v.city, "your area"),
                    travelMinutes: travel,
                    dateBudget: budget,
                  }),
                );
              },
            })
          }
        />
        <Button title="Edit planning windows" quiet onPress={routine} />
        <T size={13} bold>
          Usual gym days · tap to choose
        </T>
        <Row>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, i) => (
            <Chip
              key={label}
              title={label}
              selected={data.preferences.gymDays.includes(i)}
              onPress={() =>
                mutate((d) => {
                  d.preferences.gymDays = d.preferences.gymDays.includes(i)
                    ? d.preferences.gymDays.filter((n) => n !== i)
                    : [...d.preferences.gymDays, i];
                })
              }
            />
          ))}
        </Row>
        <T size={12} muted>
          No gym days are assumed until you choose them. Keep unusual days as
          personal calendar events.
        </T>
      </Panel>
      <Section title="Reminders and widgets" />
      <Panel>
        <Check
          title="Optional adventures and playful prompts"
          done={data.preferences.playful !== false}
          onPress={() =>
            mutate((d) => {
              d.preferences.playful = d.preferences.playful === false;
            })
          }
        />
        <T muted>
          Choose a small adventure because it feels worthwhile. Your chosen
          streaks stay separate; you can track daily actions or weekly goals
          without relationship scores.
        </T>
      </Panel>
      <Panel>
        <Check
          title="Phone reminders"
          done={data.preferences.notifications}
          onPress={() =>
            run(async () => {
              if (data.preferences.notifications)
                mutate((d) => {
                  d.preferences.notifications = false;
                });
              else {
                await enableReminders();
                mutate((d) => {
                  d.preferences.notifications = true;
                });
              }
            })
          }
        />
        <T muted>
          Morning {data.preferences.morningReminder} · Evening{" "}
          {data.preferences.eveningReminder}. Watch vibrations follow your
          phone/watch notification settings.
        </T>
        <Button
          title="Change reminder times"
          quiet
          onPress={() =>
            editor.open({
              title: "When reminders help",
              fields: [
                {
                  key: "morning",
                  label: "Morning · HH:MM",
                  value: data.preferences.morningReminder,
                },
                {
                  key: "evening",
                  label: "Evening · HH:MM",
                  value: data.preferences.eveningReminder,
                },
              ],
              onSave: (v) => {
                if (!validTime(v.morning) || !validTime(v.evening))
                  throw new Error("Use valid 24-hour times.");
                mutate((d) => {
                  d.preferences.morningReminder = v.morning;
                  d.preferences.eveningReminder = v.evening;
                });
              },
            })
          }
        />
        <Button
          title="Add my next-step widget"
          quiet
          onPress={() =>
            run(async () => {
              const added = await pinPersonalWidget();
              if (!added)
                say("Add Hats from your Android home screen’s Widgets menu.");
            })
          }
        />
        <T size={12} muted>
          Android may let you dismiss an ongoing notification. The task remains
          in Hats and your widget until handled.
        </T>
      </Panel>
      <Section title="Private account and recovery" />
      <Panel>
        <T size={21} bold>
          Protected family time
        </T>
        <T muted>
          {focusAvailable
            ? focusEnabled
              ? "Android service enabled"
              : "Android service not enabled"
            : "Available in the Android build"}
        </T>
        <T>
          With your permission, Hats uses Android Accessibility to detect only
          the package name of an app you open. During a session you start,
          opening a selected distracting app returns you to the home screen.
        </T>
        <T muted>
          It does not read screen contents, messages, or typed text, and sends
          no accessibility data anywhere. You can end a session in Hats, or
          disable the service in Android Settings at any time.
        </T>
        <Check
          title="I understand and want this optional protection"
          done={!!data.preferences.focusConsent}
          onPress={() =>
            mutate((d) => {
              d.preferences.focusConsent = !d.preferences.focusConsent;
              if (
                d.preferences.focusConsent &&
                !d.preferences.distractingPackages?.length
              )
                d.preferences.distractingPackages = DISTRACTIONS[0].packages;
            })
          }
        />
        {DISTRACTIONS.map((app) => (
          <Check
            key={app.name}
            title={app.name}
            done={app.packages.some((p) =>
              data.preferences.distractingPackages?.includes(p),
            )}
            onPress={() =>
              mutate((d) => {
                const current = d.preferences.distractingPackages ?? [];
                d.preferences.distractingPackages = app.packages.some((p) =>
                  current.includes(p),
                )
                  ? current.filter((p) => !app.packages.includes(p))
                  : [...current, ...app.packages];
              })
            }
          />
        ))}
        <Button
          title="Open Android accessibility settings"
          quiet
          disabled={!data.preferences.focusConsent || !focusAvailable}
          onPress={() => run(openFocusSettings)}
        />
      </Panel>
      <Panel>
        <T bold>
          {account
            ? `Signed in as ${account}`
            : "Keep your plan across devices"}
        </T>
        <T muted>{syncStatus}</T>
        <T size={12} muted>
          {Platform.OS === "web"
            ? "This browser preview uses browser storage."
            : "On this phone, your plan is encrypted with a key protected by the device."}{" "}
          Cloud sync uses your private account; it is not end-to-end encryption.
        </T>
        {!configured ? (
          <>
            <T muted>
              Private sync needs a configured backend. Your app works locally
              while it’s disconnected.
            </T>
            <Button
              title="Configure private sync"
              quiet
              onPress={() =>
                editor.open({
                  title: "Private sync connection",
                  detail:
                    "Use a configured Supabase project with the Hats personal-state migration. Only its public publishable/anon key belongs here; never a service-role secret.",
                  fields: [
                    {
                      key: "url",
                      label: "Supabase project URL",
                      placeholder: "https://your-project.supabase.co",
                    },
                    { key: "key", label: "Public publishable or anon key" },
                  ],
                  onSave: async (v) => {
                    await setConfig({ url: v.url.trim(), key: v.key.trim() });
                    setConfigured(true);
                  },
                })
              }
            />
          </>
        ) : !account ? (
          <>
            <Field
              label="Email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Button
              title={sent ? "Send a new code" : "Email me a sign-in code"}
              disabled={busy}
              onPress={() =>
                run(async () => {
                  await sendCode(email.trim());
                  setSent(true);
                  say("Check your email for the sign-in code.");
                })
              }
            />
            {sent ? (
              <>
                <Field
                  label="Email verification code"
                  value={code}
                  onChangeText={setCode}
                />
                <Button
                  title="Verify and sign in"
                  disabled={busy}
                  onPress={() =>
                    run(async () => {
                      setAccount(await verifyCode(email.trim(), code.trim()));
                      await sync();
                    })
                  }
                />
              </>
            ) : null}
          </>
        ) : (
          <Row>
            <Button
              title="Sync now"
              disabled={busy}
              onPress={() => run(sync)}
            />
            <Button
              title="Sign out"
              quiet
              disabled={busy}
              onPress={() =>
                run(async () => {
                  await signOut();
                  setAccount("");
                  say("Signed out. Your local plan stays on this device.");
                })
              }
            />
          </Row>
        )}
        {conflict ? (
          <>
            <T bold>Both versions are preserved until you choose.</T>
            <T muted>
              Another version exists in your account. Keep the phone’s version,
              or recover the cloud version. Your current phone version is backed
              up locally first.
            </T>
            <Button
              title="Use the cloud version"
              quiet
              onPress={() => run(() => resolve(true))}
            />
            <Button
              title="Use this phone’s version"
              quiet
              onPress={() => run(() => resolve(false))}
            />
          </>
        ) : null}
      </Panel>
      <Section title="Google Calendar · read-only" />
      <Panel>
        <T muted>
          Choose personal calendars to read for the next 30 days. Hats never
          writes events to Google.
        </T>
        <Button
          title="Connect Google Calendar"
          disabled={!configured || busy}
          quiet
          onPress={() =>
            run(async () => {
              await googleSignIn();
              setAccount((await currentSession())?.user.email ?? "");
              setCalendars(await googleCalendars());
            })
          }
        />
        <Button
          title="Choose calendars"
          disabled={!configured || busy}
          quiet
          onPress={() => run(async () => setCalendars(await googleCalendars()))}
        />
        {calendars.map((c) => (
          <Check
            key={c.id}
            title={c.summary}
            done={selected.includes(c.id)}
            onPress={() =>
              setSelected((s) =>
                s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id],
              )
            }
          />
        ))}
        <Button
          title="Refresh selected calendars"
          disabled={!selected.length || busy}
          onPress={() =>
            run(async () => {
              const events = await readGoogleEvents(selected);
              mutate((d) => {
                d.events = [
                  ...d.events.filter((e) => e.source !== "google"),
                  ...events,
                ];
              });
              await secretSet(
                "hats.google.calendars",
                JSON.stringify(selected),
              );
              say("Calendar refreshed. No Google events were changed.");
            })
          }
        />
        <Button
          title="Remove imported Google events"
          quiet
          onPress={() => {
            mutate((d) => {
              d.events = d.events.filter((e) => e.source !== "google");
            });
            setSelected([]);
            secretSet("hats.google.calendars", "[]");
          }}
        />
        <T size={12} muted>
          Backend Google OAuth configuration is required. If access expires,
          reconnect. Event updates are read when you refresh; they are not a
          live stream.
        </T>
      </Panel>
      <Section title="More context" />
      <Panel>
        <T bold>School breaks and seasonal plans</T>
        <T muted>
          Check the official BPS calendar, then add confirmed closures in Plan.
          Your children’s school and daycare may have different schedules.
        </T>
        <Button
          title="Official BPS calendar"
          quiet
          onPress={() =>
            Linking.openURL(
              "https://www.bostonpublicschools.org/district-calendar",
            )
          }
        />
        <Button
          title="Add a confirmed day off"
          quiet
          onPress={() => router.push("/plan")}
        />
      </Panel>
      <Panel>
        <T bold>WHOOP, financial data, and personal email</T>
        <T muted>
          These providers are not connected in this build. Hats will not invent
          recovery scores, balances, transactions, or email-derived plans. Your
          routines, saved meals, personal notes, and logged spending work
          without them.
        </T>
        <T size={12} muted>
          Google Keep and Facebook are not required dependencies. Saved links
          and chosen contacts work independently.
        </T>
      </Panel>
      <Section title="Backups and existing Hats data" />
      <Panel>
        <T muted>
          A backup contains your private notes and personal information. Keep it
          somewhere you trust. Text and plans export; photo files remain on
          their original device.
        </T>
        <Button
          title="Export my personal backup"
          quiet
          onPress={() => run(() => exportPersonal(data))}
        />
        <Button
          title="Import setup or backup"
          quiet
          onPress={() =>
            confirm(
              "Import a personal backup?",
              "Your current version will be kept as a local recovery copy before the import.",
              () =>
                run(async () => {
                  const next = await pickBackup();
                  if (next) {
                    await replace(next);
                    say("Personal data imported.");
                  }
                }),
            )
          }
        />
        <Button
          title="Recover previous local version"
          quiet
          onPress={() =>
            run(async () => {
              const AsyncStorage = (
                await import("@react-native-async-storage/async-storage")
              ).default;
              const raw = await AsyncStorage.getItem(
                "hats.personal.v2.before-import",
              );
              if (!raw)
                throw new Error("No previous import recovery copy exists.");
              const { decodeLocal } = await import("../personal/storage");
              await replace(await decodeLocal(raw));
              say("Previous local version restored.");
            })
          }
        />
        <Button
          title="Import old Home tasks only"
          quiet
          onPress={() =>
            run(async () => {
              const tasks = await legacyHomeTasks();
              let count = 0;
              mutate((d) => {
                for (const t of tasks) {
                  const source = `legacy-home:${t.id}`;
                  if (d.tasks.some((x) => x.source === source)) continue;
                  d.tasks.push(
                    makeTask(String(t.title), "home", t.date ?? today, {
                      source,
                      doneAt: t.doneAt ?? null,
                    }),
                  );
                  count++;
                }
              });
              say(
                `${count} Home tasks imported. Original data was left untouched.`,
              );
            })
          }
        />
      </Panel>
      {editor.node}
    </Page>
  );
}
