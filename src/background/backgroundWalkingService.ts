import * as Location from 'expo-location';
import { ActivityType } from 'expo-location';
import { Platform } from 'react-native';

import { refreshWalkingStatsNotificationFromStore } from '../notifications/walkingStatsNotification';
import { useAppStore } from '../store/useAppStore';
import type { Coord } from '../store/types';
import { dayKey } from '../utils/dates';
import { loadAllPoints, pruneOldDays } from './bgWalkingStorage';
import { BACKGROUND_WALKING_TASK } from './constants';

let manualRecording = false;
/** Track which period (day/night) the service was last started in, to detect when to restart */
let lastStartedPeriod: 'day' | 'night' | null = null;

function recentDayKeys(n: number): Set<string> {
  const s = new Set<string>();
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    s.add(dayKey(d));
  }
  return s;
}

export function getCurrentPeriod(): 'day' | 'night' {
  const hour = new Date().getHours();
  return hour >= 23 || hour < 6 ? 'night' : 'day';
}

function getLocationOptions(): Pick<Location.LocationTaskOptions, 'timeInterval' | 'distanceInterval' | 'accuracy'> {
  const period = getCurrentPeriod();
  if (period === 'night') {
    return {
      accuracy: Location.Accuracy.Low,
      distanceInterval: 100,
      timeInterval: 10 * 60 * 1000, // 10 minutes at night (23-6)
    };
  }
  return {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 25,
    timeInterval: 60 * 1000, // 1 minute during day (6-23)
  };
}

/** Pause passive GPS while the user runs an explicit tracked workout. */
export function setManualRecordingActive(active: boolean): void {
  manualRecording = active;
  if (active) {
    Location.stopLocationUpdatesAsync(BACKGROUND_WALKING_TASK).catch(() => {});
  } else {
    void ensureBackgroundWalkingStarted();
  }
}

export async function syncBackgroundWalkingSessionsFromStorage(): Promise<void> {
  await pruneOldDays(recentDayKeys(14));
  const all = await loadAllPoints();
  const upsert = useAppStore.getState().upsertBackgroundWalkingSession;
  for (const dk of Object.keys(all)) {
    const pts = all[dk];
    if (!pts?.length) continue;
    const sorted = [...pts].sort((a, b) => a.t - b.t);
    const coords: Coord[] = sorted.map((p) => ({
      latitude: p.lat,
      longitude: p.lon,
      altitude: p.alt,
      timestamp: p.t,
    }));
    const startedAt = sorted[0].t;
    const endedAt = sorted[sorted.length - 1].t;
    upsert(dk, coords, startedAt, endedAt);
  }
  void refreshWalkingStatsNotificationFromStore();
}

/**
 * Restarts background walking if the period (day/night) changed since last start.
 * Call this periodically (e.g. every 5 minutes) from App.tsx.
 */
export async function restartBackgroundWalkingIfPeriodChanged(): Promise<void> {
  if (manualRecording) return;
  const enabled = useAppStore.getState().backgroundWalkingEnabled;
  if (!enabled) return;

  const currentPeriod = getCurrentPeriod();
  if (lastStartedPeriod === currentPeriod) return; // no change needed

  const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_WALKING_TASK).catch(() => false);
  if (running) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_WALKING_TASK).catch(() => {});
  }
  lastStartedPeriod = null; // reset so ensureBackgroundWalkingStarted sets it fresh
  await ensureBackgroundWalkingStarted();
}

export async function ensureBackgroundWalkingStarted(): Promise<void> {
  if (manualRecording) return;
  const enabled = useAppStore.getState().backgroundWalkingEnabled;
  if (!enabled) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_WALKING_TASK).catch(() => {});
    lastStartedPeriod = null;
    return;
  }

  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return;

  const bgPerm = await Location.getBackgroundPermissionsAsync();
  if (!bgPerm.granted) {
    await Location.requestBackgroundPermissionsAsync();
  }

  const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_WALKING_TASK);
  const currentPeriod = getCurrentPeriod();

  // If already running and in the same period, no need to restart
  if (running && lastStartedPeriod === currentPeriod) return;

  // Stop if running to apply new settings
  if (running) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_WALKING_TASK).catch(() => {});
  }

  const { accuracy, distanceInterval, timeInterval } = getLocationOptions();

  const options: Location.LocationTaskOptions = {
    accuracy,
    distanceInterval,
    timeInterval,
    activityType: ActivityType.Fitness,
    pausesUpdatesAutomatically: true,
    showsBackgroundLocationIndicator: true,
  };

  if (Platform.OS === 'android') {
    const periodLabel = currentPeriod === 'night' ? '(tryb nocny)' : '';
    options.foregroundService = {
      notificationTitle: `Walking · GPS on ${periodLabel}`,
      notificationBody: 'Otwórz aplikację, by zobaczyć statystyki',
      notificationColor: '#c62828',
    };
  }

  try {
    await Location.startLocationUpdatesAsync(BACKGROUND_WALKING_TASK, options);
    lastStartedPeriod = currentPeriod;
  } catch {
    /* User denied background, or location services off */
  }
}