import { useEffect, useRef, useState } from 'react';

import { useAppStore } from '../store/useAppStore';
import { dayKey } from '../utils/dates';
import { pathLengthM } from '../utils/geo';
import type { Coord } from '../store/types';

export type ActivityStatus = 'walking' | 'sitting' | 'unknown';

/** How many milliseconds of recent coords to look at */
const LOOK_BACK_MS = 90_000; // 90 seconds
/** Minimum distance in that window to count as walking */
const WALK_DIST_THRESHOLD_M = 15;

function checkStatus(allCoords: Coord[]): ActivityStatus {
  const now = Date.now();
  const recent = allCoords
    .filter((c) => c.timestamp != null && now - c.timestamp! < LOOK_BACK_MS)
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

  // Need at least 2 points to compute movement
  if (recent.length < 2) return 'unknown';

  // Check how old the newest coord is - if older than 3 minutes, we can't know
  const newest = recent[recent.length - 1].timestamp ?? 0;
  if (now - newest > 3 * 60_000) return 'unknown';

  const dist = pathLengthM(recent);
  return dist >= WALK_DIST_THRESHOLD_M ? 'walking' : 'sitting';
}

/**
 * Returns the user's current activity status ('walking' | 'sitting' | 'unknown').
 * Updates every 10 seconds from a timer AND immediately whenever new GPS data arrives.
 */
export function useActivityStatus(): ActivityStatus {
  const sessions = useAppStore((s) => s.sessions);
  const [status, setStatus] = useState<ActivityStatus>('unknown');

  // Keep a ref so the timer always reads the freshest sessions
  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  // Timer: check every 10 seconds
  useEffect(() => {
    const run = () => {
      const dk = dayKey();
      const coords = sessionsRef.current
        .filter((s) => s.dayKey === dk)
        .flatMap((s) => s.coords);
      setStatus(checkStatus(coords));
    };

    run();
    const id = setInterval(run, 10_000);
    return () => clearInterval(id);
  }, []); // only mount/unmount

  // Immediate update whenever sessions change (new GPS data synced)
  useEffect(() => {
    const dk = dayKey();
    const coords = sessions.filter((s) => s.dayKey === dk).flatMap((s) => s.coords);
    setStatus(checkStatus(coords));
  }, [sessions]);

  return status;
}