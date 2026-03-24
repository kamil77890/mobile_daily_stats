import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Settings2 } from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../components/Card';
import { DonutGoal } from '../components/DonutGoal';
import { WeeklyBars } from '../components/WeeklyBars';
import type { RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme/colors';
import { dayKey, lastNDayKeys, parseDayKey } from '../utils/dates';
import { kcalFromWalk, regionForCoords } from '../utils/geo';
import { findMovementPauses, formatPauseRange } from '../utils/pauseDetection';

const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const parent = navigation.getParent() as NativeStackNavigationProp<RootStackParamList> | undefined;
  const dk = dayKey();
  const history = useAppStore((s) => s.history);
  const sessions = useAppStore((s) => s.sessions);
  const dailyGoalKm = useAppStore((s) => s.dailyGoalKm);
  const dailyGoalCalories = useAppStore((s) => s.dailyGoalCalories);

  const today = history[dk] ?? {
    steps: 0,
    distanceM: 0,
    kcal: 0,
    inclineM: 0,
    goalMet: false,
  };

  const daySessions = useMemo(
    () => [...sessions].filter((s) => s.dayKey === dk).sort((a, b) => a.startedAt - b.startedAt),
    [sessions, dk],
  );

  const mergedCoords = useMemo(() => daySessions.flatMap((s) => s.coords), [daySessions]);

  const mapRegion = useMemo(() => regionForCoords(mergedCoords), [mergedCoords]);

  const startEnd = useMemo(() => {
    if (!daySessions.length) return null;
    const first = daySessions[0].coords[0];
    const lastS = daySessions[daySessions.length - 1];
    const last = lastS.coords[lastS.coords.length - 1];
    if (!first || !last) return null;
    return { start: first, end: last };
  }, [daySessions]);

  const pauses = useMemo(() => {
    if (daySessions.length === 0 || mergedCoords.length < 3) return [];
    const t0 = daySessions[0].startedAt;
    const t1 = daySessions[daySessions.length - 1].endedAt;
    return findMovementPauses(mergedCoords, t0, t1);
  }, [daySessions, mergedCoords]);

  const weekKeys = useMemo(() => lastNDayKeys(7), []);
  const weekKm = weekKeys.map((k) => (history[k]?.distanceM ?? 0) / 1000);
  const weekLabels = weekKeys.map((k) => WD[parseDayKey(k).getDay()]);
  const maxWeek = Math.max(...weekKm, dailyGoalKm);

  const todayKm = today.distanceM / 1000;
  const calProgress = Math.min(1, kcalFromWalk(todayKm, today.steps) / Math.max(dailyGoalCalories, 1));
  const burnKcal = kcalFromWalk(todayKm, today.steps);
  const remainingCal = Math.max(0, dailyGoalCalories - burnKcal);

  const hasRoute = mergedCoords.length > 1;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Summary</Text>
          <Text style={styles.muted}>Today's movement</Text>
        </View>
        <TouchableOpacity style={styles.gear} onPress={() => parent?.navigate('Goals')}>
          <Settings2 color={colors.accent} size={22} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={() => parent?.navigate('MapShare')}>
        <Card style={styles.mapCard}>
          <View style={styles.mapWrap}>
            {hasRoute ? (
              <MapView style={StyleSheet.absoluteFill} initialRegion={mapRegion} scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false} mapType="standard">
                {daySessions.map((s) => (
                  <Polyline
                    key={s.id}
                    coordinates={s.coords}
                    strokeColor={colors.routeLine}
                    strokeWidth={5}
                    lineJoin="round"
                  />
                ))}
                {startEnd ? (
                  <>
                    <Marker coordinate={startEnd.start} title="Start" pinColor={colors.markerStart} />
                    <Marker coordinate={startEnd.end} title="End" pinColor={colors.markerEnd} />
                  </>
                ) : null}
              </MapView>
            ) : (
              <View style={styles.mapEmpty}>
                <Text style={styles.mapEmptyTxt}>Move with location on to draw today's route</Text>
              </View>
            )}
          </View>
          <View style={styles.mapStats}>
            <Text style={styles.statLine}>
              STEPS: <Text style={styles.statVal}>{today.steps.toLocaleString()}</Text>
            </Text>
            <Text style={styles.statLine}>
              DISTANCE: <Text style={styles.statVal}>{todayKm.toFixed(1)} km</Text>
            </Text>
            <Text style={styles.statLine}>
              CALORIES: <Text style={styles.statVal}>{burnKcal} kcal</Text>
            </Text>
            <Text style={styles.mapHint}>Tap for full map & share</Text>
          </View>
        </Card>
      </TouchableOpacity>

      {pauses.length > 0 ? (
        <Card>
          <Text style={styles.pauseTitle}>Stops today (slow / still)</Text>
          {pauses.map((p, i) => (
            <Text key={`${p.startMs}-${i}`} style={styles.pauseRow}>
              {formatPauseRange(p.startMs)} – {formatPauseRange(p.endMs)}
            </Text>
          ))}
        </Card>
      ) : null}

      <Card style={styles.rowCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.muted2}>GOALS (KM)</Text>
          <Text style={styles.rowBig}>{dailyGoalKm.toFixed(1)}</Text>
          <Text style={styles.muted2}>BURNED (EST.)</Text>
          <Text style={styles.rowBig}>{burnKcal}</Text>
          <Text style={styles.muted2}>TARGET CAL</Text>
          <Text style={styles.rowBig}>{dailyGoalCalories.toLocaleString()}</Text>
        </View>
        <DonutGoal
          progress={calProgress}
          centerLabel={`${remainingCal}`}
          subLabel="CAL REMAINING"
        />
      </Card>

      <Card>
        <View style={styles.weekHead}>
          <Text style={styles.cardTitle}>Weekly distance</Text>
          <Text style={styles.muted}>LAST 7 DAYS</Text>
        </View>
        <WeeklyBars labels={weekLabels} values={weekKm} goalKm={dailyGoalKm} maxVal={maxWeek} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: 32, paddingHorizontal: 16, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  muted: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  muted2: { color: colors.textMuted, fontSize: 11, marginTop: 10, fontWeight: '700' },
  gear: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapCard: { padding: 0, overflow: 'hidden' },
  mapWrap: { height: 180, width: '100%', backgroundColor: colors.bg },
  mapEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  mapEmptyTxt: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  mapStats: { padding: 16, gap: 4 },
  statLine: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  statVal: { color: colors.accent },
  mapHint: { color: colors.accent, fontSize: 12, marginTop: 8, fontWeight: '700' },
  pauseTitle: { color: colors.text, fontWeight: '800', marginBottom: 8, fontSize: 15 },
  pauseRow: { color: colors.textMuted, marginBottom: 4, fontSize: 13 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBig: { color: colors.text, fontSize: 22, fontWeight: '800' },
  weekHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
});
