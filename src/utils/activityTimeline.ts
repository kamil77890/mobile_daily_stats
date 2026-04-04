import type { Coord } from '../store/types';
import { haversineM } from './geo';
import { ensureCoordTimestamps } from './walkingMetrics';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityType = 'walking' | 'vehicle' | 'sitting';
export type MasterBlockType = 'stationary' | 'transit' | 'walking';

export type ActivitySegment = {
  type: ActivityType;
  startMs: number;
  endMs: number;
  durationSec: number;
  distanceM: number;
  maxSpeedKmh: number;
  avgSpeedKmh: number;
  startCoord: { lat: number; lon: number };
  endCoord: { lat: number; lon: number };
  pointCount: number;
};

/**
 * Aggregated block for the primary Timeline list.
 * rawSegments drives the expandable detail sub-view.
 */
export type MasterBlock = {
  id: string;
  type: MasterBlockType;
  startMs: number;
  endMs: number;
  durationSec: number;
  distanceM: number;
  maxSpeedKmh: number;
  avgSpeedKmh: number;
  /** Primary coord for reverse-geocoding the address label */
  centerCoord: { lat: number; lon: number };
  startCoord: { lat: number; lon: number };
  endCoord: { lat: number; lon: number };
  estimatedSteps: number;
  rawSegments: ActivitySegment[];
};

// ─── Thresholds ───────────────────────────────────────────────────────────────

/** 10 km/h → vehicle */
export const VEHICLE_SPEED_MPS = 10 / 3.6;
const WALK_SPEED_MPS = 0.35; // 1.25 km/h
const MIN_SEGMENT_SEC = 60;
const TRANSIT_GAP_SEC = 180; // 3-min stop tolerance (traffic lights, tram stops)
const STATIONARY_DISP_M = 250; // net displacement threshold for stationary

// ─── Internal helpers ─────────────────────────────────────────────────────────

function haversineLL(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  return haversineM(
    { latitude: a.lat, longitude: a.lon, altitude: null },
    { latitude: b.lat, longitude: b.lon, altitude: null },
  );
}

function centroid(segs: ActivitySegment[]): { lat: number; lon: number } {
  return {
    lat: segs.reduce((s, x) => s + x.startCoord.lat, 0) / segs.length,
    lon: segs.reduce((s, x) => s + x.startCoord.lon, 0) / segs.length,
  };
}

function mergeSegs(segs: ActivitySegment[], type: ActivityType): ActivitySegment {
  const totalDist = segs.reduce((s, e) => s + e.distanceM, 0);
  const dur = (segs[segs.length - 1].endMs - segs[0].startMs) / 1000;
  return {
    type,
    startMs: segs[0].startMs,
    endMs: segs[segs.length - 1].endMs,
    durationSec: dur,
    distanceM: totalDist,
    maxSpeedKmh: Math.max(...segs.map(s => s.maxSpeedKmh)),
    avgSpeedKmh: dur > 0 ? (totalDist / dur) * 3.6 : 0,
    startCoord: segs[0].startCoord,
    endCoord: segs[segs.length - 1].endCoord,
    pointCount: segs.reduce((a, s) => a + s.pointCount, 0),
  };
}

// ─── Phase 1: raw segments ────────────────────────────────────────────────────

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

  type Edge = { type: ActivityType; from: number; to: number; distM: number; speedMps: number };
  const edges: Edge[] = [];

  for (let i = 0; i < pts.length - 1; i++) {
    const dt = (pts[i + 1].timestamp - pts[i].timestamp) / 1000;
    if (dt <= 0) continue;
    const d = haversineM(pts[i], pts[i + 1]);
    const spd = d / dt;
    const type: ActivityType =
      spd >= VEHICLE_SPEED_MPS ? 'vehicle' :
      spd >= WALK_SPEED_MPS   ? 'walking' : 'sitting';
    edges.push({ type, from: i, to: i + 1, distM: d, speedMps: spd });
  }

  if (edges.length === 0) return [];

  const raw: ActivitySegment[] = [];
  let gStart = 0;

  for (let i = 1; i <= edges.length; i++) {
    if (i === edges.length || edges[i].type !== edges[gStart].type) {
      const startPt = pts[edges[gStart].from];
      const endPt   = pts[edges[i - 1].to];
      const slice   = edges.slice(gStart, i);
      const dist    = slice.reduce((s, e) => s + e.distM, 0);
      const dur     = (endPt.timestamp - startPt.timestamp) / 1000;
      raw.push({
        type: edges[gStart].type,
        startMs: startPt.timestamp,
        endMs: endPt.timestamp,
        durationSec: dur,
        distanceM: dist,
        maxSpeedKmh: Math.max(...slice.map(e => e.speedMps * 3.6)),
        avgSpeedKmh: dur > 0 ? (dist / dur) * 3.6 : 0,
        startCoord: { lat: startPt.latitude, lon: startPt.longitude },
        endCoord:   { lat: endPt.latitude,   lon: endPt.longitude   },
        pointCount: i - gStart + 1,
      });
      gStart = i;
    }
  }

  // Absorb very short segments into their predecessor
  const out: ActivitySegment[] = [];
  for (const seg of raw) {
    const prev = out[out.length - 1];
    if (prev && seg.durationSec < MIN_SEGMENT_SEC) {
      const newDist = prev.distanceM + seg.distanceM;
      const newDur  = (seg.endMs - prev.startMs) / 1000;
      out[out.length - 1] = {
        ...prev,
        endMs: seg.endMs,
        durationSec: newDur,
        distanceM: newDist,
        maxSpeedKmh: Math.max(prev.maxSpeedKmh, seg.maxSpeedKmh),
        avgSpeedKmh: newDur > 0 ? (newDist / newDur) * 3.6 : prev.avgSpeedKmh,
        endCoord: seg.endCoord,
        pointCount: prev.pointCount + seg.pointCount,
      };
    } else {
      out.push({ ...seg });
    }
  }

  return out;
}

// ─── Phase 2: transit smoothing ──────────────────────────────────────────────

/**
 * Bridges vehicle segments that have non-vehicle gaps < toleranceSec.
 * Prevents tram/bus stops from fragmenting a journey into dozens of blocks.
 */
function smoothTransit(segs: ActivitySegment[], toleranceSec = TRANSIT_GAP_SEC): ActivitySegment[] {
  const result: ActivitySegment[] = [];
  let i = 0;

  while (i < segs.length) {
    if (segs[i].type !== 'vehicle') {
      result.push(segs[i]);
      i++;
      continue;
    }

    let vEnd = i;
    let extended = true;

    while (extended) {
      extended = false;
      let j = vEnd + 1;
      let gapSec = 0;

      while (j < segs.length && segs[j].type !== 'vehicle') {
        gapSec += segs[j].durationSec;
        j++;
      }

      if (j < segs.length && segs[j].type === 'vehicle' && gapSec <= toleranceSec) {
        vEnd = j;
        extended = true;
      }
    }

    result.push(vEnd > i ? mergeSegs(segs.slice(i, vEnd + 1), 'vehicle') : segs[i]);
    i = vEnd + 1;
  }

  return result;
}

// ─── Phase 3: stationary grouping ────────────────────────────────────────────

function makeBlock(segs: ActivitySegment[], strideM: number): MasterBlock {
  const startMs     = segs[0].startMs;
  const endMs       = segs[segs.length - 1].endMs;
  const durationSec = (endMs - startMs) / 1000;
  const dist        = segs.reduce((a, s) => a + s.distanceM, 0);
  const maxSpeed    = Math.max(...segs.map(s => s.maxSpeedKmh));
  const avgSpeed    = durationSec > 0 ? (dist / durationSec) * 3.6 : 0;
  const netDisp     = haversineLL(segs[0].startCoord, segs[segs.length - 1].endCoord);
  const isStationary = netDisp < STATIONARY_DISP_M;

  return {
    id: `block-${startMs}`,
    type: isStationary ? 'stationary' : 'walking',
    startMs,
    endMs,
    durationSec,
    distanceM: dist,
    maxSpeedKmh: maxSpeed,
    avgSpeedKmh: avgSpeed,
    centerCoord: isStationary ? centroid(segs) : segs[0].startCoord,
    startCoord: segs[0].startCoord,
    endCoord: segs[segs.length - 1].endCoord,
    estimatedSteps: Math.round(dist / Math.max(strideM, 0.01)),
    rawSegments: segs,
  };
}

function vehicleToBlock(seg: ActivitySegment): MasterBlock {
  return {
    id: `block-${seg.startMs}`,
    type: 'transit',
    startMs: seg.startMs,
    endMs: seg.endMs,
    durationSec: seg.durationSec,
    distanceM: seg.distanceM,
    maxSpeedKmh: seg.maxSpeedKmh,
    avgSpeedKmh: seg.avgSpeedKmh,
    centerCoord: seg.startCoord,
    startCoord: seg.startCoord,
    endCoord: seg.endCoord,
    estimatedSteps: 0,
    rawSegments: [seg],
  };
}

// ─── Public: master timeline ─────────────────────────────────────────────────

/**
 * Full pipeline: raw segments → transit smoothing → stationary grouping.
 * Returns hierarchical MasterBlock[] ready for the Timeline UI.
 */
export function buildMasterBlocks(
  segments: ActivitySegment[],
  strideM = 0.78,
): MasterBlock[] {
  if (segments.length === 0) return [];

  const smoothed = smoothTransit(segments);
  const result: MasterBlock[] = [];
  let pending: ActivitySegment[] = [];

  const flush = () => {
    if (pending.length === 0) return;
    result.push(makeBlock(pending, strideM));
    pending = [];
  };

  for (const seg of smoothed) {
    if (seg.type === 'vehicle') {
      flush();
      result.push(vehicleToBlock(seg));
    } else {
      pending.push(seg);
    }
  }
  flush();

  return result;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

// ─── Vivid colored polylines ─────────────────────────────────────────────────

/** High-contrast colors for dark map tiles */
export const SEGMENT_COLORS: Record<ActivityType, string> = {
  walking: '#39FF14',  // neon green
  vehicle: '#FF4500',  // vivid red-orange
  sitting: '#333333',  // barely visible on dark map
};

export type ColoredPolylineSegment = {
  coords: Array<{ latitude: number; longitude: number }>;
  color: string;
  strokeWidth: number;
  type: ActivityType;
};

export function buildColoredPolylines(
  coords: Coord[],
  startedAt: number,
  endedAt: number,
): ColoredPolylineSegment[] {
  if (coords.length < 2) return [];

  const pts = ensureCoordTimestamps(coords, startedAt, endedAt).sort(
    (a, b) => a.timestamp - b.timestamp,
  );
  if (pts.length < 2) return [];

  const result: ColoredPolylineSegment[] = [];
  let curType: ActivityType | null = null;
  let curCoords: Array<{ latitude: number; longitude: number }> = [];

  const push = (type: ActivityType, c: typeof curCoords) => {
    if (c.length < 2) return;
    result.push({
      coords: [...c],
      color: SEGMENT_COLORS[type],
      strokeWidth: type === 'vehicle' ? 7 : type === 'walking' ? 5 : 2,
      type,
    });
  };

  for (let i = 0; i < pts.length - 1; i++) {
    const dt  = (pts[i + 1].timestamp - pts[i].timestamp) / 1000;
    const d   = dt > 0 ? haversineM(pts[i], pts[i + 1]) : 0;
    const spd = dt > 0 ? d / dt : 0;
    const type: ActivityType =
      spd >= VEHICLE_SPEED_MPS ? 'vehicle' :
      spd >= WALK_SPEED_MPS   ? 'walking' : 'sitting';

    if (type !== curType) {
      if (curType !== null) {
        curCoords.push({ latitude: pts[i].latitude, longitude: pts[i].longitude });
        push(curType, curCoords);
      }
      curType = type;
      curCoords = [{ latitude: pts[i].latitude, longitude: pts[i].longitude }];
    } else {
      curCoords.push({ latitude: pts[i].latitude, longitude: pts[i].longitude });
    }
  }

  if (curType !== null) {
    const last = pts[pts.length - 1];
    curCoords.push({ latitude: last.latitude, longitude: last.longitude });
    push(curType, curCoords);
  }

  return result;
}