import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";
import { addDays } from "../engine/dates";
import {
  fetchHousehold,
  loadShareState,
  pullItems,
  pushItems,
  saveShareState,
} from "./household";
import { changesToSend, markSent, mergeRemote, newest } from "./share";
import { usePersonal } from "./Store";

/** How often an open Hats checks for the family's changes. */
const EVERY_MS = 60 * 1000;
/** Pull a little before the newest change seen, in case a slow save landed out of order. */
const OVERLAP_MS = 2 * 60 * 1000;

/**
 * Keeps the household's shared things in step: when Hats opens or comes back, every minute
 * while it's open, and a few seconds after you change something. Renders nothing.
 */
export function FamilySync() {
  const { data, ready, absorb, current, today, say } = usePersonal();
  const busy = useRef(false);
  const again = useRef(false);
  const lastMembers = useRef(0);
  const homeId = data.household?.id;

  /** One round: who's in the family, then their changes in, then yours out. */
  const once = useCallback(async () => {
    const home = current().household;
    if (!home) return;
    try {
      // Who's in the family (now and then; it rarely changes).
      if (Date.now() - lastMembers.current > 10 * EVERY_MS) {
        lastMembers.current = Date.now();
        const fresh = await fetchHousehold();
        if (!fresh) {
          // Removed, or the household is gone: keep everything, stop sharing.
          absorb((d) => {
            if (!d.household) return false;
            delete d.household;
            return true;
          });
          say("You’re no longer sharing with a family. Everything stays on this phone.");
          return;
        }
        const was = current().household;
        if (JSON.stringify(was) !== JSON.stringify(fresh)) {
          const joined = fresh.members.filter((m) => !was?.members.some((x) => x.id === m.id));
          absorb((d) => {
            d.household = fresh;
            return true;
          });
          if (was && joined.length)
            say(`${joined.map((m) => m.name).join(" and ")} joined your family on Hats.`);
        }
      }
      const me = current().household;
      if (!me) return;
      const state = await loadShareState(me.id);
      const since = new Date(Math.max(0, Date.parse(state.lastPull) - OVERLAP_MS)).toISOString();
      const rows = await pullItems(me.id, since);
      if (rows.length) {
        absorb((d) => mergeRemote(d, rows, state, me.me, me.members) > 0);
        state.lastPull = newest(rows, state.lastPull);
      }
      const out = changesToSend(current(), state, today);
      if (out.length) {
        await pushItems(me.id, out);
        markSent(state, out);
      }
      await saveShareState(state);
    } catch {
      // Offline or signed out: try again next time. Nothing local is lost.
    }
  }, [absorb, current, today, say]);

  /** Runs a round, or queues one more if a round is already going. */
  const run = useCallback(async () => {
    if (busy.current) {
      again.current = true;
      return;
    }
    busy.current = true;
    try {
      do {
        again.current = false;
        await once();
      } while (again.current);
    } finally {
      busy.current = false;
    }
  }, [once]);

  // When sharing starts, and every minute while Hats is open and in front.
  useEffect(() => {
    if (!ready || !homeId) return;
    lastMembers.current = 0;
    run();
    const iv = setInterval(() => {
      if (AppState.currentState === "active") run();
    }, EVERY_MS);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        lastMembers.current = 0;
        run();
      }
    });
    return () => {
      clearInterval(iv);
      sub.remove();
    };
  }, [ready, homeId, run]);

  // A few seconds after a change here.
  useEffect(() => {
    if (!ready || !homeId) return;
    const timer = setTimeout(run, 3000);
    return () => clearTimeout(timer);
  }, [data, ready, homeId, run]);

  return null;
}

/** For screens: "Added by Jess", or nothing for your own things. */
export const addedBy = (x: { sharedBy?: string }) => (x.sharedBy ? `Added by ${x.sharedBy}` : "");

/** The shared window used for a first sync, for the settings explainer. */
export const firstSyncFrom = (today: string) => addDays(today, -3);
