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

// Maximum retry attempts for AsyncStorage operations
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function withRetry<T>(operation: () => Promise<T>, retries = MAX_RETRIES): Promise<T | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (attempt === retries - 1) {
        // Last attempt failed - log but don't crash
        console.error('[BackgroundTask] AsyncStorage operation failed after retries:', err);
        return null;
      }
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
    }
  }
  return null;
}

TaskManager.defineTask(BACKGROUND_WALKING_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundTask] Location error:', error.message);
    return;
  }

  const payload = data as { locations?: LocationObject[] } | undefined;
  const locations = payload?.locations;
  if (!locations?.length) return;

  // Read existing data with retry
  const raw = await withRetry(() => AsyncStorage.getItem(BG_WALKING_STORAGE_KEY));
  let all: Record<string, BgPoint[]> = {};
  if (raw) {
    try {
      all = JSON.parse(raw) as Record<string, BgPoint[]>;
    } catch {
      // Corrupted data - start fresh
      all = {};
    }
  }

  // Process new locations
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

  // Merge new data with existing
  for (const dk of Object.keys(byDay)) {
    const batch = byDay[dk].sort((a, b) => a.t - b.t);
    const prev = all[dk] ?? [];
    all[dk] = dedupeAppend(prev, batch);
  }

  // Prune old days (keep last 10)
  const keys = Object.keys(all).sort();
  if (keys.length > 10) {
    const drop = keys.slice(0, keys.length - 10);
    for (const k of drop) delete all[k];
  }

  // Save with retry
  const saveResult = await withRetry(() =>
    AsyncStorage.setItem(BG_WALKING_STORAGE_KEY, JSON.stringify(all))
  );
  if (saveResult === null) {
    // AsyncStorage failed completely - data will be lost
    // This is a critical failure that should be surfaced to the user
    console.error('[BackgroundTask] CRITICAL: Failed to save GPS data. Data may be lost.');
  }
});
