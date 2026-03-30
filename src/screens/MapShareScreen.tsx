import { ChevronLeft, Share2 } from 'lucide-react-native';
import { useMemo, useRef } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot, { captureRef } from 'react-native-view-shot';

import { useAppStore } from '../store/useAppStore';
import type { Coord } from '../store/types';
import { colors } from '../theme/colors';
import { dayKey } from '../utils/dates';
import { kcalFromWalk, regionForCoords } from '../utils/geo';
import { findMovementPauses, formatPauseRange } from '../utils/pauseDetection';

type Props = { navigation: { goBack: () => void } };

/** Returns intermediate waypoints spaced at least `intervalMs` apart (excludes first/last) */
function getRouteWaypoints(coords: Coord[], intervalMs = 15000): Coord[] {
  if (coords.length < 3) return [];
  const points: Coord[] = [];
  let lastT = (coords[0].timestamp ?? 0) - 1;
  for (let i = 1; i < coords.length - 1; i++) {
    const t = coords[i].timestamp ?? 0;
    if (t - lastT >= intervalMs) {
      points.push(coords[i]);
      lastT = t;
    }
  }
  return points;
}

export function MapShareScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const shotRef = useRef<ViewShot>(null);
  const dk = dayKey();
  const sessions = useAppStore((s) => s.sessions);
  const history = useAppStore((s) => s.history);

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

  const region = useMemo(() => regionForCoords(mergedCoords), [mergedCoords]);
  const km = today.distanceM / 1000;
  const msg = [
    `Walk today — ${dk}`,
    `Steps: ${today.steps}`,
    `Distance: ${km.toFixed(2)} km (${Math.round(today.distanceM)} m)`,
    `Calories (est.): ${kcalFromWalk(km, today.steps)} kcal`,
    `Incline: ${Math.round(today.inclineM)} m`,
  ].join('\n');

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
    return findMovementPauses(mergedCoords, daySessions[0].startedAt, daySessions[daySessions.length - 1].endedAt);
  }, [daySessions, mergedCoords]);

  /** 15-second waypoint dots */
  const waypoints = useMemo(() => getRouteWaypoints(mergedCoords, 15_000), [mergedCoords]);

  const share = async () => {
    try {
      const uri = await captureRef(shotRef, {
        format: 'png',
        quality: 0.92,
        result: 'tmpfile',
      });
      await Share.share({
        title: 'My walk',
        message: msg,
        url: uri,
      });
    } catch {
      Alert.alert('Share', 'Could not capture or share. Try again after the map renders.');
    }
  };

  const hasRoute = mergedCoords.length > 1;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color={colors.text} size={26} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Today's map</Text>
        <View style={{ width: 44 }} />
      </View>

      <ViewShot ref={shotRef} style={styles.shot} options={{ format: 'png', quality: 0.9 }}>
        <View style={styles.shotInner}>
          <View style={styles.mapBox} collapsable={false}>
            {hasRoute ? (
              <MapView style={StyleSheet.absoluteFill} initialRegion={region} mapType="standard">
                {daySessions.map((s) => (
                  <Polyline
                    key={s.id}
                    coordinates={s.coords}
                    strokeColor={colors.routeLine}
                    strokeWidth={5}
                    lineJoin="round"
                  />
                ))}
                {waypoints.map((wp, idx) => (
                  <Marker
                    key={`wp-${idx}`}
                    coordinate={wp}
                    anchor={{ x: 0.5, y: 0.5 }}
                    tracksViewChanges={false}
                  >
                    <View style={styles.waypointDot} />
                  </Marker>
                ))}
                {startEnd ? (
                  <>
                    <Marker coordinate={startEnd.start} title="Start" pinColor={colors.markerStart} />
                    <Marker coordinate={startEnd.end} title="End" pinColor={colors.markerEnd} />
                  </>
                ) : null}
              </MapView>
            ) : (
              <View style={styles.fallback}>
                <Text style={styles.fallbackTxt}>No GPS path yet. Enable background walking or start a workout.</Text>
              </View>
            )}
          </View>
          <ScrollView style={styles.sheetScroll} nestedScrollEnabled>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Today</Text>
              <View style={styles.grid}>
                <Stat label="Calories" value={`${kcalFromWalk(km, today.steps)}`} />
                <Stat label="Steps" value={`${today.steps}`} />
                <Stat label="KM" value={km.toFixed(2)} />
                <Stat label="Meters" value={`${Math.round(today.distanceM)}`} />
                <Stat label="Incline" value={`${Math.round(today.inclineM)} m`} />
              </View>
              {pauses.length > 0 ? (
                <View style={styles.pauseBlock}>
                  <Text style={styles.pauseHead}>Stops (slow / still)</Text>
                  {pauses.map((p, i) => (
                    <Text key={`${p.startMs}-${i}`} style={styles.pauseLine}>
                      {formatPauseRange(p.startMs)} – {formatPauseRange(p.endMs)}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </ViewShot>

      <TouchableOpacity style={styles.shareBtn} onPress={() => void share()}>
        <Share2 color={colors.accent} size={22} />
        <Text style={styles.shareTxt}>Share stats + map image</Text>
      </TouchableOpacity>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLb}>{label}</Text>
      <Text style={styles.statVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { color: colors.text, fontWeight: '800' },
  shot: { flex: 1, borderRadius: 22, overflow: 'hidden', marginBottom: 12 },
  shotInner: { flex: 1 },
  mapBox: { height: 280, backgroundColor: colors.card },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  fallbackTxt: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  waypointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.routeLine,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  sheetScroll: { maxHeight: 220 },
  sheet: {
    backgroundColor: colors.card,
    padding: 16,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetTitle: { color: colors.accent, fontWeight: '900', fontSize: 18, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { width: '30%', minWidth: 90 },
  statLb: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  statVal: { color: colors.text, fontWeight: '900', marginTop: 4 },
  pauseBlock: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderColor: colors.border },
  pauseHead: { color: colors.text, fontWeight: '800', marginBottom: 8 },
  pauseLine: { color: colors.textMuted, marginBottom: 4, fontSize: 13 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.accent,
    marginBottom: 16,
  },
  shareTxt: { color: colors.accent, fontWeight: '900', fontSize: 16 },
});