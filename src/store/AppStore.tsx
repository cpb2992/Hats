import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { nowMinutes, todayISO } from '../engine/dates';
import type { Recent } from '../engine/assistant';
import { setHatPrefs } from '../engine/hats';
import { normalizeData } from '../engine/normalize';
import { materializeChores } from '../engine/rhythm';
import { freshData, makeDemo } from '../engine/seed';
import type { AppData } from '../engine/types';
import { clone } from '../engine/util';
import { syncReminders } from '../services/notifications';
import { updateWidgets } from '../widgets/update';
import { DATA_KEY, loadData, onExternalChange } from './storage';

export interface ToastMsg {
  id: number;
  text: string;
  kind: 'win' | 'info';
  action?: { label: string; onPress: () => void };
}

interface Store {
  ready: boolean;
  today: string;
  nowMin: number;
  demo: boolean;
  data: AppData;
  /** Apply a change. In sample-data mode changes stay in memory and vanish when you leave it. */
  mutate: (fn: (d: AppData) => void) => void;
  startDemo: () => void;
  endDemo: () => void;
  eraseAll: () => void;
  toast: ToastMsg | null;
  /** What the last Say anything did, so "move that" knows what "that" is. */
  recent: Recent[];
  setRecent: (r: Recent[]) => void;
  showToast: (text: string, opts?: { kind?: ToastMsg['kind']; action?: ToastMsg['action'] }) => void;
  hideToast: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [real, setReal] = useState<AppData>(freshData);
  const [demoData, setDemoData] = useState<AppData | null>(null);
  const [today, setToday] = useState(todayISO());
  const [nowMin, setNowMin] = useState(nowMinutes());
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const widgetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastId = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DATA_KEY);
        if (raw) setReal(normalizeData(JSON.parse(raw)));
      } catch {
        // Unreadable storage starts fresh rather than blocking launch.
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Picks up changes a home-screen widget saved (Done or +1 tapped on the widget).
  const reload = useCallback(async () => {
    try { const d = await loadData(); if (d) setReal(d); } catch { /* keep what's in memory */ }
  }, []);
  useEffect(() => onExternalChange(() => { reload(); }), [reload]);

  // Keep "today" and the clock current, including after the phone wakes up.
  useEffect(() => {
    const tick = () => { setToday(todayISO()); setNowMin(nowMinutes()); };
    const iv = setInterval(tick, 30000);
    const sub = AppState.addEventListener('change', s => { if (s === 'active') { tick(); reload(); } });
    return () => { clearInterval(iv); sub.remove(); };
  }, [reload]);

  // The weekly rhythm (whose laundry day it is, baths) becomes today's Home tasks.
  useEffect(() => {
    if (!ready) return;
    Promise.resolve().then(() => setReal(prev => {
      const next = clone(prev);
      if (!materializeChores(next, today, new Date().toISOString())) return prev;
      AsyncStorage.setItem(DATA_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    }));
  }, [ready, today, real.chores]);

  // Home-screen widgets follow your real data, and refresh as the school day moves between blocks.
  const tenMin = Math.floor(nowMin / 10);
  useEffect(() => {
    if (!ready) return;
    if (widgetTimer.current) clearTimeout(widgetTimer.current);
    widgetTimer.current = setTimeout(() => { updateWidgets(real).catch(() => {}); }, 800);
  }, [real, ready, today, tenMin]);

  // Reminders always follow your real data, never sample data.
  useEffect(() => {
    if (!ready) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => { syncReminders(real).catch(() => {}); }, 1500);
  }, [real, ready, today]);

  const persist = useCallback((next: AppData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { AsyncStorage.setItem(DATA_KEY, JSON.stringify(next)).catch(() => {}); }, 250);
  }, []);

  const mutate = useCallback((fn: (d: AppData) => void) => {
    if (demoData) {
      setDemoData(prev => { if (!prev) return prev; const next = clone(prev); fn(next); return next; });
      return;
    }
    setReal(prev => { const next = clone(prev); fn(next); persist(next); return next; });
  }, [demoData, persist]);

  const startDemo = useCallback(() => setDemoData(makeDemo(todayISO(), real.settings)), [real.settings]);
  const endDemo = useCallback(() => setDemoData(null), []);

  const eraseAll = useCallback(() => {
    const next = freshData();
    setReal(next);
    setDemoData(null);
    AsyncStorage.removeItem(DATA_KEY).catch(() => {});
  }, []);

  const showToast = useCallback((text: string, opts?: { kind?: ToastMsg['kind']; action?: ToastMsg['action'] }) => {
    toastId.current += 1;
    setToast({ id: toastId.current, text, kind: opts?.kind ?? 'info', action: opts?.action });
  }, []);
  const hideToast = useCallback(() => setToast(null), []);

  const data = demoData ?? real;
  // Hat names and the hats worn are read all over the app; keep the shared registry in step.
  setHatPrefs(data.hats);
  const value = useMemo<Store>(() => ({
    ready, today, nowMin, demo: !!demoData, data, mutate, startDemo, endDemo, eraseAll, toast, showToast, hideToast, recent, setRecent,
  }), [ready, today, nowMin, demoData, data, mutate, startDemo, endDemo, eraseAll, toast, showToast, hideToast, recent]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useApp(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useApp must be used inside AppStoreProvider');
  return s;
}
