/**
 * Weather utilities for walking recommendations.
 * Uses simple heuristics based on temperature and conditions.
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
  uvIndex?: number;
  location: string;
};

/**
 * Calculate a walking weather score (0-100).
 * Higher is better for walking.
 */
export function calculateWalkingWeatherScore(weather: WeatherData): number {
  let score = 100;

  // Temperature scoring (optimal: 15-25°C)
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

  // Feels like adjustment
  const feelsDiff = Math.abs(weather.feelsLike - temp);
  if (feelsDiff > 5) {
    score -= feelsDiff * 2;
  }

  // Condition scoring
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

  // Humidity scoring (optimal: 40-60%)
  const humidity = weather.humidity;
  if (humidity > 80) {
    score -= (humidity - 80) * 0.5;
  } else if (humidity < 20) {
    score -= (20 - humidity) * 0.3;
  }

  // Wind scoring (optimal: < 5 m/s)
  const wind = weather.windSpeed;
  if (wind > 10) {
    score -= (wind - 10) * 3;
  } else if (wind > 5) {
    score -= (wind - 5) * 1.5;
  }

  // UV Index scoring (if available)
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
