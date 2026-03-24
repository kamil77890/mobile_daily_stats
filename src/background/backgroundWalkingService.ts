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

function recentDayKeys(n: number): Set<string> {
  const s = new Set<string>();
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    s.add(dayKey(d));
  }
  return s;
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

export async function ensureBackgroundWalkingStarted(): Promise<void> {
  if (manualRecording) return;
  const enabled = useAppStore.getState().backgroundWalkingEnabled;
  if (!enabled) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_WALKING_TASK).catch(() => {});
    return;
  }

  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return;

  const bgPerm = await Location.getBackgroundPermissionsAsync();
  if (!bgPerm.granted) {
    await Location.requestBackgroundPermissionsAsync();
  }

  const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_WALKING_TASK);
  if (running) return;

  const options: Location.LocationTaskOptions = {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 25,
    timeInterval: 30000,
    activityType: ActivityType.Fitness,
    pausesUpdatesAutomatically: true,
    showsBackgroundLocationIndicator: true,
  };

  if (Platform.OS === 'android') {
    options.foregroundService = {
      notificationTitle: 'Walking · GPS on',
      notificationBody: 'Open the app for live steps, km & kcal in the stats notification',
      notificationColor: '#c62828',
    };
  }

  try {
    await Location.startLocationUpdatesAsync(BACKGROUND_WALKING_TASK, options);
  } catch {
    /* User denied background, or location services off */
  }
}
