import { ChevronLeft, ChevronRight, MapPin, Navigation, Timer } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useActivityStatus } from '../hooks/useActivityStatus';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme/colors';
import { addDays, dayKey, parseDayKey } from '../utils/dates';
import {
  computeActivityTimeline,
  formatCoord,
  formatDuration,
  type ActivitySegment,
} from '../utils/activityTimeline';

const MAX_DAYS_BACK = 7;

const MONTH_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];
const WEEKDAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function formatDayHeader(dk: string): string {
  const d = parseDayKey(dk);
  return `${WEEKDAY[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// ── Current status banner ────────────────────────────────────────────────────

function PulsingDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.4, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [scale]);

  return (
    <Animated.View
      style={{
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: color,
        transform: [{ scale }],
      }}
    />
  );
}

// ── Segment card ─────────────────────────────────────────────────────────────

type SegmentCardProps = {
  seg: ActivitySegment;
  isFirst: boolean;
  isLast: boolean;
};

function SegmentCard({ seg, isFirst, isLast }: SegmentCardProps) {
  const isWalking = seg.type === 'walking';
  const accent = isWalking ? colors.accent : colors.textMuted;
  const icon = isWalking ? '🚶' : '💺';
  const label = isWalking ? 'Walking' : 'Sitting / Still';
  const km = seg.distanceM / 1000;

  return (
    <View style={styles.segRow}>
      {/* Timeline line & dot */}
      <View style={styles.timelineCol}>
        <View style={[styles.timelineDot, { backgroundColor: accent, borderColor: accent }]} />
        {!isLast && <View style={[styles.timelineLine, { backgroundColor: isWalking ? colors.accent : colors.border }]} />}
      </View>

      {/* Card */}
      <View style={[styles.segCard, { borderColor: isWalking ? colors.accent + '40' : colors.border }]}>
        {/* Header row */}
        <View style={styles.segHeader}>
          <Text style={styles.segIcon}>{icon}</Text>
          <Text style={[styles.segType, { color: accent }]}>{label}</Text>
          <View style={styles.flex1} />
          <View style={[styles.durationBadge, { backgroundColor: isWalking ? colors.accent + '20' : colors.cardElevated }]}>
            <Timer size={11} color={accent} />
            <Text style={[styles.durationTxt, { color: accent }]}>{formatDuration(seg.durationSec)}</Text>
          </View>
        </View>

        {/* Time range */}
        <Text style={styles.segTime}>
          {formatTime(seg.startMs)} – {formatTime(seg.endMs)}
        </Text>

        {/* Stats */}
        <View style={styles.segStats}>
          {isWalking && seg.distanceM > 0 && (
            <View style={styles.segStatItem}>
              <Navigation size={12} color={colors.textMuted} />
              <Text style={styles.segStatTxt}>
                {km >= 1 ? `${km.toFixed(2)} km` : `${Math.round(seg.distanceM)} m`}
              </Text>
            </View>
          )}
          <View style={styles.segStatItem}>
            <Text style={styles.segStatDot}>·</Text>
            <Text style={styles.segStatTxt}>{seg.pointCount} GPS pts</Text>
          </View>
        </View>

        {/* Coordinates */}
        <View style={styles.coordRow}>
          <MapPin size={11} color={colors.border} />
          <Text style={styles.coordTxt}>
            {formatCoord(seg.startCoord.lat, seg.startCoord.lon)}
          </Text>
        </View>
        {!isLast && (
          <View style={[styles.coordRow, { marginTop: 2 }]}>
            <MapPin size={11} color={colors.textMuted} />
            <Text style={[styles.coordTxt, { color: colors.textMuted }]}>
              → {formatCoord(seg.endCoord.lat, seg.endCoord.lon)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export function DailyTimelineScreen() {
  const insets = useSafeAreaInsets();
  const sessions = useAppStore((s) => s.sessions);
  const history = useAppStore((s) => s.history);
  const activityStatus = useActivityStatus();

  const todayKey = dayKey();
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const isToday = selectedDay === todayKey;

  // Clamp navigation
  const canGoBack = selectedDay > addDays(todayKey, -MAX_DAYS_BACK);
  const canGoForward = selectedDay < todayKey;

  const navigateDay = (delta: number) => {
    setSelectedDay((prev) => {
      const next = addDays(prev, delta);
      if (delta < 0 && next < addDays(todayKey, -MAX_DAYS_BACK)) return prev;
      if (delta > 0 && next > todayKey) return prev;
      return next;
    });
  };

  // Compute timeline segments for the selected day
  const segments: ActivitySegment[] = useMemo(() => {
    const daySessions = sessions
      .filter((s) => s.dayKey === selectedDay)
      .sort((a, b) => a.startedAt - b.startedAt);

    if (daySessions.length === 0) return [];

    const allCoords = daySessions.flatMap((s) => s.coords);
    const startedAt = daySessions[0].startedAt;
    const endedAt = daySessions[daySessions.length - 1].endedAt;

    return computeActivityTimeline(allCoords, startedAt, endedAt);
  }, [sessions, selectedDay]);

  // Summary stats
  const dayHistory = history[selectedDay];
  const walkingSegs = segments.filter((s) => s.type === 'walking');
  const walkingTimeSec = walkingSegs.reduce((sum, s) => sum + s.durationSec, 0);
  const sittingSegs = segments.filter((s) => s.type === 'sitting');
  const sittingTimeSec = sittingSegs.reduce((sum, s) => sum + s.durationSec, 0);
  const totalDistM = walkingSegs.reduce((sum, s) => sum + s.distanceM, 0);

  // Current status display (only shown when viewing today)
  const statusColor =
    activityStatus === 'walking' ? colors.accent : activityStatus === 'sitting' ? colors.textMuted : colors.border;
  const statusLabel =
    activityStatus === 'walking' ? 'Walking' : activityStatus === 'sitting' ? 'Sitting / Still' : 'No recent data';
  const statusIcon =
    activityStatus === 'walking' ? '🚶' : activityStatus === 'sitting' ? '💺' : '📡';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
    >
      {/* ── Title ── */}
      <Text style={styles.title}>Daily Timeline</Text>

      {/* ── Day navigation ── */}
      <View style={styles.dayNav}>
        <TouchableOpacity
          style={[styles.navBtn, !canGoBack && styles.navBtnOff]}
          onPress={() => canGoBack && navigateDay(-1)}
          activeOpacity={canGoBack ? 0.7 : 1}
        >
          <ChevronLeft color={canGoBack ? colors.text : colors.border} size={22} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setSelectedDay(todayKey)} style={styles.dayLabelWrap}>
          <Text style={styles.dayLabel}>{formatDayHeader(selectedDay)}</Text>
          {isToday && <Text style={styles.todayBadge}>TODAY</Text>}
          {!isToday && (
            <Text style={styles.tapToToday}>tap to jump to today</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, !canGoForward && styles.navBtnOff]}
          onPress={() => canGoForward && navigateDay(1)}
          activeOpacity={canGoForward ? 0.7 : 1}
        >
          <ChevronRight color={canGoForward ? colors.text : colors.border} size={22} />
        </TouchableOpacity>
      </View>

      {/* ── Current status (today only) ── */}
      {isToday && (
        <View style={[styles.statusCard, { borderColor: statusColor }]}>
          <View style={styles.statusLeft}>
            <Text style={styles.statusIcon}>{statusIcon}</Text>
            <View>
              <Text style={styles.statusNow}>Right now</Text>
              <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
          <PulsingDot color={statusColor} />
        </View>
      )}

      {/* ── Day summary bar ── */}
      {dayHistory || segments.length > 0 ? (
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>
              {dayHistory ? dayHistory.steps.toLocaleString() : '0'}
            </Text>
            <Text style={styles.summaryLb}>steps</Text>
          </View>
          <View style={styles.summaryDiv} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>
              {totalDistM >= 1000
                ? `${(totalDistM / 1000).toFixed(2)} km`
                : `${Math.round(totalDistM)} m`}
            </Text>
            <Text style={styles.summaryLb}>walked</Text>
          </View>
          <View style={styles.summaryDiv} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: colors.accent }]}>
              {formatDuration(walkingTimeSec)}
            </Text>
            <Text style={styles.summaryLb}>moving</Text>
          </View>
          <View style={styles.summaryDiv} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: colors.textMuted }]}>
              {formatDuration(sittingTimeSec)}
            </Text>
            <Text style={styles.summaryLb}>still</Text>
          </View>
        </View>
      ) : null}

      {/* ── Segment count badges ── */}
      {segments.length > 0 && (
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { borderColor: colors.accent }]}>
            <Text style={[styles.badgeTxt, { color: colors.accent }]}>
              {walkingSegs.length} walk{walkingSegs.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={[styles.badge, { borderColor: colors.border }]}>
            <Text style={[styles.badgeTxt, { color: colors.textMuted }]}>
              {sittingSegs.length} stop{sittingSegs.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      )}

      {/* ── Timeline ── */}
      {segments.length > 0 ? (
        <View style={styles.timeline}>
          <Text style={styles.sectionLabel}>Activity log</Text>
          {segments.map((seg, idx) => (
            <SegmentCard
              key={`${seg.startMs}-${idx}`}
              seg={seg}
              isFirst={idx === 0}
              isLast={idx === segments.length - 1}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyTitle}>No data for this day</Text>
          <Text style={styles.emptySubtitle}>
            {isToday
              ? 'Enable background walking or start a workout to see your activity timeline.'
              : 'No GPS data was recorded on this day.'}
          </Text>
        </View>
      )}

      {/* ── Legend ── */}
      <View style={styles.legend}>
        <Text style={styles.legendTxt}>
          Timeline built from GPS coords sampled every ~1 min (day) / 10 min (night).
          Short segments (&lt;2 min) are merged with adjacent ones.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 16, gap: 14 },

  title: { color: colors.text, fontSize: 28, fontWeight: '800' },

  // Day navigation
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnOff: { opacity: 0.25 },
  dayLabelWrap: { alignItems: 'center', flex: 1 },
  dayLabel: { color: colors.text, fontWeight: '800', fontSize: 15 },
  todayBadge: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 3,
  },
  tapToToday: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 3,
    fontWeight: '600',
  },

  // Current status
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statusIcon: { fontSize: 32 },
  statusNow: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  statusLabel: { fontSize: 20, fontWeight: '900', marginTop: 2 },

  // Summary bar
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryVal: { color: colors.text, fontWeight: '900', fontSize: 16 },
  summaryLb: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 3 },
  summaryDiv: { width: 1, height: 34, backgroundColor: colors.border },

  // Badges
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: colors.card,
  },
  badgeTxt: { fontWeight: '800', fontSize: 12 },

  // Timeline
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  timeline: { gap: 0 },
  segRow: { flexDirection: 'row', gap: 12 },

  // Timeline spine
  timelineCol: { alignItems: 'center', width: 18, paddingTop: 18 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  timelineLine: { flex: 1, width: 2, marginTop: 4, marginBottom: 0, minHeight: 24 },

  // Segment card
  segCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  segHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  segIcon: { fontSize: 18 },
  segType: { fontWeight: '800', fontSize: 14 },
  flex1: { flex: 1 },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  durationTxt: { fontSize: 11, fontWeight: '800' },

  segTime: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 8 },

  segStats: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 },
  segStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  segStatDot: { color: colors.border, fontSize: 16 },
  segStatTxt: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },

  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  coordTxt: { color: colors.border, fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },

  // Empty state
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: colors.text, fontWeight: '800', fontSize: 18, textAlign: 'center' },
  emptySubtitle: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // Legend
  legend: {
    paddingTop: 4,
    paddingHorizontal: 4,
  },
  legendTxt: { color: colors.border, fontSize: 11, lineHeight: 18 },
});