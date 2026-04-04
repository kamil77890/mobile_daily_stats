import * as Location from 'expo-location';

/** Module-level LRU-ish cache (~110 m grid precision) */
const cache = new Map<string, string>();
const MAX_CACHE = 400;

function key(lat: number, lon: number): string {
  return `${lat.toFixed(3)},${lon.toFixed(3)}`;
}

function buildLabel(r: Location.LocationGeocodedAddress): string {
  const isRealPoi =
    !!r.name &&
    !/^\d+$/.test(r.name) &&
    r.name !== r.street &&
    r.name !== r.streetNumber;

  const parts: string[] = [];

  if (isRealPoi && r.name) parts.push(r.name);

  if (r.street) {
    const full = r.streetNumber ? `${r.street} ${r.streetNumber}` : r.street;
    if (!isRealPoi || !r.name!.toLowerCase().includes(r.street.toLowerCase())) {
      parts.push(full);
    }
  }

  const city = r.district || r.city || r.subregion || r.region;
  if (city && !parts.some(p => p.toLowerCase().includes(city!.toLowerCase()))) {
    parts.push(city);
  }

  return parts.join(', ').trim();
}

/**
 * Async reverse-geocode with in-session cache.
 * Returns a human-readable address string or '' on failure
 * (never throws, never returns raw coordinates).
 */
export async function reverseGeocodePoint(lat: number, lon: number): Promise<string> {
  const k = key(lat, lon);
  if (cache.has(k)) return cache.get(k)!;

  let result = '';
  try {
    const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    if (places.length > 0) result = buildLabel(places[0]);
  } catch {
    // network error or location services off → return ''
  }

  if (cache.size >= MAX_CACHE) {
    // evict oldest entry
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(k, result);
  return result;
}