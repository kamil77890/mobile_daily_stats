import { useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Car,
  Train,
  Footprints,
  Moon,
  Home,
  Clock,
} from 'lucide-react-native';

import { Card } from '../components/Card';
import { useThemeColors } from '../theme/ThemeContext';
import { useAppStore } from '../store/useAppStore';
import { addDays, dayKey, parseDayKey } from '../utils/dates';
import { pathLengthM } from '../utils/geo';
import { reverseGeocodePoint } from '../hooks/useReverseGeocode';
import {
  buildMasterBlocks,
  computeActivityTimeline,
  formatDuration,
  VEHICLE_SPEED_MPS,
} from '../utils/activityTimeline';
import type { Coord } from '../store/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type TimelineBlock = {
  id: string;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  startMs: number;
  endMs: number;
  type: 'sleeping' | 'stationary' | 'travel';
  locationLabel: string;
  address: string;
  distanceKm?: number;
  durationSec: number;
  avgSpeedKmh?: number;
  isVehicle: boolean;
  coords?: Coord[];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAY_START_MS = 0; // 00:00
const DAY_END_MS = MS_PER_DAY; // 24:00

// ─── Helpers ──────────────────────────────────────────────────────────────────

function msToTime(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function getDayStartMs(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function detectTravelType(avgSpeedKmh: number, maxSpeedKmh: number): { isVehicle: boolean; icon: 'car' | 'train' | 'walk' } {
  if (avgSpeedKmh > 10) {
    return {
      isVehicle: true,
      icon: maxSpeedKmh > 80 ? 'train' : 'car',
    };
  }
  return { isVehicle: false, icon: 'walk' };
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type Props = { navigation: any };

export function DailyTimelineScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const today = dayKey();
  const [selectedDate, setSelectedDate] = useState(today);
  const [blocks, setBlocks] = useState<TimelineBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalKm, setTotalKm] = useState(0);
  const [totalTravelMin, setTotalTravelMin] = useState(0);

  const sessions = useAppStore((s) => s.sessions);
  const history = useAppStore((s) => s.history);

  const sessionsRef = useRef(sessions);
  sessionsRef.current = sessions;

  const dayData = history[selectedDate];
  const isToday = selectedDate === today;

  // Build continuous timeline
  useEffect(() => {
    let cancelled = false;

    const buildTimeline = async () => {
      setLoading(true);
      setBlocks([]);
      setTotalKm(0);
      setTotalTravelMin(0);

      const dk = selectedDate;
      const daySessions = sessionsRef.current.filter((s) => s.dayKey === dk);
      if (daySessions.length === 0) {
        if (!cancelled) {
          setBlocks(generateEmptyDay());
          setLoading(false);
        }
        return;
      }

      // Collect all coords sorted by time
      const allCoords: Coord[] = [];
      for (const session of daySessions) {
        allCoords.push(...session.coords);
      }
      allCoords.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

      if (allCoords.length < 2) {
        if (!cancelled) {
          setBlocks(generateEmptyDay());
          setLoading(false);
        }
        return;
      }

      const dayStart = getDayStartMs(parseDayKey(dk));
      const firstCoord = allCoords[0];
      const lastCoord = allCoords[allCoords.length - 1];
      const sessionStart = firstCoord.timestamp ?? dayStart;
      const sessionEnd = lastCoord.timestamp ?? dayStart;

      // Compute activity timeline
      const segments = computeActivityTimeline(allCoords, sessionStart, sessionEnd);
      const masterBlocks = buildMasterBlocks(segments);

      // Convert to continuous timeline blocks
      const timelineBlocks: TimelineBlock[] = [];
      let currentMs = dayStart;

      // Gap before first GPS point → sleeping/stationary
      if (sessionStart > dayStart + 30 * 60 * 1000) {
        const sleepEnd = sessionStart;
        const loc = await reverseGeocodePoint(firstCoord.latitude, firstCoord.longitude);
        timelineBlocks.push({
          id: `sleep-${currentMs}`,
          startTime: msToTime(currentMs - dayStart),
          endTime: msToTime(sleepEnd - dayStart),
          startMs: currentMs,
          endMs: sleepEnd,
          type: 'sleeping',
          locationLabel: loc || 'Home',
          address: loc || '',
          durationSec: (sleepEnd - currentMs) / 1000,
          isVehicle: false,
        });
        currentMs = sleepEnd;
      }

      // Process each master block
      for (const block of masterBlocks) {
        // Fill gap before this block if any
        if (block.startMs > currentMs + 5 * 60 * 1000) {
          const loc = await reverseGeocodePoint(
            block.startCoord.lat,
            block.startCoord.lon,
          );
          timelineBlocks.push({
            id: `gap-${currentMs}`,
            startTime: msToTime(currentMs - dayStart),
            endTime: msToTime(block.startMs - dayStart),
            startMs: currentMs,
            endMs: block.startMs,
            type: 'stationary',
            locationLabel: loc || 'Unknown location',
            address: loc || '',
            durationSec: (block.startMs - currentMs) / 1000,
            isVehicle: false,
          });
        }

        // Create block from master
        const loc = await reverseGeocodePoint(
          block.centerCoord.lat,
          block.centerCoord.lon,
        );
        const travelInfo = detectTravelType(block.avgSpeedKmh, block.maxSpeedKmh);
        const distKm = block.distanceM / 1000;

        timelineBlocks.push({
          id: block.id,
          startTime: msToTime(block.startMs - dayStart),
          endTime: msToTime(block.endMs - dayStart),
          startMs: block.startMs,
          endMs: block.endMs,
          type: block.type === 'transit' ? 'travel' : 'stationary',
          locationLabel: travelInfo.isVehicle
            ? `${travelInfo.icon === 'car' ? '🚗' : '🚆'} Podróż`
            : loc || 'Unknown',
          address: loc || '',
          distanceKm: distKm > 0.05 ? distKm : undefined,
          durationSec: block.durationSec,
          avgSpeedKmh: block.avgSpeedKmh,
          isVehicle: travelInfo.isVehicle,
          coords: block.rawSegments.flatMap((s) => {
            // Reconstruct coords from segments if available
            return [];
          }),
        });

        currentMs = block.endMs;
      }

      // Gap after last GPS point to end of day → stationary at home
      if (currentMs < dayStart + MS_PER_DAY - 30 * 60 * 1000) {
        const lastLoc = await reverseGeocodePoint(
          lastCoord.latitude,
          lastCoord.longitude,
        );
        timelineBlocks.push({
          id: `end-${currentMs}`,
          startTime: msToTime(currentMs - dayStart),
          endTime: '23:59',
          startMs: currentMs,
          endMs: dayStart + MS_PER_DAY,
          type: 'stationary',
          locationLabel: lastLoc || 'Home',
          address: lastLoc || '',
          durationSec: (dayStart + MS_PER_DAY - currentMs) / 1000,
          isVehicle: false,
        });
      }

      // Calculate totals
      let km = 0;
      let travelMin = 0;
      for (const b of timelineBlocks) {
        if (b.distanceKm) km += b.distanceKm;
        if (b.type === 'travel') travelMin += b.durationSec / 60;
      }

      if (!cancelled) {
        setBlocks(timelineBlocks);
        setTotalKm(km);
        setTotalTravelMin(travelMin);
        setLoading(false);
      }
    };

    buildTimeline();
    return () => { cancelled = true; };
  }, [selectedDate]);

  const handleDayChange = (delta: number) => {
    const d = parseDayKey(selectedDate);
    d.setDate(d.getDate() + delta);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (d <= todayStart) {
      setSelectedDate(dayKey(d));
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingBottom: 32, paddingHorizontal: 16, paddingTop: insets.top + 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { color: colors.text, fontSize: 28, fontWeight: '800' },
    dateText: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
    navButtons: { flexDirection: 'row', gap: 8 },
    navButton: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.cardElevated,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: colors.border,
    },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    statBox: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    statValue: { fontSize: 18, fontWeight: '900', color: colors.accent },
    statLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 4 },
    timeline: { gap: 0 },
    blockRow: { flexDirection: 'row', alignItems: 'stretch' },
    timeColumn: { width: 52, paddingRight: 12, alignItems: 'flex-end', justifyContent: 'flex-start', paddingTop: 14 },
    timeText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
    timeEndText: { color: colors.textMuted, fontSize: 10, fontWeight: '400', marginTop: 2 },
    lineColumn: { width: 24, alignItems: 'center', paddingTop: 14 },
    dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
    line: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4 },
    lineEnd: { width: 2, height: 20, backgroundColor: colors.border, marginTop: 4 },
    card: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTravel: {
      flex: 1,
      borderRadius: 16,
      padding: 14,
      marginBottom: 8,
      borderWidth: 2,
    },
    cardSleep: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      opacity: 0.7,
    },
    blockHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    blockIcon: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
    },
    blockInfo: { flex: 1 },
    blockTitle: { fontSize: 15, fontWeight: '700' },
    blockAddress: { fontSize: 12, marginTop: 2 },
    blockMetrics: { flexDirection: 'row', gap: 16, marginTop: 8 },
    metric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metricText: { fontSize: 13, fontWeight: '600' },
    metricLabel: { fontSize: 10, fontWeight: '600' },
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { color: colors.textMuted, fontSize: 14, marginTop: 12, textAlign: 'center' },
    todayButton: {
      marginTop: 20,
      backgroundColor: colors.accent,
      paddingVertical: 14,
      borderRadius: 999,
      alignItems: 'center',
    },
    todayButtonText: { color: colors.bg, fontSize: 14, fontWeight: '800' },
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Timeline</Text>
          <Text style={styles.dateText}>
            {parseDayKey(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <View style={styles.navButtons}>
          <TouchableOpacity
            style={[styles.navButton, selectedDate >= today && { opacity: 0.4 }]}
            onPress={() => handleDayChange(-1)}
            disabled={selectedDate >= today}
            activeOpacity={0.7}
          >
            <ChevronLeft color={selectedDate >= today ? colors.textMuted : colors.text} size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, selectedDate >= today && { opacity: 0.4 }]}
            onPress={() => handleDayChange(1)}
            disabled={selectedDate >= today}
            activeOpacity={0.7}
          >
            <ChevronRight color={selectedDate >= today ? colors.textMuted : colors.text} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      {dayData && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{(dayData.distanceM / 1000).toFixed(2)}</Text>
            <Text style={styles.statLabel}>km today</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{dayData.steps?.toLocaleString() ?? 0}</Text>
            <Text style={styles.statLabel}>steps</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalKm.toFixed(2)}</Text>
            <Text style={styles.statLabel}>travel km</Text>
          </View>
        </View>
      )}

      {/* Timeline */}
      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.emptyText}>Loading timeline...</Text>
        </View>
      ) : blocks.length === 0 ? (
        <View style={styles.emptyState}>
          <Moon color={colors.textMuted} size={48} />
          <Text style={styles.emptyText}>No data for this day.{'\n'}Your timeline will appear here.</Text>
        </View>
      ) : (
        <View style={styles.timeline}>
          {blocks.map((block, index) => {
            const isLast = index === blocks.length - 1;
            const travelInfo = block.isVehicle
              ? detectTravelType(block.avgSpeedKmh ?? 0, block.avgSpeedKmh ?? 0)
              : null;

            let cardStyle = styles.card;
            let iconBg = colors.accent + '22';
            let iconColor = colors.accent;
            let IconComponent = MapPin;

            if (block.type === 'sleeping') {
              cardStyle = styles.cardSleep;
              iconBg = colors.textMuted + '22';
              iconColor = colors.textMuted;
              IconComponent = Moon;
            } else if (block.type === 'travel') {
              cardStyle = { ...styles.cardTravel, borderColor: colors.accent as any, backgroundColor: (colors.accent + '11') as any };
              iconBg = (colors.accent + '33') as any;
              iconColor = colors.accent;
              IconComponent = travelInfo?.icon === 'train' ? Train : Car;
            }

            return (
              <View key={block.id} style={styles.blockRow}>
                {/* Time column */}
                <View style={styles.timeColumn}>
                  <Text style={styles.timeText}>{block.startTime}</Text>
                  <Text style={styles.timeEndText}>{block.endTime}</Text>
                </View>

                {/* Line column */}
                <View style={styles.lineColumn}>
                  <View style={[styles.dot, { backgroundColor: iconColor, borderColor: iconBg }]} />
                  {!isLast && <View style={styles.line} />}
                </View>

                {/* Card */}
                <View style={cardStyle}>
                  <View style={styles.blockHeader}>
                    <View style={[styles.blockIcon, { backgroundColor: iconBg }]}>
                      <IconComponent color={iconColor} size={18} />
                    </View>
                    <View style={styles.blockInfo}>
                      <Text style={[styles.blockTitle, { color: block.type === 'sleeping' ? colors.textMuted : colors.text }]}>
                        {block.locationLabel}
                      </Text>
                      {block.address && block.type !== 'travel' && (
                        <Text style={[styles.blockAddress, { color: colors.textMuted }]} numberOfLines={1}>
                          {block.address}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Travel metrics */}
                  {block.type === 'travel' && (
                    <View style={styles.blockMetrics}>
                      {block.distanceKm && (
                        <View style={styles.metric}>
                          <MapPin color={colors.accent} size={14} />
                          <Text style={[styles.metricText, { color: colors.accent }]}>{block.distanceKm.toFixed(2)} km</Text>
                        </View>
                      )}
                      <View style={styles.metric}>
                        <Clock color={colors.accent} size={14} />
                        <Text style={[styles.metricText, { color: colors.accent }]}>{formatDuration(block.durationSec)}</Text>
                      </View>
                      {block.avgSpeedKmh && block.avgSpeedKmh > 5 && (
                        <View style={styles.metric}>
                          <Car color={colors.accent} size={14} />
                          <Text style={[styles.metricText, { color: colors.accent }]}>{Math.round(block.avgSpeedKmh)} km/h</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Stationary duration */}
                  {block.type === 'stationary' && (
                    <View style={styles.blockMetrics}>
                      <View style={styles.metric}>
                        <Clock color={colors.textMuted} size={14} />
                        <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{formatDuration(block.durationSec)}</Text>
                      </View>
                    </View>
                  )}

                  {/* Sleeping duration */}
                  {block.type === 'sleeping' && (
                    <View style={styles.blockMetrics}>
                      <View style={styles.metric}>
                        <Moon color={colors.textMuted} size={14} />
                        <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{formatDuration(block.durationSec)}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Today button */}
      {!isToday && (
        <TouchableOpacity style={styles.todayButton} onPress={() => setSelectedDate(today)}>
          <Text style={styles.todayButtonText}>Go to Today</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function generateEmptyDay(): TimelineBlock[] {
  return [
    {
      id: 'empty-sleep',
      startTime: '00:00',
      endTime: '23:59',
      startMs: 0,
      endMs: 24 * 60 * 60 * 1000,
      type: 'sleeping',
      locationLabel: 'No data',
      address: '',
      durationSec: 24 * 60 * 60,
      isVehicle: false,
    },
  ];
}
