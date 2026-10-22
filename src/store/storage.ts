import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeData } from '../engine/normalize';
import type { AppData } from '../engine/types';

export const DATA_KEY = 'hats.data.v1';

export async function loadData(): Promise<AppData | null> {
  const raw = await AsyncStorage.getItem(DATA_KEY);
  return raw ? normalizeData(JSON.parse(raw)) : null;
}

export async function saveData(d: AppData): Promise<void> {
  await AsyncStorage.setItem(DATA_KEY, JSON.stringify(d));
}

/** Lets a widget tell an open app that it changed saved data (e.g. Done or +1 from the home screen). */
type Listener = () => void;
const listeners = new Set<Listener>();

export function onExternalChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function notifyExternalChange() {
  listeners.forEach(fn => { try { fn(); } catch { /* a listener failing shouldn't stop the others */ } });
}
