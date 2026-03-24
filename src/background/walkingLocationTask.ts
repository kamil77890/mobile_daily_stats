import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { dayKey } from '../utils/dates';
import type { BgPoint } from './bgWalkingStorage';
import { BG_WALKING_STORAGE_KEY, BACKGROUND_WALKING_TASK } from './constants';

function toDayKey(ms: number): string {
  return dayKey(new Date(ms));
}

function dedupeAppend(existing: BgPoint[], next: BgPoint[]): BgPoint[] {
  const out = [...existing];
  for (const p of next) {
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev.t - p.t) < 5000 && dist2(prev, p) < 25) continue;
    out.push(p);
  }
  return out;
}

function dist2(a: BgPoint, b: BgPoint): number {
  const dx = a.lat - b.lat;
  const dy = a.lon - b.lon;
  return dx * dx + dy * dy;
}

TaskManager.defineTask(BACKGROUND_WALKING_TASK, async ({ data, error }) => {
  if (error) return;
  const payload = data as { locations?: LocationObject[] } | undefined;
  const locations = payload?.locations;
  if (!locations?.length) return;

  const raw = await AsyncStorage.getItem(BG_WALKING_STORAGE_KEY);
  let all: Record<string, BgPoint[]> = {};
  if (raw) {
    try {
      all = JSON.parse(raw) as Record<string, BgPoint[]>;
    } catch {
      all = {};
    }
  }

  const byDay: Record<string, BgPoint[]> = {};
  for (const loc of locations) {
    const t = loc.timestamp ?? Date.now();
    const dk = toDayKey(t);
    const pt: BgPoint = {
      lat: loc.coords.latitude,
      lon: loc.coords.longitude,
      alt: loc.coords.altitude ?? null,
      t,
    };
    if (!byDay[dk]) byDay[dk] = [];
    byDay[dk].push(pt);
  }

  for (const dk of Object.keys(byDay)) {
    const batch = byDay[dk].sort((a, b) => a.t - b.t);
    const prev = all[dk] ?? [];
    all[dk] = dedupeAppend(prev, batch);
  }

  const keys = Object.keys(all).sort();
  if (keys.length > 10) {
    const drop = keys.slice(0, keys.length - 10);
    for (const k of drop) delete all[k];
  }

  await AsyncStorage.setItem(BG_WALKING_STORAGE_KEY, JSON.stringify(all));
});
