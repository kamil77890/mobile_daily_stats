import AsyncStorage from '@react-native-async-storage/async-storage';

import { BG_WALKING_STORAGE_KEY } from './constants';

export type BgPoint = {
  lat: number;
  lon: number;
  alt: number | null;
  t: number;
};

export type StoreShape = Record<string, BgPoint[]>;

export async function loadAllPoints(): Promise<StoreShape> {
  const raw = await AsyncStorage.getItem(BG_WALKING_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as StoreShape;
  } catch {
    return {};
  }
}

export async function saveAllPoints(data: StoreShape): Promise<void> {
  await AsyncStorage.setItem(BG_WALKING_STORAGE_KEY, JSON.stringify(data));
}

export async function clearDay(dk: string): Promise<void> {
  const all = await loadAllPoints();
  delete all[dk];
  await saveAllPoints(all);
}

export async function pruneOldDays(keepDayKeys: Set<string>): Promise<void> {
  const all = await loadAllPoints();
  let changed = false;
  for (const k of Object.keys(all)) {
    if (!keepDayKeys.has(k)) {
      delete all[k];
      changed = true;
    }
  }
  if (changed) await saveAllPoints(all);
}
