/**
 * Weather utilities for walking recommendations.
 * Uses simple heuristics based on temperature, conditions, and wind.
 */

export type WeatherCondition =
  | 'clear'
  | 'clouds'
  | 'rain'
  | 'drizzle'
  | 'thunderstorm'
  | 'snow'
  | 'mist'
  | 'smoke'
  | 'haze'
  | 'dust'
  | 'fog'
  | 'sand'
  | 'ash'
  | 'squall'
  | 'tornado';

export type WeatherData = {
  temp: number; // Celsius
  feelsLike: number;
  humidity: number;
  condition: WeatherCondition;
  windSpeed: number; // m/s
  windGust?: number; // m/s — peak wind gusts
  uvIndex?: number;
  location: string;
};

/**
 * Calculate wind chill temperature (°C) for cold + windy conditions.
 * Valid when temp <= 10°C and windSpeed > 4.8 km/h (> 1.33 m/s).
 * Formula: Wind Chill = 13.12 + 0.6215*T - 11.37*V^0.16 + 0.3965*T*V^0.16
 * where T = temp in °C, V = wind speed in km/h
 */
function calculateWindChill(tempC: number, windSpeedMs: number): number | null {
  if (tempC > 10) return null; // Wind chill not applicable above 10°C
  const windKmh = windSpeedMs * 3.6; // Convert m/s to km/h
  if (windKmh <= 4.8) return null; // Not windy enough for wind chill
  const vPow = Math.pow(windKmh, 0.16);
  const windChill = 13.12 + 0.6215 * tempC - 11.37 * vPow + 0.3965 * tempC * vPow;
  return Math.round(windChill * 10) / 10;
}

/**
 * Calculate heat index (°C) for hot + humid conditions.
 * Valid when temp >= 27°C (80°F).
 * Simplified Rothfusz regression.
 */
function calculateHeatIndex(tempC: number, humidity: number): number | null {
  if (tempC < 27) return null; // Heat index not applicable below 27°C
  const tempF = tempC * 9 / 5 + 32;
  // Simplified heat index (Rothfusz regression)
  const hi = -42.379
    + 2.04901523 * tempF
    + 10.14333127 * humidity
    - 0.22475541 * tempF * humidity
    - 6.83783e-3 * tempF * tempF
    - 5.481717e-2 * humidity * humidity
    + 1.22874e-3 * tempF * tempF * humidity
    + 8.5282e-4 * tempF * humidity * humidity
    - 1.99e-6 * tempF * tempF * humidity * humidity;
  return Math.round(((hi - 32) * 5 / 9) * 10) / 10;
}

/**
 * Calculate a walking weather score (0-100).
 * Higher is better for walking.
 * Wind is now a major factor with wind chill, gusts, and exposure penalty.
 */
export function calculateWalkingWeatherScore(weather: WeatherData): number {
  let score = 100;

  // ── Temperature scoring (optimal: 15-25°C) ─────────────────
  const temp = weather.temp;
  if (temp < 5) {
    score -= (5 - temp) * 4; // Cold penalty
  } else if (temp < 15) {
    score -= (15 - temp) * 2; // Cool penalty
  } else if (temp > 30) {
    score -= (temp - 30) * 4; // Hot penalty
  } else if (temp > 25) {
    score -= (temp - 25) * 2; // Warm penalty
  }

  // ── Feels like adjustment ───────────────────────────────────
  const feelsDiff = Math.abs(weather.feelsLike - temp);
  if (feelsDiff > 5) {
    score -= feelsDiff * 2;
  }

  // ── Condition scoring ───────────────────────────────────────
  const conditionPenalties: Record<WeatherCondition, number> = {
    clear: 0,
    clouds: -5,
    rain: -30,
    drizzle: -15,
    thunderstorm: -50,
    snow: -35,
    mist: -10,
    smoke: -25,
    haze: -15,
    dust: -30,
    fog: -25,
    sand: -40,
    ash: -50,
    squall: -45,
    tornado: -100,
  };
  score += conditionPenalties[weather.condition] ?? 0;

  // ── Humidity scoring (optimal: 40-60%) ─────────────────────
  const humidity = weather.humidity;
  if (humidity > 80) {
    score -= (humidity - 80) * 0.5;
  } else if (humidity < 20) {
    score -= (20 - humidity) * 0.3;
  }

  // ── Wind scoring — ENHANCED ─────────────────────────────────
  // Wind is a major factor for walking comfort.
  // Beaufort scale reference:
  //   0-1 m/s   (0-4 km/h)   — Calm, no impact
  //   1-3 m/s   (4-11 km/h)  — Light breeze, minimal impact
  //   3-5 m/s   (11-20 km/h) — Moderate breeze, slight discomfort
  //   5-8 m/s   (20-29 km/h) — Fresh breeze, noticeable resistance
  //   8-10 m/s  (29-36 km/h) — Strong breeze, hard to walk
  //   10-14 m/s (36-50 km/h) — Gale, unpleasant/dangerous
  //   14+ m/s   (50+ km/h)   — Storm, avoid outdoors
  const wind = weather.windSpeed;
  const windKmh = wind * 3.6;

  if (wind > 14) {
    // Storm force — very dangerous
    score -= 50;
  } else if (wind > 10) {
    // Gale — strong penalty
    score -= 25 + (wind - 10) * 5;
  } else if (wind > 8) {
    // Strong breeze — noticeable resistance
    score -= 12 + (wind - 8) * 6;
  } else if (wind > 5) {
    // Fresh breeze — moderate penalty
    score -= 4 + (wind - 5) * 2.5;
  } else if (wind > 3) {
    // Moderate breeze — slight penalty
    score -= (wind - 3) * 1;
  }
  // 0-3 m/s: no wind penalty

  // Wind gust penalty (if available) — gusts are more impactful than sustained wind
  if (weather.windGust !== undefined) {
    const gust = weather.windGust;
    if (gust > 15) {
      score -= 20; // Dangerous gusts
    } else if (gust > 10) {
      score -= 10; // Strong gusts
    } else if (gust > 7) {
      score -= 4; // Moderate gusts
    }
    // If gusts are much higher than sustained wind, add extra penalty
    const gustRatio = wind > 0 ? gust / wind : 1;
    if (gustRatio > 2) {
      score -= 8; // Very gusty — unpredictable conditions
    } else if (gustRatio > 1.5) {
      score -= 3; // Moderately gusty
    }
  }

  // Wind chill penalty — wind makes cold feel much colder
  const windChill = calculateWindChill(temp, wind);
  if (windChill !== null && windChill < temp) {
    const chillDiff = temp - windChill;
    if (chillDiff > 10) {
      score -= 15; // Severe wind chill
    } else if (chillDiff > 5) {
      score -= 8; // Moderate wind chill
    } else if (chillDiff > 2) {
      score -= 3; // Light wind chill
    }
  }

  // Heat index penalty — humidity + heat is worse than dry heat
  const heatIndex = calculateHeatIndex(temp, humidity);
  if (heatIndex !== null && heatIndex > temp) {
    const heatDiff = heatIndex - temp;
    if (heatDiff > 10) {
      score -= 15; // Dangerous heat index
    } else if (heatDiff > 5) {
      score -= 8; // High heat index
    } else if (heatDiff > 2) {
      score -= 3; // Moderate heat index
    }
  }

  // ── UV Index scoring (if available) ────────────────────────
  if (weather.uvIndex !== undefined) {
    const uv = weather.uvIndex;
    if (uv > 8) {
      score -= (uv - 8) * 5; // Very high UV
    } else if (uv > 5) {
      score -= (uv - 5) * 2; // Moderate UV
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get wind severity level based on wind speed (m/s).
 * Returns an object with label, color, and emoji for UI display.
 */
export function getWindSeverityInfo(windSpeedMs: number): {
  level: number;
  label: string;
  labelPL: string;
  color: string;
  emoji: string;
} {
  if (windSpeedMs > 14) {
    return { level: 5, label: 'Storm', labelPL: 'Unikaj wyjścia', color: '#8B0000', emoji: '🌪️' };
  }
  if (windSpeedMs > 10) {
    return { level: 4, label: 'Gale', labelPL: 'Niebezpiecznie', color: '#FF4500', emoji: '💨' };
  }
  if (windSpeedMs > 8) {
    return { level: 3, label: 'Strong', labelPL: 'Silny wiatr', color: '#FF8C00', emoji: '🌬️' };
  }
  if (windSpeedMs > 5) {
    return { level: 2, label: 'Fresh', labelPL: 'Umiarkowany', color: '#FFA500', emoji: '💨' };
  }
  if (windSpeedMs > 3) {
    return { level: 1, label: 'Moderate', labelPL: 'Lekki', color: '#FFD700', emoji: '🍃' };
  }
  return { level: 0, label: 'Calm', labelPL: 'Spokojnie', color: '#2ed573', emoji: '🌿' };
}

/**
 * Get a weather recommendation message.
 */
export function getWeatherRecommendation(score: number, weather: WeatherData): string {
  if (score >= 80) {
    return '🌟 Perfect walking weather!';
  } else if (score >= 60) {
    return '👍 Good conditions for a walk';
  } else if (score >= 40) {
    return '⚠️ Consider indoor alternatives';
  } else if (score >= 20) {
    return '🌧️ Poor weather - stay safe';
  } else {
    return '🚫 Not recommended for outdoor activity';
  }
}

/**
 * Get weather emoji based on condition.
 */
export function getWeatherEmoji(condition: WeatherCondition): string {
  const emojis: Record<WeatherCondition, string> = {
    clear: '☀️',
    clouds: '☁️',
    rain: '🌧️',
    drizzle: '🌦️',
    thunderstorm: '⛈️',
    snow: '❄️',
    mist: '🌫️',
    smoke: '💨',
    haze: '🌫️',
    dust: '🌪️',
    fog: '🌫️',
    sand: '🏜️',
    ash: '🌋',
    squall: '💨',
    tornado: '🌪️',
  };
  return emojis[condition] ?? '🌡️';
}

/**
 * Get walking weather score label.
 */
export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 20) return 'Poor';
  return 'Very Poor';
}

/**
 * Get score color.
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return '#2ed573'; // Green
  if (score >= 60) return '#7bed9f'; // Light Green
  if (score >= 40) return '#ffa502'; // Orange
  if (score >= 20) return '#ff7f50'; // Coral
  return '#ff4757'; // Red
}

/**
 * Mock weather data for demo (replace with real API call).
 */
export function getMockWeatherData(location: string = 'Your Location'): WeatherData {
  const conditions: WeatherCondition[] = ['clear', 'clouds', 'rain', 'drizzle'];
  const condition = conditions[Math.floor(Math.random() * conditions.length)];
  const temp = Math.round(Math.random() * 30) + 5; // 5-35°C
  
  return {
    temp,
    feelsLike: temp + (Math.random() > 0.5 ? 2 : -2),
    humidity: Math.round(Math.random() * 60) + 30,
    condition,
    windSpeed: Math.round(Math.random() * 15),
    uvIndex: Math.round(Math.random() * 10),
    location,
  };
}
