import { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { X, Droplets, Wind } from 'lucide-react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';

import { useThemeColors } from '../theme/ThemeContext';
import { getWeatherEmoji, type WeatherCondition } from '../utils/weather';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 140;
const PADDING = 20;

const DEFAULT_LAT = 52.3369;
const DEFAULT_LON = 21.2449;
const DEFAULT_CITY = 'Wołomin';

type HourlyForecast = {
  time: string;
  temp: number;
  feelsLike: number;
  condition: WeatherCondition;
  humidity: number;
  windSpeed: number;
  precipitation: number;
};

type OpenMeteoResponse = {
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    relative_humidity_2m: number[];
    wind_speed_10m: number[];
    precipitation: number[];
    weather_code: number[];
  };
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    precipitation: number;
    weather_code: number;
  };
};

function mapWeatherCode(code: number): WeatherCondition {
  if (code === 0) return 'clear';
  if (code >= 1 && code <= 3) return 'clouds';
  if (code >= 45 && code <= 48) return 'fog';
  if (code >= 51 && code <= 55) return 'drizzle';
  if (code >= 61 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'rain';
  if (code >= 85 && code <= 86) return 'snow';
  if (code >= 95 && code <= 99) return 'thunderstorm';
  return 'clouds';
}

function formatHour(isoTime: string): string {
  const date = new Date(isoTime);
  const hours = date.getHours();
  return `${hours}h`;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  lat?: number;
  lon?: number;
  cityName?: string;
};

export function WeatherForecastModal({ visible, onClose, lat, lon, cityName }: Props) {
  const colors = useThemeColors();
  const [forecast, setForecast] = useState<HourlyForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityNameDisplay, setCityNameDisplay] = useState(cityName || DEFAULT_CITY);
  const [currentTemp, setCurrentTemp] = useState(0);

  useEffect(() => {
    if (visible) {
      fetchForecast();
    }
  }, [visible]);

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);

    try {
      const latitude = lat || DEFAULT_LAT;
      const longitude = lon || DEFAULT_LON;
      
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&current=temperature_2m&timezone=auto&forecast_days=2`;

      const response = await fetch(url);
      const data: OpenMeteoResponse = await response.json();

      if (!response.ok) {
        throw new Error('Failed to fetch forecast');
      }

      setCurrentTemp(Math.round(data.current.temperature_2m));

      const currentHour = new Date().getHours();
      const hourlyData = data.hourly;
      
      const next24Hours: HourlyForecast[] = [];
      for (let i = currentHour; i < currentHour + 24 && i < hourlyData.time.length; i++) {
        const time = hourlyData.time[i];
        next24Hours.push({
          time: formatHour(time),
          temp: Math.round(hourlyData.temperature_2m[i]),
          feelsLike: Math.round(hourlyData.apparent_temperature[i]),
          condition: mapWeatherCode(hourlyData.weather_code[i]),
          humidity: hourlyData.relative_humidity_2m[i],
          windSpeed: Math.round(hourlyData.wind_speed_10m[i]),
          precipitation: Math.round(hourlyData.precipitation[i]),
        });
      }

      setForecast(next24Hours);
    } catch (err) {
      console.log('Forecast fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load forecast');
    } finally {
      setLoading(false);
    }
  };

  const minTemp = Math.min(...forecast.map(f => f.temp));
  const maxTemp = Math.max(...forecast.map(f => f.temp));
  const tempRange = maxTemp - minTemp || 1;

  const points = forecast.length > 0 ? forecast.map((item, index) => {
    const x = PADDING + (index / (forecast.length - 1)) * (CHART_WIDTH - PADDING * 2);
    const y = CHART_HEIGHT - PADDING - ((item.temp - minTemp) / tempRange) * (CHART_HEIGHT - PADDING * 2);
    return { x, y, temp: item.temp, time: item.time, condition: item.condition };
  }) : [];

  const pathD = points.length > 1 ? points.reduce((acc, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const cpx1 = prev.x + (point.x - prev.x) / 3;
    const cpx2 = prev.x + (2 * (point.x - prev.x)) / 3;
    return `${acc} C ${cpx1} ${prev.y}, ${cpx2} ${point.y}, ${point.x} ${point.y}`;
  }, '') : '';

  const areaD = points.length > 1 ? `${pathD} L ${points[points.length - 1].x} ${CHART_HEIGHT} L ${points[0].x} ${CHART_HEIGHT} Z` : '';

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      justifyContent: 'flex-end',
    },
    modal: {
      backgroundColor: '#0f0f0f',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
    },
    location: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    currentTime: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.cardElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingContainer: {
      padding: 80,
      alignItems: 'center',
    },
    errorContainer: {
      padding: 60,
      alignItems: 'center',
    },
    errorText: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '700',
    },
    scrollView: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    currentWeather: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    currentMain: {
      alignItems: 'center',
    },
    currentTemp: {
      color: colors.text,
      fontSize: 64,
      fontWeight: '200',
    },
    currentInfo: {
      alignItems: 'center',
      marginTop: 8,
    },
    currentCondition: {
      color: colors.textMuted,
      fontSize: 14,
      marginBottom: 8,
    },
    currentDetails: {
      flexDirection: 'row',
      gap: 16,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    detailText: {
      color: colors.textMuted,
      fontSize: 12,
    },
    chartContainer: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
      alignItems: 'center',
      minHeight: 180,
    },
    chartPlaceholder: {
      flex: 1,
      minHeight: 120,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      paddingHorizontal: PADDING,
      marginTop: 8,
    },
    timeLabel: {
      color: colors.textMuted,
      fontSize: 11,
      width: 30,
      textAlign: 'center',
    },
    hourlyContainer: {
      marginBottom: 8,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    hourlyContent: {
      paddingRight: 20,
    },
    hourCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      marginRight: 10,
      width: 68,
      alignItems: 'center',
      gap: 6,
    },
    currentHour: {
      backgroundColor: colors.accent,
    },
    hourTime: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
    },
    currentHourText: {
      color: colors.bg,
    },
    nowDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.bg,
      position: 'absolute',
      top: 10,
      right: 10,
    },
    hourEmoji: {
      fontSize: 24,
    },
    hourTemp: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    rainChance: {
      color: colors.info,
      fontSize: 10,
      fontWeight: '600',
    },
    infoContainer: {
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    infoText: {
      color: colors.textMuted,
      fontSize: 11,
      textAlign: 'center',
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View>
              <Text style={styles.location}>{cityNameDisplay}</Text>
              <Text style={styles.currentTime}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={styles.closeButton}>
              <X color={colors.text} size={20} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.currentWeather}>
                <View style={styles.currentMain}>
                  <Text style={styles.currentTemp}>{currentTemp}°</Text>
                  <View style={styles.currentInfo}>
                    <Text style={styles.currentCondition}>Feels like {forecast[0]?.feelsLike || currentTemp}°</Text>
                    <View style={styles.currentDetails}>
                      <View style={styles.detailRow}>
                        <Droplets color={colors.textMuted} size={12} />
                        <Text style={styles.detailText}>{forecast[0]?.humidity}%</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Wind color={colors.textMuted} size={12} />
                        <Text style={styles.detailText}>{forecast[0]?.windSpeed} km/h</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.chartContainer}>
                {points.length > 1 ? (
                  <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                    <Defs>
                      <LinearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.4" />
                        <Stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
                      </LinearGradient>
                      <LinearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor="#00E676" />
                        <Stop offset="50%" stopColor={colors.accent} />
                        <Stop offset="100%" stopColor="#FF4500" />
                      </LinearGradient>
                    </Defs>
                    
                    <Path d={areaD} fill="url(#areaGradient)" />
                    <Path d={pathD} fill="none" stroke="url(#lineGradient)" strokeWidth="3" strokeLinecap="round" />
                    
                    {points.map((point, i) => (
                      <Circle
                        key={i}
                        cx={point.x}
                        cy={point.y}
                        r={i === 0 ? 6 : 0}
                        fill={colors.bg}
                        stroke={colors.accent}
                        strokeWidth="3"
                      />
                    ))}
                  </Svg>
                ) : (
                  <View style={styles.chartPlaceholder}>
                    <ActivityIndicator size="small" color={colors.accent} />
                  </View>
                )}
                
                {points.length > 1 && (
                  <View style={styles.timeLabels}>
                    {points.filter((_, i) => i % 3 === 0).map((point, i) => (
                      <Text key={i} style={styles.timeLabel}>{point.time}</Text>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.hourlyContainer}>
                <Text style={styles.sectionTitle}>24-Hour Forecast</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {forecast.map((hour, index) => (
                    <View
                      key={index}
                      style={[
                        styles.hourCard,
                        index === 0 && styles.currentHour,
                      ]}
                    >
                      <Text style={[styles.hourTime, index === 0 && styles.currentHourText]}>
                        {hour.time}
                      </Text>
                      {index === 0 && <View style={styles.nowDot} />}
                      <Text style={styles.hourEmoji}>{getWeatherEmoji(hour.condition)}</Text>
                      <Text style={[styles.hourTemp, index === 0 && styles.currentHourText]}>
                        {hour.temp}°
                      </Text>
                      {hour.precipitation > 0 && (
                        <Text style={styles.rainChance}>{hour.precipitation}mm</Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>Open-Meteo</Text>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
