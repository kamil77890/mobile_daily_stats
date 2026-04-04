import type { RouteProp } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Alert, Modal, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';

import type { RootStackParamList } from '../navigation/types';
import { EXERCISE_TYPES } from '../store/types';
import { BG_WALK_PREFIX, useAppStore } from '../store/useAppStore';
import { useThemeColors } from '../theme/ThemeContext';
import { darkMapStyle } from '../theme/mapStyle';
import { buildColoredPolylines } from '../utils/activityTimeline';
import { regionForCoords } from '../utils/geo';

type Props = {
  navigation: { goBack: () => void };
  route: RouteProp<RootStackParamList, 'SessionEdit'>;
};

// ─── Custom dot markers ───────────────────────────────────────────────────────

function StartDot() {
  const colors = useThemeColors();
  return (
    <View style={{
      width: 18, height: 18, borderRadius: 9,
      backgroundColor: colors.markerStart,
      borderWidth: 2.5, borderColor: '#ffffff',
    }} />
  );
}

function EndDot() {
  const colors = useThemeColors();
  return (
    <View style={{
      width: 18, height: 18, borderRadius: 9,
      backgroundColor: colors.markerEnd,
      borderWidth: 2.5, borderColor: '#ffffff',
    }} />
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function SessionEditScreen({ navigation, route }: Props) {
  const colors = useThemeColors();
  const insets  = useSafeAreaInsets();
  const id      = route.params.sessionId;
  const sessions = useAppStore(s => s.sessions);
  const updateSessionExercise = useAppStore(s => s.updateSessionExercise);
  const deleteSession = useAppStore(s => s.deleteSession);

  const session = useMemo(() => sessions.find(s => s.id === id), [sessions, id]);
  const [pickOpen, setPickOpen] = useState(false);

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }}>
        <Text selectable style={{ fontSize: 16, color: colors.text, marginBottom: 16 }}>Workout not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 14, color: colors.accent, fontWeight: '700' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const region   = regionForCoords(session.coords);
  const km       = session.distanceM / 1000;
  const kcal     = Math.round(km * 55);
  const isBg     = session.id.startsWith(BG_WALK_PREFIX);
  const hasRoute = session.coords.length > 1;

  const coloredLines = useMemo(
    () => buildColoredPolylines(session.coords, session.startedAt, session.endedAt),
    [session],
  );

  const firstCoord = session.coords[0];
  const lastCoord  = session.coords[session.coords.length - 1];

  const styles = StyleSheet.create({
    scroll:  { flex: 1 },
    content: { paddingHorizontal: 16, gap: 10 },
    miss:    { flex: 1, padding: 24 },
    missTxt: { marginBottom: 12 },
    link:    { fontWeight: '800' },

    top:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconBtn:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    topTitle: { fontWeight: '800' },

    mapBox:    { height: 240, borderRadius: 20, overflow: 'hidden', backgroundColor: '#111' },
    mapEmpty:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
    mapEmptyTxt: { textAlign: 'center' },

    legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 2 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendLine: { width: 22, height: 3, borderRadius: 2 },
    markerDotLegend: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: '#fff' },
    legendTxt: { fontSize: 11, fontWeight: '600' },

    type:    { fontWeight: '900', fontSize: 22, marginTop: 4 },
    change:  { alignSelf: 'flex-start' },
    changeTxt: { fontWeight: '700' },
    bgNote:  { marginTop: 6, lineHeight: 20 },

    stats:   { marginTop: 8, gap: 6 },
    row:     { fontWeight: '600' },

    del: { marginTop: 20, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
    delTxt: { fontWeight: '800' },

    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 24 },
    modalCard: { borderRadius: 20, padding: 16, borderWidth: 1 },
    modalTitle:     { fontWeight: '900', fontSize: 18, marginBottom: 12 },
    modalRow:       { paddingVertical: 12, borderBottomWidth: 1 },
    modalRowTxt:    { fontWeight: '700', fontSize: 16 },
    modalRowActive: {},
  });

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={[styles.scroll, { backgroundColor: colors.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 40 }]}
    >
      {/* Header */}
      <View style={styles.top}>
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.cardElevated }]} onPress={() => navigation.goBack()}>
          <ChevronLeft color={colors.text} size={26} />
        </TouchableOpacity>
        <Text selectable style={[styles.topTitle, { color: colors.text }]}>Edit workout</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Map – dark style + vivid polylines + custom dots */}
      <View style={styles.mapBox}>
        {hasRoute ? (
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={region}
            scrollEnabled={false}
            customMapStyle={darkMapStyle}
            userInterfaceStyle="dark"
          >
            {coloredLines.map((seg, idx) => (
              <Polyline
                key={idx}
                coordinates={seg.coords}
                strokeColor={seg.color}
                strokeWidth={seg.strokeWidth}
                lineJoin="round"
                lineCap="round"
              />
            ))}
            {/* Custom start marker */}
            <Marker
              coordinate={{ latitude: firstCoord.latitude, longitude: firstCoord.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <StartDot />
            </Marker>
            {/* Custom end marker */}
            <Marker
              coordinate={{ latitude: lastCoord.latitude, longitude: lastCoord.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <EndDot />
            </Marker>
          </MapView>
        ) : (
          <View style={styles.mapEmpty}>
            <Text style={[styles.mapEmptyTxt, { color: colors.textMuted }]}>No GPS points stored for this session.</Text>
          </View>
        )}
      </View>

      {/* Map legend */}
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
            <View style={[styles.markerDotLegend, { backgroundColor: colors.markerStart }]} />
            <Text style={[styles.legendTxt, { color: colors.textMuted }]}>Start</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.markerDotLegend, { backgroundColor: colors.markerEnd }]} />
            <Text style={[styles.legendTxt, { color: colors.textMuted }]}>End</Text>
          </View>
        </View>
      )}

      <Text selectable style={[styles.type, { color: colors.accent }]}>{session.exerciseName}</Text>
      {isBg ? (
        <Text selectable style={[styles.bgNote, { color: colors.textMuted }]}>Automatic all-day background track (always Walking).</Text>
      ) : (
        <TouchableOpacity style={styles.change} onPress={() => setPickOpen(true)}>
          <Text style={[styles.changeTxt, { color: colors.textMuted }]}>Change exercise type</Text>
        </TouchableOpacity>
      )}

      <View style={styles.stats}>
        <Text selectable style={[styles.row, { color: colors.text }]}>Distance: {km.toFixed(2)} km</Text>
        <Text selectable style={[styles.row, { color: colors.text }]}>Meters: {Math.round(session.distanceM)}</Text>
        <Text selectable style={[styles.row, { color: colors.text }]}>
          Duration: {Math.floor(session.durationSec / 60)}m {session.durationSec % 60}s
        </Text>
        <Text selectable style={[styles.row, { color: colors.text }]}>Calories (est.): {kcal} kcal</Text>
        <Text selectable style={[styles.row, { color: colors.text }]}>Incline: {Math.round(session.elevationGainM)} m</Text>
      </View>

      <TouchableOpacity
        style={[styles.del, { borderColor: colors.textMuted }]}
        onPress={() => {
          Alert.alert('Delete workout', 'Remove this session from your history?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => { deleteSession(id); navigation.goBack(); },
            },
          ]);
        }}
      >
        <Text style={[styles.delTxt, { color: colors.textMuted }]}>Delete workout</Text>
      </TouchableOpacity>

      {/* Exercise picker modal */}
      <Modal visible={!isBg && pickOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setPickOpen(false)}>
          <TouchableOpacity style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={1}>
            <Text style={[styles.modalTitle, { color: colors.accent }]}>Exercise</Text>
            {EXERCISE_TYPES.map(e => (
              <TouchableOpacity
                key={e}
                style={[styles.modalRow, { borderBottomColor: colors.border }]}
                onPress={() => { updateSessionExercise(id, e); setPickOpen(false); }}
              >
                <Text selectable style={[styles.modalRowTxt, { color: colors.text }, e === session.exerciseName && { color: colors.accent }]}>
                  {e}
                </Text>
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}