import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Calendar, Clock, Flame, MoreVertical, Play, Square } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import { setManualRecordingActive } from '../background/backgroundWalkingService';
import { Card } from '../components/Card';
import type { RootStackParamList } from '../navigation/types';
import { EXERCISE_TYPES } from '../store/types';
import { buildSessionFromTrack, useAppStore } from '../store/useAppStore';
import { colors } from '../theme/colors';
import type { Coord } from '../store/types';
import { pathLengthWalkingOnly } from '../utils/walkingMetrics';

export function TrackScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const parent = navigation.getParent() as NativeStackNavigationProp<RootStackParamList> | undefined;
  const addSession = useAppStore((s) => s.addSession);
  const sessions = useAppStore((s) => s.sessions);

  const [exercise, setExercise] = useState<string>(EXERCISE_TYPES[0]);
  const [recording, setRecording] = useState(false);
  const [coords, setCoords] = useState<Coord[]>([]);
  const coordsRef = useRef<Coord[]>([]);
  const [spark, setSpark] = useState<number[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const subRef = useRef<Location.LocationSubscription | null>(null);

  const recent = useMemo(
    () => [...sessions].sort((a, b) => b.endedAt - a.endedAt).slice(0, 8),
    [sessions],
  );

  const liveKm = useMemo(() => {
    const t0 = coords[0]?.timestamp ?? startedAt ?? Date.now();
    return pathLengthWalkingOnly(coords, t0, Date.now()) / 1000;
  }, [coords, startedAt]);
  const liveDurSec = startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : 0;
  const liveKcal = Math.round(liveKm * 55);

  const stopSub = useCallback(async () => {
    if (subRef.current) {
      subRef.current.remove();
      subRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (!fg.granted) {
      Alert.alert('Location', 'Allow location while using the app to record your route.');
      return;
    }
    setManualRecordingActive(true);
    coordsRef.current = [];
    setCoords([]);
    setSpark([]);
    const t0 = Date.now();
    setStartedAt(t0);
    setRecording(true);
    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (loc) => {
          const ts = loc.timestamp ?? Date.now();
          const c: Coord = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            altitude: loc.coords.altitude ?? null,
            timestamp: ts,
          };
          setCoords((prev) => {
            const next = [...prev, c];
            coordsRef.current = next;
            const tStart = next[0]?.timestamp ?? startedAt ?? ts;
            const m = pathLengthWalkingOnly(next, tStart, ts);
            setSpark((s) => [...s, m].slice(-40));
            return next;
          });
        },
      );
      subRef.current = sub;
    } catch {
      setManualRecordingActive(false);
      setRecording(false);
      setStartedAt(null);
      Alert.alert('GPS', 'Could not start live tracking.');
    }
  }, []);

  const stop = useCallback(async () => {
    await stopSub();
    setRecording(false);
    setManualRecordingActive(false);
    const t1 = Date.now();
    const t0 = startedAt ?? t1;
    const finalCoords = coordsRef.current;
    if (finalCoords.length > 1) {
      addSession(buildSessionFromTrack(exercise, t0, t1, finalCoords));
    } else {
      Alert.alert('Too short', 'Move a bit further so we can save a route.');
    }
    setStartedAt(null);
    coordsRef.current = [];
    setCoords([]);
    setSpark([]);
  }, [addSession, exercise, startedAt, stopSub]);

  useEffect(() => {
    return () => {
      void stopSub();
      setManualRecordingActive(false);
    };
  }, [stopSub]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 32 }]}
    >
      <View style={styles.top}>
        <Text style={styles.title}>Track workout</Text>
        <TouchableOpacity onPress={() => setPickOpen(true)}>
          <MoreVertical color={colors.text} size={22} />
        </TouchableOpacity>
      </View>
      <Text style={styles.exLabel}>Exercise: {exercise}</Text>
      <TouchableOpacity onPress={() => setPickOpen(true)}>
        <Text style={styles.exChange}>Change exercise</Text>
      </TouchableOpacity>

      <Modal visible={pickOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickOpen(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>Exercise</Text>
            {EXERCISE_TYPES.map((e) => (
              <TouchableOpacity
                key={e}
                style={styles.modalRow}
                onPress={() => {
                  setExercise(e);
                  setPickOpen(false);
                }}
              >
                <Text style={[styles.modalRowTxt, e === exercise && styles.modalRowActive]}>{e}</Text>
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <View style={styles.grid}>
        <TouchableOpacity style={styles.historyCard} onPress={() => navigation.navigate('Stats' as never)}>
          <Calendar color={colors.bg} size={22} />
          <Text style={styles.historyTxt}>History</Text>
        </TouchableOpacity>

        <Card style={styles.liveCard}>
          <View style={styles.sparkBox}>
            <View style={styles.sparkInner}>
              <View style={styles.sparkLineWrap}>
                {spark.map((v, i) => {
                  const max = Math.max(...spark, 1);
                  const h = Math.max(4, (v / max) * 76);
                  return <View key={i} style={[styles.sparkCol, { height: h }]} />;
                })}
              </View>
            </View>
          </View>
          <Text style={styles.liveLbl}>Live tracking</Text>
          <Text style={styles.liveSub}>
            {recording ? `${liveKm.toFixed(2)} km · ${liveKcal} kcal` : 'Idle'}
          </Text>
        </Card>

        <Card style={styles.statSmall}>
          <Flame color={colors.accent} size={22} />
          <Text style={styles.statVal}>{recording ? `${liveKcal} kcal` : '—'}</Text>
          <Text style={styles.statCap}>Calories</Text>
        </Card>

        <Card style={styles.statSmall}>
          <Clock color={colors.accent} size={22} />
          <Text style={styles.statVal}>
            {recording
              ? `${String(Math.floor(liveDurSec / 60)).padStart(2, '0')}:${String(liveDurSec % 60).padStart(2, '0')}`
              : '—'}
          </Text>
          <Text style={styles.statCap}>Duration</Text>
        </Card>
      </View>

      {recording ? (
        <TouchableOpacity style={styles.stopBtn} onPress={() => void stop()}>
          <Square color={colors.bg} size={22} fill={colors.bg} />
          <Text style={styles.stopTxt}>Stop & save workout</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.startBtn} onPress={() => void start()}>
          <Play color={colors.bg} size={22} fill={colors.bg} />
          <Text style={styles.startTxt}>Start new workout</Text>
        </TouchableOpacity>
      )}

      <View style={styles.secHead}>
        <Text style={styles.secTitle}>Recent workouts</Text>
      </View>
      {recent.map((s) => (
        <TouchableOpacity
          key={s.id}
          style={styles.recent}
          onPress={() => parent?.navigate('SessionEdit', { sessionId: s.id })}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.recentType}>{s.exerciseName}</Text>
            <Text style={styles.recentDate}>
              {s.dayKey} · {new Date(s.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.recentStats}>
            <View style={styles.rs}>
              <Clock color={colors.accent} size={16} />
              <Text style={styles.rsLb}>Duration</Text>
              <Text style={styles.rsVal}>
                {Math.floor(s.durationSec / 60)}m {s.durationSec % 60}s
              </Text>
            </View>
            <View style={styles.rs}>
              <Flame color={colors.accent} size={16} />
              <Text style={styles.rsLb}>Calories</Text>
              <Text style={styles.rsVal}>{Math.round((s.distanceM / 1000) * 55)} kcal</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 16, gap: 12 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  exLabel: { color: colors.accent, fontWeight: '700', marginTop: 6 },
  exChange: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  historyCard: {
    width: '48%',
    backgroundColor: colors.accent,
    borderRadius: 20,
    padding: 16,
    minHeight: 72,
    justifyContent: 'center',
    gap: 8,
  },
  historyTxt: { color: colors.bg, fontWeight: '900', fontSize: 16 },
  liveCard: {
    width: '48%',
    minHeight: 160,
  },
  sparkBox: { height: 90, marginBottom: 8 },
  sparkInner: { flex: 1, backgroundColor: colors.bg, borderRadius: 12, overflow: 'hidden' },
  sparkLineWrap: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  sparkCol: {
    flex: 1,
    marginHorizontal: 1,
    borderRadius: 2,
    backgroundColor: colors.accent,
    minHeight: 2,
  },
  liveLbl: { color: colors.accent, fontWeight: '800' },
  liveSub: { color: colors.textMuted, marginTop: 4, fontSize: 12 },
  statSmall: {
    width: '48%',
    paddingVertical: 18,
    alignItems: 'flex-start',
    gap: 6,
  },
  statVal: { color: colors.text, fontSize: 18, fontWeight: '800' },
  statCap: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  startBtn: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  startTxt: { color: colors.bg, fontWeight: '900', fontSize: 16 },
  stopBtn: {
    backgroundColor: colors.cardElevated,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  stopTxt: { color: colors.accent, fontWeight: '900', fontSize: 16 },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  secTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  recent: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  recentType: { color: colors.accent, fontWeight: '800', fontSize: 16 },
  recentDate: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  recentStats: { flexDirection: 'row', gap: 16 },
  rs: { alignItems: 'flex-start', gap: 4 },
  rsLb: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  rsVal: { color: colors.text, fontWeight: '700', fontSize: 13 },
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
