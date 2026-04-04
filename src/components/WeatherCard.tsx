import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Cloud, Sun, Wind, Droplets } from 'lucide-react-native';
import Constants from 'expo-constants';

import { AnimatedCard } from '../components/AnimatedCard';
import { WeatherForecastModal } from '../components/WeatherForecastModal';
import { useThemeColors } from '../theme/ThemeContext';
import {
  calculateWalkingWeatherScore,
  getWeatherEmoji,
  getWeatherRecommendation,
  getScoreLabel,
  getScoreColor,
  type WeatherData,
} from '../utils/weather';

// OpenWeatherMap API Key - loaded from app config
const OPENWEATHER_API_KEY = Constants.expoConfig?.extra?.openWeatherApiKey ?? '';

// Default location: Wołomin, Poland
const DEFAULT_LAT = 52.3369;
const DEFAULT_LON = 21.2449;
const DEFAULT_CITY = 'Wołomin';

type OpenWeatherResponse = {
  name: string;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
  };
  weather: {
    main: string;
    description: string;
  }[];
  wind: {
    speed: number;
  };
  visibility?: number;
  message?: string;
};

function mapOpenWeatherCondition(main: string): any {
  const conditionMap: Record<string, any> = {
    Clear: 'clear',
    Clouds: 'clouds',
    Rain: 'rain',
    Drizzle: 'drizzle',
    Thunderstorm: 'thunderstorm',
    Snow: 'snow',
    Mist: 'mist',
    Smoke: 'smoke',
    Haze: 'haze',
    Dust: 'dust',
    Fog: 'fog',
    Sand: 'sand',
    Ash: 'ash',
    Squall: 'squall',
    Tornado: 'tornado',
  };
  return conditionMap[main] || 'clear';
}

export function WeatherCard() {
  const colors = useThemeColors();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForecast, setShowForecast] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [cityName, setCityName] = useState(DEFAULT_CITY);

  useEffect(() => {
    let isMounted = true;

    const fetchWeather = async () => {
      try {
        if (!OPENWEATHER_API_KEY) {
          throw new Error('OpenWeather API key not configured. See .env.example');
        }

        // Get user's location
        const { getForegroundPermissionsAsync, getCurrentPositionAsync } = await import('expo-location');
        const { status } = await getForegroundPermissionsAsync();

        if (status !== 'granted') {
          // Use Wołomin as default location
          const defaultWeather = await fetchWeatherByCoords(DEFAULT_LAT, DEFAULT_LON, OPENWEATHER_API_KEY);
          if (isMounted) {
            setWeather(defaultWeather);
            setScore(calculateWalkingWeatherScore(defaultWeather));
            setCityName(DEFAULT_CITY);
            setLoading(false);
          }
          return;
        }

        const location = await getCurrentPositionAsync({
          accuracy: 3,
        });

        const data = await fetchWeatherByCoords(
          location.coords.latitude,
          location.coords.longitude,
          OPENWEATHER_API_KEY
        );

        if (isMounted) {
          setWeather(data);
          setScore(calculateWalkingWeatherScore(data));
          setUserLocation({ lat: location.coords.latitude, lon: location.coords.longitude });
          setCityName(DEFAULT_CITY);
          setLoading(false);
        }
      } catch (err) {
        console.log('Weather fetch error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch weather');
          setLoading(false);
        }
      }
    };

    fetchWeather();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <AnimatedCard delay={150}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading weather...</Text>
        </View>
      </AnimatedCard>
    );
  }

  if (error || !weather) {
    return (
      <AnimatedCard delay={150}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.accent }]}>⚠️ {error || 'Weather unavailable'}</Text>
          <Text style={[styles.errorSubtext, { color: colors.textMuted }]}>Check your connection</Text>
        </View>
      </AnimatedCard>
    );
  }

  const scoreColor = getScoreColor(score);
  const recommendation = getWeatherRecommendation(score, weather);
  const displayLocation = weather.location === "Sławek" ? "Wołomin" : weather.location;


  return (
    <>
      <TouchableOpacity activeOpacity={0.8} onPress={() => setShowForecast(true)}>
        <AnimatedCard delay={150}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={[styles.location, { color: colors.text }]}>{displayLocation}</Text>
                <Text style={[styles.condition, { color: colors.textMuted }]}>
                  {getWeatherEmoji(weather.condition)} {weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1)}
                </Text>
              </View>
              <View style={[styles.scoreBadge, { borderColor: scoreColor, backgroundColor: colors.bg }]}>
                <Text style={[styles.scoreValue, { color: scoreColor }]}>{Math.round(score)}</Text>
                <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>{getScoreLabel(score)}</Text>
              </View>
            </View>

            {/* Main weather info */}
            <View style={styles.main}>
              <Text style={[styles.temperature, { color: colors.text }]}>{Math.round(weather.temp)}°C</Text>
              <Text style={[styles.feelsLike, { color: colors.textMuted }]}>
                Feels like {Math.round(weather.feelsLike)}°C
              </Text>
              <Text style={[styles.recommendation, { color: scoreColor }]}>
                {recommendation}
              </Text>
            </View>

            {/* Details */}
            <View style={[styles.details, { borderTopColor: colors.border }]}>
              <DetailItem
                icon={<Droplets color={colors.accent} size={16} />}
                label="Humidity"
                value={`${weather.humidity}%`}
              />
              <DetailItem
                icon={<Wind color={colors.accent} size={16} />}
                label="Wind"
                value={`${Math.round(weather.windSpeed * 3.6)} km/h`}
              />
            </View>

            {/* Hint */}
            <View style={[styles.tapHint, { borderTopColor: colors.border }]}>
              <Text style={[styles.tapHintText, { color: colors.accent }]}>👆 Tap for hourly forecast</Text>
            </View>
          </View>
        </AnimatedCard>
      </TouchableOpacity>

      <WeatherForecastModal
        visible={showForecast}
        onClose={() => setShowForecast(false)}
        lat={userLocation?.lat}
        lon={userLocation?.lon}
        cityName={cityName}
      />
    </>
  );
}

async function fetchWeatherByCoords(
  lat: number,
  lon: number,
  apiKey: string
): Promise<WeatherData> {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  
  const response = await fetch(url);
  const data: OpenWeatherResponse = await response.json();
  
  if (!response.ok) {
    console.log('Weather API error:', data.message || response.status);
    throw new Error(data.message || `Weather API error: ${response.status}`);
  }
  
  return {
    temp: data.main.temp,
    feelsLike: data.main.feels_like,
    humidity: data.main.humidity,
    condition: mapOpenWeatherCondition(data.weather[0].main),
    windSpeed: data.wind.speed,
    location: data.name,
  };
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.detailItem}>
      {icon}
      <View style={styles.detailText}>
        <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '700',
  },
  errorSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  container: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  location: {
    fontSize: 16,
    fontWeight: '800',
  },
  condition: {
    fontSize: 13,
    marginTop: 2,
  },
  scoreBadge: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 2,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  main: {
    alignItems: 'center',
    gap: 4,
  },
  temperature: {
    fontSize: 42,
    fontWeight: '900',
  },
  feelsLike: {
    fontSize: 13,
  },
  recommendation: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  tapHint: {
    paddingTop: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  tapHintText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
