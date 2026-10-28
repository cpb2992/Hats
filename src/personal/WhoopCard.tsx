import { useCallback, useEffect, useState } from "react";
import {
  cachedWhoop,
  connectWhoop,
  currentSession,
  disconnectWhoop,
  refreshWhoop,
} from "./cloud";
import { Hat } from "./Hat";
import { usePersonal } from "./Store";
import { Button, Panel, Row, T } from "./ui";
import { whoopLine, whoopToday, type WhoopSummary } from "./whoop";

const STALE_MS = 30 * 60_000;

function useWhoop() {
  const [summary, setSummary] = useState<WhoopSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const refresh = useCallback(async () => {
    setBusy(true);
    setProblem("");
    try {
      setSummary(await refreshWhoop());
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "WHOOP didn't answer.");
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    let live = true;
    (async () => {
      const cached = await cachedWhoop();
      if (live) setSummary(cached);
      const stale =
        !cached?.fetchedAt ||
        Date.now() - new Date(cached.fetchedAt).getTime() > STALE_MS;
      if (
        cached?.connected &&
        stale &&
        (await currentSession().catch(() => null))
      )
        refreshWhoop()
          .then((s) => live && setSummary(s))
          .catch(() => {});
    })();
    return () => {
      live = false;
    };
  }, []);
  return { summary, setSummary, refresh, busy, setBusy, problem, setProblem };
}

/** Today's WHOOP card. Shows nothing unless WHOOP is connected. */
export function WhoopToday() {
  const { data, mutate, today, say } = usePersonal();
  const { summary } = useWhoop();
  const t = whoopToday(summary, today);
  if (!t) return null;
  const lighter = data.lowEnergyDays.includes(today);
  return (
    <Panel tint="#D3F0E8">
      <Row>
        <Hat id="pompom" size={40} tilt={-6} />
        <T size={12} bold>
          WHOOP · TODAY
        </T>
      </Row>
      <T size={20} bold>
        {whoopLine(t)}
      </T>
      {t.hrv != null || t.restingHr != null ? (
        <T muted size={13}>
          {[
            t.hrv != null ? `HRV ${t.hrv} ms` : "",
            t.restingHr != null ? `resting HR ${t.restingHr}` : "",
            t.yesterdayStrain != null
              ? `yesterday's strain ${t.yesterdayStrain}`
              : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </T>
      ) : null}
      {t.suggestLighter && !lighter ? (
        <>
          <T muted>
            Your body is asking for an easier day. Want Hats to keep the
            essentials and trim the optional stuff?
          </T>
          <Button
            title="Keep today lighter"
            hat="nightcap"
            onPress={() => {
              mutate((d) => {
                if (!d.lowEnergyDays.includes(today))
                  d.lowEnergyDays.push(today);
              });
              say("Lighter day set. Essentials stay; extras can wait.");
            }}
          />
        </>
      ) : t.suggestLighter && lighter ? (
        <T muted>Today is set to lighter. Essentials only.</T>
      ) : null}
    </Panel>
  );
}

/** Settings panel: connect, refresh, or disconnect WHOOP. */
export function WhoopSettings({ signedIn }: { signedIn: boolean }) {
  const { say } = usePersonal();
  const { summary, setSummary, refresh, busy, setBusy, problem, setProblem } =
    useWhoop();
  const connected = !!summary?.connected;
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setProblem("");
    try {
      await fn();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel tint="#D3F0E8">
      <Row>
        <Hat id="pompom" size={40} tilt={-6} />
        <T bold>{connected ? "WHOOP connected" : "WHOOP"}</T>
      </Row>
      <T muted>
        {connected
          ? "Hats reads your recovery, sleep, and strain (read-only). The numbers stay on this phone; your WHOOP sign-in stays on your private server."
          : "Connect to see recovery and sleep on Today, and get a gentle offer to lighten low-recovery days. Read-only."}
      </T>
      {summary?.fetchedAt ? (
        <T size={12} muted>
          Updated{" "}
          {new Date(summary.fetchedAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
          {summary.unavailable?.length
            ? ` · not available right now: ${summary.unavailable.join(", ")}`
            : ""}
        </T>
      ) : null}
      {problem ? <T size={13}>{problem}</T> : null}
      {!signedIn ? (
        <T size={13} muted>
          Sign in to Hats sync above first.
        </T>
      ) : connected ? (
        <Row>
          <Button title="Refresh now" small disabled={busy} onPress={refresh} />
          <Button
            title="Disconnect WHOOP"
            small
            quiet
            disabled={busy}
            onPress={() =>
              run(async () => {
                await disconnectWhoop();
                setSummary(null);
                say(
                  "WHOOP disconnected. Its data was removed from this phone.",
                );
              })
            }
          />
        </Row>
      ) : (
        <Button
          title="Connect WHOOP"
          hat="pompom"
          disabled={busy}
          onPress={() =>
            run(async () => {
              setSummary(await connectWhoop());
              say("WHOOP connected.");
            })
          }
        />
      )}
    </Panel>
  );
}
