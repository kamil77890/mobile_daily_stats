import type { Coord } from '../store/types';

const R = 6371000;

export function haversineM(a: Coord, b: Coord): number {
  const φ1 = (a.latitude * Math.PI) / 180;
  const φ2 = (b.latitude * Math.PI) / 180;
  const Δφ = ((b.latitude - a.latitude) * Math.PI) / 180;
  const Δλ = ((b.longitude - a.longitude) * Math.PI) / 180;
  const s =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

export function pathLengthM(coords: Coord[]): number {
  let t = 0;
  for (let i = 1; i < coords.length; i++) {
    t += haversineM(coords[i - 1], coords[i]);
  }
  return t;
}

export function elevationGainM(coords: Coord[]): number {
  let gain = 0;
  let prev: number | null = null;
  for (const c of coords) {
    if (c.altitude == null || Number.isNaN(c.altitude)) continue;
    if (prev != null && c.altitude > prev) {
      gain += c.altitude - prev;
    }
    prev = c.altitude;
  }
  return gain;
}

export function regionForCoords(coords: Coord[], padding = 0.002): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} {
  if (coords.length === 0) {
    return {
      latitude: 50.06,
      longitude: 19.94,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }
  let minLat = coords[0].latitude;
  let maxLat = coords[0].latitude;
  let minLon = coords[0].longitude;
  let maxLon = coords[0].longitude;
  for (const c of coords) {
    minLat = Math.min(minLat, c.latitude);
    maxLat = Math.max(maxLat, c.latitude);
    minLon = Math.min(minLon, c.longitude);
    maxLon = Math.max(maxLon, c.longitude);
  }
  const midLat = (minLat + maxLat) / 2;
  const midLon = (minLon + maxLon) / 2;
  const dLat = Math.max(maxLat - minLat, padding) * 2.2;
  const dLon = Math.max(maxLon - minLon, padding) * 2.2;
  return {
    latitude: midLat,
    longitude: midLon,
    latitudeDelta: dLat,
    longitudeDelta: dLon,
  };
}

export function kcalFromWalk(distanceKm: number, steps: number): number {
  const fromDist = distanceKm * 55;
  const fromSteps = steps * 0.04;
  return Math.round(Math.max(fromDist, fromSteps * 0.6) + fromSteps * 0.4);
}
