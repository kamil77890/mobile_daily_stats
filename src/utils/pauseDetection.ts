import type { Coord } from '../store/types';

import { haversineM } from './geo';
import { ensureCoordTimestamps } from './walkingMetrics';

export type MovementPause = { startMs: number; endMs: number };

/**
 * Finds stretches where GPS moves slowly for a couple of minutes within a small area (likely stopped).
 */
export function findMovementPauses(
  coords: Coord[],
  startedAt: number,
  endedAt: number,
  minPauseSec = 120,
  maxNetMoveM = 120,
): MovementPause[] {
  const pts = ensureCoordTimestamps(coords, startedAt, endedAt).sort((a, b) => a.timestamp - b.timestamp);
  if (pts.length < 3) return [];

  const slowEdge: boolean[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const dt = (pts[i + 1].timestamp - pts[i].timestamp) / 1000;
    if (dt <= 0) {
      slowEdge.push(false);
      continue;
    }
    const d = haversineM(pts[i], pts[i + 1]);
    slowEdge.push(d / dt < 1.2);
  }

  const out: MovementPause[] = [];
  let runStart: number | null = null;

  for (let i = 0; i < slowEdge.length; i++) {
    if (slowEdge[i]) {
      if (runStart === null) runStart = i;
    } else if (runStart !== null) {
      const from = runStart;
      const lastPt = i;
      const dur = (pts[lastPt].timestamp - pts[from].timestamp) / 1000;
      const net = haversineM(pts[from], pts[lastPt]);
      if (dur >= minPauseSec && net < maxNetMoveM) {
        out.push({ startMs: pts[from].timestamp, endMs: pts[lastPt].timestamp });
      }
      runStart = null;
    }
  }

  if (runStart !== null) {
    const from = runStart;
    const lastPt = pts.length - 1;
    const dur = (pts[lastPt].timestamp - pts[from].timestamp) / 1000;
    const net = haversineM(pts[from], pts[lastPt]);
    if (dur >= minPauseSec && net < maxNetMoveM) {
      out.push({ startMs: pts[from].timestamp, endMs: pts[lastPt].timestamp });
    }
  }

  return mergeOverlapping(out);
}

function mergeOverlapping(pauses: MovementPause[]): MovementPause[] {
  if (pauses.length < 2) return pauses;
  const sorted = [...pauses].sort((a, b) => a.startMs - b.startMs);
  const merged: MovementPause[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur.startMs <= prev.endMs + 60_000) {
      prev.endMs = Math.max(prev.endMs, cur.endMs);
    } else {
      merged.push(cur);
    }
  }
  return merged;
}

export function formatPauseRange(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
