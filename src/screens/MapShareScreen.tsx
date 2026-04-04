import { ChevronLeft, Share2 } from 'lucide-react-native';
import { useMemo, useRef } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot, { captureRef } from 'react-native-view-shot';

import { useAppStore } from '../store/useAppStore';
import type { Coord } from '../store/types';
import { useThemeColors } from '../theme/ThemeContext';
import { darkMapStyle } from '../theme/mapStyle';
import { buildColoredPolylines } from '../utils/activityTimeline';
import { dayKey } from '../utils/dates';
import { kcalFromWalk, regionForCoords } from '../utils/geo';
import { findMovementPauses, formatPauseRange } from '../utils/pauseDetection';

type Props = { navigation: { goBack: () => void } };

function StartDot() {
  const colors = useThemeColors();
  return (
    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.markerStart, borderWidth: 2, borderColor: '#fff' }} />
  );
}
function EndDot() {
  const colors = useThemeColors();
  return (
    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.markerEnd, borderWidth: 2, borderColor: '#fff' }} />
  );
}

function getWaypoints(coords: Coord[], intervalMs = 15_000): Coord[] {
  if (coords.length < 3) return [];
  const pts: Coord[] = [];
  let lastT = (coords[0].timestamp ?? 0) - 1;
  for (let i = 1; i < coords.length - 1; i++) {
    const t = coords[i].timestamp ?? 0;
    if (t - lastT >= intervalMs) { pts.push(coords[i]); lastT = t; }
  }
  return pts;
}

export function MapShareScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const insets  = useSafeAreaInsets();
  const shotRef = useRef<ViewShot>(null);
  const dk      = dayKey();
  const sessions = useAppStore(s => s.sessions);
  const history  = useAppStore(s => s.history);

  const today = history[dk] ?? { steps: 0, distanceM: 0, kcal: 0, inclineM: 0, goalMet: false };

  const daySessions = useMemo(
    () => [...sessions].filter(s => s.dayKey === dk).sort((a, b) => a.startedAt - b.startedAt),
    [sessions, dk],
  );
  const mergedCoords = useMemo(() => daySessions.flatMap(s => s.coords), [daySessions]);
  const region       = useMemo(() => regionForCoords(mergedCoords), [mergedCoords]);
  const waypoints    = useMemo(() => getWaypoints(mergedCoords), [mergedCoords]);

  const km  = today.distanceM / 1000;
  const msg = [
    `Walk — ${dk}`,
    `Steps: ${today.steps}`,
    `Distance: ${km.toFixed(2)} km`,
    `Calories: ${kcalFromWalk(km, today.steps)} kcal`,
    `Incline: ${Math.round(today.inclineM)} m`,
  ].join('\n');

  const startEnd = useMemo(() => {
    if (!daySessions.length) return null;
    const first = daySessions[0].coords[0];
    const lastS = daySessions[daySessions.length - 1];
    const last  = lastS.coords[lastS.coords.length - 1];
    return first && last ? { start: first, end: last } : null;
  }, [daySessions]);

  const pauses   = useMemo(() => {
    if (daySessions.length === 0 || mergedCoords.length < 3) return [];
    return findMovementPauses(mergedCoords, daySessions[0].startedAt, daySessions[daySessions.length - 1].endedAt);
  }, [daySessions, mergedCoords]);

  const hasRoute = mergedCoords.length > 1;

  const styles = StyleSheet.create({
    root: { flex: 1, paddingHorizontal: 16 },
    top:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    topTitle: { fontWeight: '800' },

    shot:      { flex: 1, borderRadius: 22, overflow: 'hidden', marginBottom: 12 },
    shotInner: { flex: 1 },
    mapBox:    { height: 290, backgroundColor: '#111' },
    fallback:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    fallbackTxt: { textAlign: 'center', lineHeight: 20 },

    waypointDot: { width: 7, height: 7, borderRadius: 3.5, opacity: 0.8 },

    sheetScroll: { maxHeight: 240 },
    sheet:       { padding: 16, borderTopWidth: 1 },
    sheetTitle:  { fontWeight: '900', fontSize: 18, marginBottom: 8 },

    legendRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendLine: { width: 20, height: 3, borderRadius: 2 },
    legendTxt:  { fontSize: 11, fontWeight: '600' },

    grid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    stat:   { width: '30%', minWidth: 90 },
    statLb: { fontSize: 11, fontWeight: '700' },
    statVal: { fontWeight: '900', marginTop: 4 },

    pauseBlock: { marginTop: 14, paddingTop: 12, borderTopWidth: 1 },
    pauseHead:  { fontWeight: '800', marginBottom: 8 },
    pauseLine:  { marginBottom: 4, fontSize: 13 },

    shareBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 10, paddingVertical: 16, borderRadius: 999,
      borderWidth: 2, marginBottom: 16,
    },
    shareTxt: { fontWeight: '900', fontSize: 16 },
  });

  const share = async () => {
    try {
      const uri = await captureRef(shotRef, { format: 'png', quality: 0.92, result: 'tmpfile' });
      await Share.share({ title: 'My walk', message: msg, url: uri });
    } catch {
      Alert.alert('Share', 'Could not capture. Try again after map renders.');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.top}>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.cardElevated }]} onPress={() => navigation.goBack()}>
          <ChevronLeft color={colors.text} size={26} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.text }]}>Today's map</Text>
        <View style={{ width: 44 }} />
      </View>

      <ViewShot ref={shotRef} style={styles.shot} options={{ format: 'png', quality: 0.9 }}>
        <View style={styles.shotInner}>
          <View style={styles.mapBox} collapsable={false}>
            {hasRoute ? (
              <MapView
                style={StyleSheet.absoluteFill}
                initialRegion={region}
                customMapStyle={darkMapStyle}
                userInterfaceStyle="dark"
              >
                {daySessions.map(s => {
                  const segs = buildColoredPolylines(s.coords, s.startedAt, s.endedAt);
                  return segs.map((seg, idx) => (
                    <Polyline
                      key={`${s.id}-${idx}`}
                      coordinates={seg.coords}
                      strokeColor={seg.color}
                      strokeWidth={seg.strokeWidth}
                      lineJoin="round"
                      lineCap="round"
                    />
                  ));
                })}
                {waypoints.map((wp, idx) => (
                  <Marker key={`wp-${idx}`} coordinate={wp} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                    <View style={[styles.waypointDot, { backgroundColor: colors.routeLine }]} />
                  </Marker>
                ))}
                {startEnd && (
                  <>
                    <Marker coordinate={{ latitude: startEnd.start.latitude, longitude: startEnd.start.longitude }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                      <StartDot />
                    </Marker>
                    <Marker coordinate={{ latitude: startEnd.end.latitude, longitude: startEnd.end.longitude }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
                      <EndDot />
                    </Marker>
                  </>
                )}
              </MapView>
            ) : (
              <View style={styles.fallback}>
                <Text style={[styles.fallbackTxt, { color: colors.textMuted }]}>No GPS path yet.</Text>
              </View>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetScroll} nestedScrollEnabled>
            <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text selectable style={[styles.sheetTitle, { color: colors.accent }]}>Today</Text>

              {hasRoute && (
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendLine, { backgroundColor: colors.routeLine }]} />
                    <Text style={[styles.legendTxt, { color: colors.textMuted }]}>Walking</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendLine, { backgroundColor: colors.routeVehicle }]} />
                    <Text style={[styles.legendTxt, { color: colors.textMuted }]}>Vehicle &gt;10 km/h</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.markerStart, borderWidth: 1.5, borderColor: '#fff' }} />
                    <Text style={[styles.legendTxt, { color: colors.textMuted }]}>Start</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.markerEnd, borderWidth: 1.5, borderColor: '#fff' }} />
                    <Text style={[styles.legendTxt, { color: colors.textMuted }]}>End</Text>
                  </View>
                </View>
              )}

              <View style={styles.grid}>
                {([
                  ['Calories', `${kcalFromWalk(km, today.steps)}`],
                  ['Steps',    `${today.steps}`],
                  ['KM',        km.toFixed(2)],
                  ['Meters',   `${Math.round(today.distanceM)}`],
                  ['Incline',  `${Math.round(today.inclineM)} m`],
                ] as [string, string][]).map(([label, value]) => (
                  <View key={label} style={styles.stat}>
                    <Text style={[styles.statLb, { color: colors.textMuted }]}>{label}</Text>
                    <Text selectable style={[styles.statVal, { color: colors.text }]}>{value}</Text>
                  </View>
                ))}
              </View>

              {pauses.length > 0 && (
                <View style={[styles.pauseBlock, { borderColor: colors.border }]}>
                  <Text style={[styles.pauseHead, { color: colors.text }]}>Stops (slow / still)</Text>
                  {pauses.map((p, i) => (
                    <Text selectable key={`${p.startMs}-${i}`} style={[styles.pauseLine, { color: colors.textMuted }]}>
                      {formatPauseRange(p.startMs)} – {formatPauseRange(p.endMs)}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </ViewShot>

      <TouchableOpacity style={[styles.shareBtn, { borderColor: colors.accent }]} onPress={() => void share()}>
        <Share2 color={colors.accent} size={22} />
        <Text style={[styles.shareTxt, { color: colors.accent }]}>Share stats + map image</Text>
      </TouchableOpacity>
    </View>
  );
}