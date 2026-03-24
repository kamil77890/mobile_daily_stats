import type { RouteProp } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MapView, { Marker, Polyline } from 'react-native-maps';

import type { RootStackParamList } from '../navigation/types';
import { EXERCISE_TYPES } from '../store/types';
import { BG_WALK_PREFIX, useAppStore } from '../store/useAppStore';
import { colors } from '../theme/colors';
import { regionForCoords } from '../utils/geo';

type Props = {
  navigation: { goBack: () => void };
  route: RouteProp<RootStackParamList, 'SessionEdit'>;
};

export function SessionEditScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const id = route.params.sessionId;
  const sessions = useAppStore((s) => s.sessions);
  const updateSessionExercise = useAppStore((s) => s.updateSessionExercise);
  const deleteSession = useAppStore((s) => s.deleteSession);

  const session = useMemo(() => sessions.find((s) => s.id === id), [sessions, id]);
  const [pickOpen, setPickOpen] = useState(false);

  if (!session) {
    return (
      <View style={[styles.miss, { paddingTop: insets.top }]}>
        <Text style={styles.missTxt}>Workout not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const region = regionForCoords(session.coords);
  const km = session.distanceM / 1000;
  const kcal = Math.round(km * 55);
  const isBg = session.id.startsWith(BG_WALK_PREFIX);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 40 }]}
    >
      <View style={styles.top}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color={colors.text} size={26} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Edit workout</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.mapBox}>
        {session.coords.length > 1 ? (
          <MapView style={StyleSheet.absoluteFill} initialRegion={region} scrollEnabled={false} mapType="standard">
            <Polyline coordinates={session.coords} strokeColor={colors.routeLine} strokeWidth={4} lineJoin="round" />
            <Marker coordinate={session.coords[0]} title="Start" pinColor={colors.markerStart} />
            <Marker
              coordinate={session.coords[session.coords.length - 1]}
              title="End"
              pinColor={colors.markerEnd}
            />
          </MapView>
        ) : (
          <View style={styles.mapEmpty}>
            <Text style={styles.mapEmptyTxt}>No GPS points stored for this session.</Text>
          </View>
        )}
      </View>

      <Text style={styles.type}>{session.exerciseName}</Text>
      {isBg ? (
        <Text style={styles.bgNote}>Automatic all-day background track (always Walking).</Text>
      ) : (
        <TouchableOpacity style={styles.change} onPress={() => setPickOpen(true)}>
          <Text style={styles.changeTxt}>Change exercise type</Text>
        </TouchableOpacity>
      )}

      <View style={styles.stats}>
        <Text style={styles.row}>Distance: {km.toFixed(2)} km</Text>
        <Text style={styles.row}>Meters: {Math.round(session.distanceM)}</Text>
        <Text style={styles.row}>Duration: {Math.floor(session.durationSec / 60)}m {session.durationSec % 60}s</Text>
        <Text style={styles.row}>Calories (est.): {kcal} kcal</Text>
        <Text style={styles.row}>Incline: {Math.round(session.elevationGainM)} m</Text>
      </View>

      <TouchableOpacity
        style={styles.del}
        onPress={() => {
          Alert.alert('Delete workout', 'Remove this session from your history?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => {
                deleteSession(id);
                navigation.goBack();
              },
            },
          ]);
        }}
      >
        <Text style={styles.delTxt}>Delete workout</Text>
      </TouchableOpacity>

      <Modal visible={!isBg && pickOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>Exercise</Text>
            {EXERCISE_TYPES.map((e) => (
              <TouchableOpacity
                key={e}
                style={styles.modalRow}
                onPress={() => {
                  updateSessionExercise(id, e);
                  setPickOpen(false);
                }}
              >
                <Text style={[styles.modalRowTxt, e === session.exerciseName && styles.modalRowActive]}>
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

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 16, gap: 10 },
  miss: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  missTxt: { color: colors.text, marginBottom: 12 },
  link: { color: colors.accent, fontWeight: '800' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { color: colors.text, fontWeight: '800' },
  mapBox: { height: 220, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.card },
  mapEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  mapEmptyTxt: { color: colors.textMuted, textAlign: 'center' },
  type: { color: colors.accent, fontWeight: '900', fontSize: 22, marginTop: 8 },
  change: { alignSelf: 'flex-start' },
  changeTxt: { color: colors.textMuted, fontWeight: '700' },
  bgNote: { color: colors.textMuted, marginTop: 6, lineHeight: 20 },
  stats: { marginTop: 8, gap: 6 },
  row: { color: colors.text, fontWeight: '600' },
  del: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.textMuted,
    alignItems: 'center',
  },
  delTxt: { color: colors.textMuted, fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { color: colors.accent, fontWeight: '900', fontSize: 18, marginBottom: 12 },
  modalRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalRowTxt: { color: colors.text, fontWeight: '700', fontSize: 16 },
  modalRowActive: { color: colors.accent },
});
