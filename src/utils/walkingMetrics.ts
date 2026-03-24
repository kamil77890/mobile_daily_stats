import type { Coord } from '../store/types';

import { haversineM } from './geo';

/** Above this speed between GPS points we treat movement as vehicle / transit — exclude from walking distance. (~25 km/h) */
export const MAX_WALKING_SPEED_MPS = 7;

export function ensureCoordTimestamps(coords: Coord[], startedAt: number, endedAt: number): (Coord & { timestamp: number })[] {
  const n = coords.length;
  if (n === 0) return [];
  return coords.map((c, i) => ({
    ...c,
    timestamp: c.timestamp ?? startedAt + ((endedAt - startedAt) * i) / Math.max(1, n - 1),
  }));
}

/**
 * Sum horizontal distance only for segments where implied speed ≤ maxMps (excludes car/train/tram).
 */
export function pathLengthWalkingOnly(
  coords: Coord[],
  startedAt: number,
  endedAt: number,
  maxMps = MAX_WALKING_SPEED_MPS,
): number {
  const pts = ensureCoordTimestamps(coords, startedAt, endedAt);
  let sum = 0;
  for (let i = 1; i < pts.length; i++) {
    const dt = (pts[i].timestamp - pts[i - 1].timestamp) / 1000;
    if (dt <= 0) continue;
    const d = haversineM(pts[i - 1], pts[i]);
    const speed = d / dt;
    if (speed <= maxMps) sum += d;
  }
  return sum;
}

export function elevationGainWalkingOnly(
  coords: Coord[],
  startedAt: number,
  endedAt: number,
  maxMps = MAX_WALKING_SPEED_MPS,
): number {
  const pts = ensureCoordTimestamps(coords, startedAt, endedAt);
  let gain = 0;
  for (let i = 1; i < pts.length; i++) {
    const dt = (pts[i].timestamp - pts[i - 1].timestamp) / 1000;
    if (dt <= 0) continue;
    const d = haversineM(pts[i - 1], pts[i]);
    const speed = d / dt;
    if (speed > maxMps) continue;
    const a = pts[i].altitude;
    const b = pts[i - 1].altitude;
    if (a == null || b == null || Number.isNaN(a) || Number.isNaN(b)) continue;
    if (a > b) gain += a - b;
  }
  return gain;
}
