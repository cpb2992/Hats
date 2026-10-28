import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, Platform } from "react-native";
import { nowMinutes, todayISO } from "../engine/dates";
import { currentSession, readRemote, writeRemote, type Remote } from "./cloud";
import { finishStep, materialize, reschedule } from "./engine";
import { freshPersonal, type PersonalData } from "./model";
import { syncPersonalReminders } from "./reminders";
import { loadPersonal, preserveBeforeImport, savePersonal } from "./storage";
import { updatePersonalWidgets } from "./widgets";
import { configureFocus } from "./focus";

interface SyncMeta {
  owner: string | null;
  revision: number;
  dirty: boolean;
}
interface State {
  data: PersonalData;
  ready: boolean;
  error: string;
  message: string;
  today: string;
  nowMin: number;
  nowMs: number;
  syncStatus: string;
  conflict: Remote | null;
  mutate: (fn: (d: PersonalData) => void) => void;
  undo: () => void;
  say: (text: string) => void;
  sync: () => Promise<void>;
  resolve: (remote: boolean) => Promise<void>;
  replace: (data: PersonalData) => Promise<void>;
  reload: () => Promise<void>;
}
const Context = createContext<State | null>(null);
const clone = (d: PersonalData) =>
  JSON.parse(JSON.stringify(d)) as PersonalData;
const META = "hats.personal.sync-meta";
export function PersonalProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(freshPersonal);
  const ref = useRef(data);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [clock, setClock] = useState(new Date());
  const [syncStatus, setSyncStatus] = useState("On this device");
  const [conflict, setConflict] = useState<Remote | null>(null);
  const meta = useRef<SyncMeta>({ owner: null, revision: 0, dirty: false });
  const undoRef = useRef<PersonalData | null>(null);
  const syncing = useRef(false);
  const generation = useRef(0);
  const conflictOwner = useRef<string | null>(null);
  const handledNotifications = useRef(new Set<string>());
  const say = useCallback((text: string) => setMessage(text), []);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(timer);
  }, [message]);
  const persist = useCallback(async (next: PersonalData) => {
    await savePersonal(next);
    await AsyncStorage.setItem(META, JSON.stringify(meta.current));
  }, []);
  const apply = useCallback((next: PersonalData) => {
    ref.current = next;
    setData(next);
  }, []);
  const reload = useCallback(async () => {
    try {
      const next = await loadPersonal();
      const raw = await AsyncStorage.getItem(META);
      if (raw) meta.current = JSON.parse(raw);
      apply(next);
      setError("");
    } catch {
      setError(
        "Your saved plan could not be opened. It has not been overwritten. Restore a backup or try again.",
      );
    }
  }, [apply]);
  useEffect(() => {
    Promise.resolve()
      .then(reload)
      .finally(() => setReady(true));
  }, [reload]);
  const mutate = useCallback(
    (fn: (d: PersonalData) => void) => {
      if (error) return;
      generation.current++;
      undoRef.current = clone(ref.current);
      const next = clone(ref.current);
      fn(next);
      next.moments ??= [];
      for (const task of next.tasks) {
        if (
          task.doneAt &&
          !ref.current.tasks.find((t) => t.id === task.id)?.doneAt &&
          !next.moments.some((m) => m.source === task.id)
        )
          next.moments.push({
            id: `moment:${task.id}`,
            hat: task.hat,
            title: task.title,
            date: todayISO(),
            source: task.id,
          });
      }
      next.updatedAt = new Date().toISOString();
      meta.current.dirty = true;
      apply(next);
      persist(next).catch(() =>
        setError(
          "The last change could not be saved. Keep Hats open and export a backup.",
        ),
      );
    },
    [apply, error, persist],
  );
  const undo = useCallback(() => {
    const previous = undoRef.current;
    if (!previous) {
      say("Nothing to undo yet.");
      return;
    }
    undoRef.current = clone(ref.current);
    generation.current++;
    previous.updatedAt = new Date().toISOString();
    meta.current.dirty = true;
    apply(previous);
    persist(previous).catch(() => say("Could not save Undo."));
    say("Last change undone.");
  }, [apply, persist, say]);
  const replace = useCallback(
    async (next: PersonalData) => {
      await preserveBeforeImport(ref.current);
      generation.current++;
      next.updatedAt = new Date().toISOString();
      meta.current.dirty = true;
      await persist(next);
      apply(next);
      setError("");
    },
    [apply, persist],
  );
  const sync = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    try {
      const session = await currentSession();
      if (!session) {
        setSyncStatus("On this device · connect to sync");
        return;
      }
      if (meta.current.owner && meta.current.owner !== session.user.id)
        throw new Error(
          "This local plan belongs to a different account. Sign back in to that account before syncing.",
        );
      setSyncStatus("Syncing…");
      const beforeRead = generation.current;
      const remote = await readRemote();
      if (remote && remote.revision !== meta.current.revision) {
        if (meta.current.dirty || meta.current.owner == null) {
          setConflict(remote);
          conflictOwner.current = session.user.id;
          setSyncStatus("Two versions · choose which to keep");
          return;
        }
        await preserveBeforeImport(ref.current);
        if (generation.current !== beforeRead) {
          setConflict(remote);
          conflictOwner.current = session.user.id;
          setSyncStatus(
            "Local changes made while syncing · choose which version to keep",
          );
          return;
        }
        apply(remote.payload);
        meta.current = {
          owner: session.user.id,
          revision: remote.revision,
          dirty: false,
        };
        await persist(remote.payload);
      } else if (meta.current.dirty || !remote) {
        const snapshot = clone(ref.current);
        const savedGeneration = generation.current;
        const revision = await writeRemote(snapshot, remote?.revision ?? 0);
        meta.current = {
          owner: session.user.id,
          revision,
          dirty: generation.current !== savedGeneration,
        };
        await AsyncStorage.setItem(META, JSON.stringify(meta.current));
      }
      setSyncStatus(
        meta.current.dirty
          ? "Changes waiting to sync"
          : `Synced · ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
      );
    } catch (e) {
      const text = e instanceof Error ? e.message : "Sync unavailable";
      setSyncStatus(
        text.includes("SYNC_CONFLICT")
          ? "Another device changed your plan. Sync again to compare."
          : `${text} Local changes are kept.`,
      );
    } finally {
      syncing.current = false;
    }
  }, [apply, persist]);
  const resolve = useCallback(
    async (useRemote: boolean) => {
      if (!conflict) return;
      try {
        const session = await currentSession();
        if (!session) throw new Error("Sign in first.");
        if (session.user.id !== conflictOwner.current)
          throw new Error(
            "Sign back in to the account that owns this cloud version.",
          );
        const beforeBackup = generation.current;
        await preserveBeforeImport(ref.current);
        if (generation.current !== beforeBackup)
          throw new Error(
            "Your plan changed during comparison. Review both versions again before choosing.",
          );
        if (useRemote) {
          apply(conflict.payload);
          meta.current = {
            owner: session.user.id,
            revision: conflict.revision,
            dirty: false,
          };
          await persist(conflict.payload);
        } else {
          const snapshot = clone(ref.current);
          const savedGeneration = generation.current;
          const revision = await writeRemote(snapshot, conflict.revision);
          meta.current = {
            owner: session.user.id,
            revision,
            dirty: generation.current !== savedGeneration,
          };
          await persist(ref.current);
        }
        setConflict(null);
        setSyncStatus("Synced");
        say("Your previous local version is kept as a recovery copy.");
      } catch (e) {
        say(e instanceof Error ? e.message : "Could not resolve sync.");
      }
    },
    [apply, conflict, persist, say],
  );
  useEffect(() => {
    if (!ready) return;
    const tick = () => {
      setClock(new Date());
    };
    const iv = setInterval(tick, 30000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        tick();
        reload().then(sync);
      }
    });
    return () => {
      clearInterval(iv);
      sub.remove();
    };
  }, [ready, reload, sync]);
  const today = todayISO(clock);
  const nowMin = nowMinutes(clock);
  useEffect(() => {
    if (ready)
      configureFocus(
        data.preferences.focusConsent ? data.protectedUntil : null,
        data.preferences.distractingPackages ?? [],
      ).catch(() => say("Distraction protection could not be updated."));
  }, [
    ready,
    data.protectedUntil,
    data.preferences.focusConsent,
    data.preferences.distractingPackages,
    say,
  ]);
  useEffect(() => {
    if (ready && !error && materialize(clone(ref.current), today))
      mutate((d) => {
        materialize(d, today);
      });
  }, [today, ready, error, mutate]);
  useEffect(() => {
    if (!ready || error) return;
    const timer = setTimeout(() => {
      syncPersonalReminders(data).catch(() =>
        say(
          "Phone reminders could not be refreshed. Check notification settings.",
        ),
      );
      updatePersonalWidgets(data).catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [data, ready, today, error, say]);
  useEffect(() => {
    if (!ready || error) return;
    const timer = setTimeout(() => {
      sync();
    }, 2500);
    return () => clearTimeout(timer);
  }, [data, ready, error, sync]);
  useEffect(() => {
    if (Platform.OS === "web" || !ready) return;
    const handle = (response: Notifications.NotificationResponse) => {
      const responseKey = `${response.notification.request.identifier}:${response.notification.date}:${response.actionIdentifier}`;
      if (handledNotifications.current.has(responseKey)) return;
      handledNotifications.current.add(responseKey);
      const taskId = String(
        response.notification.request.content.data?.taskId ?? "",
      );
      if (!taskId) return;
      if (response.actionIdentifier === "PERSONAL_DONE")
        mutate((d) => {
          const t = d.tasks.find((t) => t.id === taskId);
          if (t) finishStep(t);
        });
      else if (response.actionIdentifier === "PERSONAL_LATER")
        mutate((d) => {
          reschedule(d, taskId, todayISO(), nowMinutes());
        });
      Notifications.clearLastNotificationResponse();
    };
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    const previous = Notifications.getLastNotificationResponse();
    if (previous) Promise.resolve().then(() => handle(previous));
    return () => sub.remove();
  }, [mutate, ready]);
  return (
    <Context.Provider
      value={{
        data,
        ready,
        error,
        message,
        today,
        nowMin,
        nowMs: clock.getTime(),
        syncStatus,
        conflict,
        mutate,
        undo,
        say,
        sync,
        resolve,
        replace,
        reload,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePersonal() {
  const value = useContext(Context);
  if (!value) throw new Error("Personal provider is missing");
  return value;
}
