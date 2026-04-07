import { useEffect, useRef, useState } from 'react';
import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

import { useAppStore } from '../store/useAppStore';
import { dayKey } from '../utils/dates';
import { pathLengthM } from '../utils/geo';
import type { Coord } from '../store/types';

export type ActivityStatus = 'walking' | 'sitting' | 'vehicle';

/** How many milliseconds of recent coords to look at */
const LOOK_BACK_MS = 90_000; // 90 seconds
/** Minimum distance in that window to count as walking */
const WALK_DIST_THRESHOLD_M = 1;
/** Speed threshold for vehicle detection (20 km/h in m/s) */
const VEHICLE_SPEED_MPS = 20 / 3.6;
/** Steps per minute threshold for walking detection */
const WALKING_STEPS_PER_MIN = 15;

function checkStatus(allCoords: Coord[], recentSteps: number): ActivityStatus {
  const now = Date.now();
  const recent = allCoords
    .filter((c) => c.timestamp != null && now - c.timestamp! < LOOK_BACK_MS)
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

  // If we have recent step data, use it for instant walking detection
  if (recentSteps > 0) {
    // Calculate steps per minute
    const stepsPerMin = recentSteps / (LOOK_BACK_MS / 60000);
    if (stepsPerMin >= WALKING_STEPS_PER_MIN) {
      // Check if speed indicates vehicle
      if (recent.length >= 2) {
        const dist = pathLengthM(recent);
        const timeDiff = (recent[recent.length - 1].timestamp! - recent[0].timestamp!) / 1000;
        if (timeDiff > 0) {
          const speedMps = dist / timeDiff;
          if (speedMps >= VEHICLE_SPEED_MPS) return 'vehicle';
        }
      }
      return 'walking';
    }
  }

  // Fallback to GPS-based detection
  if (recent.length < 2) return 'sitting';

  const dist = pathLengthM(recent);
  const timeDiff = (recent[recent.length - 1].timestamp! - recent[0].timestamp!) / 1000;

  if (timeDiff > 0) {
    const speedMps = dist / timeDiff;
    if (speedMps >= VEHICLE_SPEED_MPS) return 'vehicle';
  }

  return dist >= WALK_DIST_THRESHOLD_M ? 'walking' : 'sitting';
}

/**
 * Returns the user's current activity status ('walking' | 'sitting' | 'vehicle').
 * Updates in REAL-TIME using pedometer for instant walking detection and GPS for vehicle/sitting.
 */
export function useActivityStatus(): ActivityStatus {
  const sessions = useAppStore((s) => s.sessions);
  const [status, setStatus] = useState<ActivityStatus>('sitting');
  const [recentSteps, setRecentSteps] = useState(0);

  // Keep a ref so the timer always reads the freshest sessions
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  // Real-time step tracking using pedometer
  useEffect(() => {
    let watchSub: { remove: () => void } | null = null;
    let resetInterval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    let stepCount = 0;
    let lastStepTime = Date.now();

    const resetSteps = () => {
      const now = Date.now();
      // Reset step count if it's been more than LOOK_BACK_MS since last step
      if (now - lastStepTime > LOOK_BACK_MS) {
        stepCount = 0;
      }
      lastStepTime = now;
    };

    const setupPedometer = async () => {
      try {
        const avail = await Pedometer.isAvailableAsync();
        if (!avail || cancelled) return;

        const perm = await Pedometer.requestPermissionsAsync();
        if (!perm.granted || cancelled) return;

        // Watch for step updates in real-time
        watchSub = Pedometer.watchStepCount((result) => {
          if (!cancelled) {
            const now = Date.now();
            // Track steps in the recent window
            if (Platform.OS === 'android') {
              // Android gives cumulative steps, so we need to calculate recent steps
              stepCount = Math.round(result.steps);
            } else {
              // iOS gives incremental steps
              stepCount += Math.round(result.steps);
            }
            lastStepTime = now;
            setRecentSteps(stepCount);
          }
        });

        // Reset step count periodically to keep it fresh
        resetInterval = setInterval(() => {
          if (!cancelled) {
            resetSteps();
            setRecentSteps(stepCount);
          }
        }, LOOK_BACK_MS / 2);
      } catch {
        // Pedometer not available
      }
    };

    void setupPedometer();

    // Cleanup function - always runs on unmount
    return () => {
      cancelled = true;
      watchSub?.remove();
      if (resetInterval) {
        clearInterval(resetInterval);
      }
    };
  }, []);

  // Timer: check every 5 seconds (more frequent for better real-time feedback)
  useEffect(() => {
    let isChecking = false;
    const run = () => {
      if (isChecking) return; // Prevent overlapping checks
      isChecking = true;
      try {
        const dk = dayKey();
        const coords = sessionsRef.current
          .filter((s) => s.dayKey === dk)
          .flatMap((s) => s.coords);
        setStatus(checkStatus(coords, recentSteps));
      } finally {
        isChecking = false;
      }
    };

    run();
    const id = setInterval(run, 5_000);
    return () => clearInterval(id);
  }, [recentSteps]); // Re-run when recentSteps changes

  // Immediate update whenever sessions change (new GPS data synced)
  // Use sessionsRef to avoid infinite re-renders from new array references
  useEffect(() => {
    const dk = dayKey();
    const coords = sessionsRef.current.filter((s) => s.dayKey === dk).flatMap((s) => s.coords);
    setStatus(checkStatus(coords, recentSteps));
  }, [recentSteps]);

  return status;
}