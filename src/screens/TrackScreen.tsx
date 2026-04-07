import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { ArrowLeft, Calendar, Clock, Flame, MoreVertical, Play, Square } from 'lucide-react-native';
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
import { useThemeColors } from '../theme/ThemeContext';
import type { Coord } from '../store/types';
import { workoutActionHaptic } from '../utils/haptics';
import { pathLengthWalkingOnly } from '../utils/walkingMetrics';

export function TrackScreen() {
  const colors = useThemeColors();
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
    void workoutActionHaptic();
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
    void workoutActionHaptic();
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

  const styles = StyleSheet.create({
    scroll: { flex: 1 },
    content: { paddingHorizontal: 16, gap: 12 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 22, fontWeight: '800' },
    exLabel: { fontWeight: '700', marginTop: 6 },
    exChange: { fontSize: 13, marginBottom: 8 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    historyCard: { width: '48%', borderRadius: 20, padding: 16, minHeight: 72, justifyContent: 'center', gap: 8 },
    historyTxt: { fontWeight: '900', fontSize: 16 },
    liveCard: { width: '48%', minHeight: 160 },
    sparkBox: { height: 90, marginBottom: 8 },
    sparkInner: { flex: 1, borderRadius: 12, overflow: 'hidden' },
    sparkLineWrap: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 4 },
    sparkCol: { flex: 1, marginHorizontal: 1, borderRadius: 2, minHeight: 2 },
    liveLbl: { fontWeight: '800' },
    liveSub: { marginTop: 4, fontSize: 12 },
    statSmall: { width: '48%', paddingVertical: 18, alignItems: 'flex-start', gap: 6 },
    statVal: { fontSize: 18, fontWeight: '800' },
    statCap: { fontWeight: '700', fontSize: 13 },
    startBtn: { borderRadius: 999, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
    startTxt: { fontWeight: '900', fontSize: 16 },
    stopBtn: { borderRadius: 999, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, borderWidth: 2 },
    stopTxt: { fontWeight: '900', fontSize: 16 },
    secHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    secTitle: { fontSize: 18, fontWeight: '800' },
    recent: { borderRadius: 20, padding: 16, borderWidth: 1, gap: 12 },
    recentType: { fontWeight: '800', fontSize: 16 },
    recentDate: { fontSize: 12, marginTop: 6 },
    recentStats: { flexDirection: 'row', gap: 16 },
    rs: { alignItems: 'flex-start', gap: 4 },
    rsLb: { fontSize: 11, fontWeight: '700' },
    rsVal: { fontWeight: '700', fontSize: 13 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 24 },
    modalCard: { borderRadius: 20, padding: 16, borderWidth: 1 },
    modalTitle: { fontWeight: '900', fontSize: 18, marginBottom: 12 },
    modalRow: { paddingVertical: 12, borderBottomWidth: 1 },
    modalRowTxt: { fontWeight: '700', fontSize: 16 },
    modalRowActive: {},
  });

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={[styles.scroll, { backgroundColor: colors.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 32 }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <ArrowLeft color={colors.text} size={20} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text, flex: 1 }]}>Track workout</Text>
        <TouchableOpacity onPress={() => setPickOpen(true)}>
          <MoreVertical color={colors.text} size={22} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.exLabel, { color: colors.accent }]}>Exercise: {exercise}</Text>
      <TouchableOpacity onPress={() => setPickOpen(true)}>
        <Text style={[styles.exChange, { color: colors.textMuted }]}>Change exercise</Text>
      </TouchableOpacity>

      <Modal visible={pickOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickOpen(false)}>
          <TouchableOpacity style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={1} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.accent }]}>Exercise</Text>
            {EXERCISE_TYPES.map((e) => (
              <TouchableOpacity
                key={e}
                style={[styles.modalRow, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setExercise(e);
                  setPickOpen(false);
                }}
              >
                <Text style={[styles.modalRowTxt, { color: colors.text }, e === exercise && { color: colors.accent }]}>{e}</Text>
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <View style={styles.grid}>
        <TouchableOpacity style={[styles.historyCard, { backgroundColor: colors.accent }]} onPress={() => navigation.navigate('Stats' as never)}>
          <Calendar color={colors.bg} size={22} />
          <Text style={[styles.historyTxt, { color: colors.bg }]}>History</Text>
        </TouchableOpacity>

        <Card style={styles.liveCard}>
          <View style={styles.sparkBox}>
            <View style={[styles.sparkInner, { backgroundColor: colors.bg }]}>
              <View style={styles.sparkLineWrap}>
                {spark.map((v, i) => {
                  const max = Math.max(...spark, 1);
                  const h = Math.max(4, (v / max) * 76);
                  return <View key={i} style={[styles.sparkCol, { height: h, backgroundColor: colors.accent }]} />;
                })}
              </View>
            </View>
          </View>
          <Text style={[styles.liveLbl, { color: colors.accent }]}>Live tracking</Text>
          <Text style={[styles.liveSub, { color: colors.textMuted }]}>
            {recording ? `${liveKm.toFixed(2)} km · ${liveKcal} kcal` : 'Idle'}
          </Text>
        </Card>

        <Card style={styles.statSmall}>
          <Flame color={colors.accent} size={22} />
          <Text style={[styles.statVal, { color: colors.text }]}>{recording ? `${liveKcal} kcal` : '—'}</Text>
          <Text style={[styles.statCap, { color: colors.accent }]}>Calories</Text>
        </Card>

        <Card style={styles.statSmall}>
          <Clock color={colors.accent} size={22} />
          <Text style={[styles.statVal, { color: colors.text }]}>
            {recording
              ? `${String(Math.floor(liveDurSec / 60)).padStart(2, '0')}:${String(liveDurSec % 60).padStart(2, '0')}`
              : '—'}
          </Text>
          <Text style={[styles.statCap, { color: colors.accent }]}>Duration</Text>
        </Card>
      </View>

      {recording ? (
        <TouchableOpacity style={[styles.stopBtn, { backgroundColor: colors.cardElevated, borderColor: colors.accent }]} onPress={() => void stop()}>
          <Square color={colors.bg} size={22} fill={colors.bg} />
          <Text style={[styles.stopTxt, { color: colors.accent }]}>Stop & save workout</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.accent }]} onPress={() => void start()}>
          <Play color={colors.bg} size={22} fill={colors.bg} />
          <Text style={[styles.startTxt, { color: colors.bg }]}>Start new workout</Text>
        </TouchableOpacity>
      )}

      <View style={styles.secHead}>
        <Text style={[styles.secTitle, { color: colors.text }]}>Recent workouts</Text>
      </View>
      {recent.map((s) => (
        <TouchableOpacity
          key={s.id}
          style={[styles.recent, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => parent?.navigate('SessionEdit', { sessionId: s.id })}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.recentType, { color: colors.accent }]}>{s.exerciseName}</Text>
            <Text style={[styles.recentDate, { color: colors.textMuted }]}>
              {s.dayKey} · {new Date(s.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.recentStats}>
            <View style={styles.rs}>
              <Clock color={colors.accent} size={16} />
              <Text style={[styles.rsLb, { color: colors.accent }]}>Duration</Text>
              <Text style={[styles.rsVal, { color: colors.text }]}>
                {Math.floor(s.durationSec / 60)}m {s.durationSec % 60}s
              </Text>
            </View>
            <View style={styles.rs}>
              <Flame color={colors.accent} size={16} />
              <Text style={[styles.rsLb, { color: colors.accent }]}>Calories</Text>
              <Text style={[styles.rsVal, { color: colors.text }]}>{Math.round((s.distanceM / 1000) * 55)} kcal</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
