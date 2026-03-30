import type { Coord } from '../store/types';
import { haversineM } from './geo';
import { ensureCoordTimestamps } from './walkingMetrics';

export type ActivityType = 'walking' | 'sitting';

export type ActivitySegment = {
  type: ActivityType;
  startMs: number;
  endMs: number;
  durationSec: number;
  distanceM: number;
  startCoord: { lat: number; lon: number };
  endCoord: { lat: number; lon: number };
  pointCount: number;
};

/** Speed threshold: below this = sitting, above = walking */
const WALK_SPEED_MPS = 0.35; // ≈ 1.25 km/h
/** Segments shorter than this are absorbed into the previous segment */
const MIN_SEGMENT_SEC = 100;

export function computeActivityTimeline(
  coords: Coord[],
  sessionStartedAt: number,
  sessionEndedAt: number,
): ActivitySegment[] {
  if (coords.length < 2) return [];

  const pts = ensureCoordTimestamps(coords, sessionStartedAt, sessionEndedAt).sort(
    (a, b) => a.timestamp - b.timestamp,
  );

  if (pts.length < 2) return [];

  type Edge = {
    type: ActivityType;
    from: number;
    to: number;
    distM: number;
  };

  const edges: Edge[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const dt = (pts[i + 1].timestamp - pts[i].timestamp) / 1000;
    if (dt <= 0) continue;
    const d = haversineM(pts[i], pts[i + 1]);
    const speed = d / dt;
    edges.push({
      type: speed >= WALK_SPEED_MPS ? 'walking' : 'sitting',
      from: i,
      to: i + 1,
      distM: d,
    });
  }

  if (edges.length === 0) return [];

  // Group consecutive same-type edges into raw segments
  const raw: ActivitySegment[] = [];
  let gStart = 0;

  for (let i = 1; i <= edges.length; i++) {
    if (i === edges.length || edges[i].type !== edges[gStart].type) {
      const startPt = pts[edges[gStart].from];
      const endPt = pts[edges[i - 1].to];
      const totalDist = edges.slice(gStart, i).reduce((s, e) => s + e.distM, 0);

      raw.push({
        type: edges[gStart].type,
        startMs: startPt.timestamp,
        endMs: endPt.timestamp,
        durationSec: (endPt.timestamp - startPt.timestamp) / 1000,
        distanceM: totalDist,
        startCoord: { lat: startPt.latitude, lon: startPt.longitude },
        endCoord: { lat: endPt.latitude, lon: endPt.longitude },
        pointCount: i - gStart + 1,
      });
      gStart = i;
    }
  }

  // Merge segments shorter than MIN_SEGMENT_SEC into the preceding segment
  const merged: ActivitySegment[] = [];
  for (const seg of raw) {
    const prev = merged.length > 0 ? merged[merged.length - 1] : null;
    if (prev && seg.durationSec < MIN_SEGMENT_SEC) {
      merged[merged.length - 1] = {
        ...prev,
        endMs: seg.endMs,
        durationSec: (seg.endMs - prev.startMs) / 1000,
        distanceM: prev.distanceM + seg.distanceM,
        endCoord: seg.endCoord,
        pointCount: prev.pointCount + seg.pointCount,
      };
    } else {
      merged.push(seg);
    }
  }

  return merged;
}

export function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

export function formatCoord(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lon).toFixed(4)}°${lonDir}`;
}