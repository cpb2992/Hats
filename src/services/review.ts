/** Asks for a rating with Google's in-app review sheet, when the engine says it's a good time. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { Platform } from 'react-native';
import { shouldAskForReview } from '../engine/review';
import type { AppData } from '../engine/types';

const KEY = 'hats.reviewAsked';

export async function maybeAskForReview(data: AppData, today: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const last = await AsyncStorage.getItem(KEY);
    if (!shouldAskForReview(data, today, last)) return;
    if (!(await StoreReview.isAvailableAsync())) return;
    await AsyncStorage.setItem(KEY, today);
    await StoreReview.requestReview();
  } catch {
    // A rating prompt is never worth an error.
  }
}
