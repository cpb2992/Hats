import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { applyEnergy, mergeGoogle, planWeek } from "./auto";
import {
  cachedWhoop,
  currentSession,
  readGoogleEvents,
  refreshWhoop,
} from "./cloud";
import type { PersonalData } from "./model";
import { secretGet } from "./storage";
import { usePersonal } from "./Store";
import { whoopToday } from "./whoop";

const GOOGLE_EVERY_MS = 30 * 60_000;
const WHOOP_STALE_MS = 30 * 60_000;
const clone = (d: PersonalData) =>
  JSON.parse(JSON.stringify(d)) as PersonalData;

/**
 * Runs Hats' automations when the app opens or comes back: plan the week's
 * dinners, pull fresh Google events (read-only), and lighten the day on low
 * WHOOP recovery. Every change is logged in "What Hats did" with Undo.
 */
export function Automations() {
  const a = usePersonal();
  const latest = useRef(a);
  useEffect(() => {
    latest.current = a;
  });
  const lastGoogle = useRef(0);
  const running = useRef(false);

  useEffect(() => {
    if (!a.ready || a.error) return;
    const run = async () => {
      if (running.current) return;
      running.current = true;
      try {
        const { data, today, mutate } = latest.current;
        // Only touch the plan when something would actually change.
        const change = (fn: (d: PersonalData) => unknown) => {
          const trial = clone(latest.current.data);
          if (fn(trial)) mutate((d) => void fn(d));
        };
        change((d) => planWeek(d, today));
        const session = await currentSession().catch(() => null);
        if (!session) return;
        // WHOOP: use a fresh read when the cache is old.
        try {
          let summary = await cachedWhoop();
          if (
            summary?.connected &&
            (!summary.fetchedAt ||
              Date.now() - new Date(summary.fetchedAt).getTime() >
                WHOOP_STALE_MS)
          )
            summary = await refreshWhoop();
          const t = whoopToday(summary, today);
          if (t?.recovery != null)
            change((d) => applyEnergy(d, today, t.recovery));
        } catch {}
        // Google Calendar: read the calendars you picked, at most every 30 min.
        if (Date.now() - lastGoogle.current > GOOGLE_EVERY_MS) {
          const ids = JSON.parse(
            (await secretGet("hats.google.calendars")) || "[]",
          ) as string[];
          if (ids.length && data.preferences.onboarded) {
            try {
              const events = await readGoogleEvents(ids);
              lastGoogle.current = Date.now();
              const now = latest.current;
              const same =
                JSON.stringify(
                  now.data.events.filter((e) => e.source === "google"),
                ) === JSON.stringify(events);
              if (!same)
                now.mutate((d) => void mergeGoogle(d, now.today, events));
            } catch {}
          }
        }
      } finally {
        running.current = false;
      }
    };
    run();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") setTimeout(run, 1500);
    });
    return () => sub.remove();
  }, [a.ready, a.error, a.today]);
  return null;
}
