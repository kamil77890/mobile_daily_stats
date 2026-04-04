import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, ChevronRight, Clock, Flame, Plus, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../components/Card';
import type { RootStackParamList } from '../navigation/types';
import { EXERCISE_TYPES } from '../store/types';
import { useAppStore } from '../store/useAppStore';
import { useThemeColors } from '../theme/ThemeContext';
import { addDays, dayKey, parseDayKey } from '../utils/dates';
import { kcalFromWalk } from '../utils/geo';

const WEEKDAY_PL = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
const MONTH_PL = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

function formatDayLabel(dk: string): string {
  const d = parseDayKey(dk);
  return `${WEEKDAY_PL[d.getDay()]}, ${d.getDate()} ${MONTH_PL[d.getMonth()]}`;
}

export function PlanScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const parent = navigation.getParent() as NativeStackNavigationProp<RootStackParamList> | undefined;

  // Day navigation state
  const [selectedDay, setSelectedDay] = useState(() => dayKey());
  const todayKey = dayKey();
  const isToday = selectedDay === todayKey;

  const navigateDay = (delta: number) => {
    setSelectedDay((prev) => addDays(prev, delta));
  };

  const history = useAppStore((s) => s.history);
  const sessions = useAppStore((s) => s.sessions);
  const customWorkouts = useAppStore((s) => s.customWorkouts);
  const addCustomWorkout = useAppStore((s) => s.addCustomWorkout);
  const updateCustomWorkout = useAppStore((s) => s.updateCustomWorkout);
  const removeCustomWorkout = useAppStore((s) => s.removeCustomWorkout);
  const tasks = useAppStore((s) => s.tasks);
  const addTask = useAppStore((s) => s.addTask);
  const updateTask = useAppStore((s) => s.updateTask);
  const removeTask = useAppStore((s) => s.removeTask);
  const toggleTask = useAppStore((s) => s.toggleTask);

  // Day summary data
  const dayHistory = history[selectedDay];
  const daySessions = useMemo(
    () =>
      [...sessions]
        .filter((s) => s.dayKey === selectedDay)
        .sort((a, b) => a.startedAt - b.startedAt),
    [sessions, selectedDay],
  );

  const [tplName, setTplName] = useState('');
  const [tplEx, setTplEx] = useState<string[]>(['Walking']);
  const [blankTaskName, setBlankTaskName] = useState('');

  const initialDrafts = useMemo(() => {
    const d: Record<string, string> = {};
    for (const w of customWorkouts) d[w.id] = w.name;
    for (const t of tasks) d[`task-${t.id}`] = t.name;
    return d;
  }, [customWorkouts, tasks]);

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const nameFor = (key: string, fallback: string) =>
    drafts[key] !== undefined ? drafts[key] : initialDrafts[key] ?? fallback;

  const toggleTplExercise = (e: string) => {
    setTplEx((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  };

  const saveTemplate = () => {
    if (tplEx.length === 0) {
      Alert.alert('Wybierz ćwiczenia', 'Zaznacz co najmniej jedno.');
      return;
    }
    addCustomWorkout(tplName, tplEx);
    setTplName('');
    setTplEx(['Walking']);
  };

  const pickExercisesForTemplate = (id: string, name: string, exercises: string[]) => {
    Alert.alert(
      'Exercises',
      'Tap to toggle',
      [
        ...EXERCISE_TYPES.map((e) => ({
          text: `${exercises.includes(e) ? '✓ ' : ''}${e}`,
          onPress: () => {
            const next = exercises.includes(e)
              ? exercises.filter((x) => x !== e)
              : [...exercises, e];
            if (next.length === 0) { Alert.alert('Need at least one'); return; }
            updateCustomWorkout(id, name, next);
          },
        })),
        { text: 'Done', style: 'cancel' },
      ],
    );
  };

  const addTaskFromTemplate = (name: string, exercises: string[]) => {
    addTask(name, exercises);
  };

  const pickTaskExercises = (id: string, name: string, exercises: string[]) => {
    Alert.alert(
      'Task exercises',
      undefined,
      [
        ...EXERCISE_TYPES.map((e) => ({
          text: `${exercises.includes(e) ? '✓ ' : ''}${e}`,
          onPress: () => {
            const next = exercises.includes(e)
              ? exercises.filter((x) => x !== e)
              : [...exercises, e];
            if (next.length === 0) return;
            updateTask(id, { exercises: next });
          },
        })),
        { text: 'Close', style: 'cancel' },
      ],
    );
  };

  const saveBlankTask = () => {
    const n = blankTaskName.trim() || 'Custom task';
    addTask(n, ['Walking']);
    setBlankTaskName('');
  };

  const dayKm = (dayHistory?.distanceM ?? 0) / 1000;
  const dayBurnKcal = kcalFromWalk(dayKm, dayHistory?.steps ?? 0);

  const styles = StyleSheet.create({
    scroll: { flex: 1 },
    content: { paddingHorizontal: 16, gap: 10 },
    title: { fontSize: 28, fontWeight: '800' },
    dayNavCard: { gap: 0 },
    dayNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    navBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    navBtnDisabled: { opacity: 0.3 },
    dayLabel: { fontWeight: '800', fontSize: 16, textAlign: 'center' },
    todayBadge: { fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 2 },
    daySummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
    dayStat: { alignItems: 'center', flex: 1 },
    dayStatVal: { fontWeight: '900', fontSize: 18 },
    dayStatLb: { fontSize: 10, fontWeight: '700', marginTop: 2 },
    dayStatDivider: { width: 1, height: 36 },
    noDataTxt: { textAlign: 'center', paddingVertical: 8 },
    sessionCard: { flexDirection: 'row', borderRadius: 16, padding: 14, borderWidth: 1, gap: 12, alignItems: 'center' },
    sessionType: { fontWeight: '800', fontSize: 15 },
    sessionTime: { fontSize: 12, marginTop: 4 },
    sessionStats: { alignItems: 'flex-end', gap: 4 },
    sStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    sStatVal: { fontSize: 12, fontWeight: '700' },
    sStatKm: { fontSize: 14, fontWeight: '900' },
    goalBtn: { padding: 14, borderRadius: 16, borderWidth: 1 },
    goalBtnTxt: { fontWeight: '800', textAlign: 'center' },
    sec: { fontWeight: '800', fontSize: 16, marginTop: 8 },
    lb: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
    input: { borderRadius: 12, padding: 12, borderWidth: 1 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 12 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
    chipOn: {},
    chipTxt: { fontWeight: '700', fontSize: 12 },
    chipTxtOn: {},
    addBig: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 999 },
    addBigTxt: { fontWeight: '900' },
    rowCard: { gap: 10 },
    wEx: { marginTop: 6, fontSize: 13 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
    smallBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    smallBtnTxt: { fontWeight: '800', fontSize: 12 },
    task: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    taskName: { fontWeight: '800', marginTop: 8 },
    done: { textDecorationLine: 'line-through' },
    taskEx: { marginTop: 4, fontSize: 13 },
    taskActions: { alignItems: 'flex-end', gap: 8 },
    link: { fontWeight: '800' },
    empty: {},
    ghost: { marginTop: 10, padding: 14, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
    ghostTxt: { fontWeight: '800', textAlign: 'center' },
  });

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={[styles.scroll, { backgroundColor: colors.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 40 }]}
    >
      <Text style={[styles.title, { color: colors.text }]}>Plan</Text>

      {/* ── Day navigation ───────────────────────────────────────── */}
      <Card style={styles.dayNavCard}>
        <View style={styles.dayNavRow}>
          <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.cardElevated, borderColor: colors.border }]} onPress={() => navigateDay(-1)}>
            <ChevronLeft color={colors.text} size={22} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedDay(todayKey)}>
            <Text style={[styles.dayLabel, { color: colors.text }]}>{formatDayLabel(selectedDay)}</Text>
            {isToday && <Text style={[styles.todayBadge, { color: colors.accent }]}>● dzisiaj</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: colors.cardElevated, borderColor: colors.border }, isToday && styles.navBtnDisabled]}
            onPress={() => !isToday && navigateDay(1)}
          >
            <ChevronRight color={isToday ? colors.border : colors.text} size={22} />
          </TouchableOpacity>
        </View>

        {/* Day stats summary */}
        {dayHistory ? (
          <View style={styles.daySummaryRow}>
            <View style={styles.dayStat}>
              <Text style={[styles.dayStatVal, { color: colors.accent }]}>{dayHistory.steps.toLocaleString()}</Text>
              <Text style={[styles.dayStatLb, { color: colors.textMuted }]}>kroków</Text>
            </View>
            <View style={styles.dayStatDivider} />
            <View style={styles.dayStat}>
              <Text style={[styles.dayStatVal, { color: colors.accent }]}>{dayKm.toFixed(2)}</Text>
              <Text style={[styles.dayStatLb, { color: colors.textMuted }]}>km</Text>
            </View>
            <View style={styles.dayStatDivider} />
            <View style={styles.dayStat}>
              <Text style={[styles.dayStatVal, { color: colors.accent }]}>{dayBurnKcal}</Text>
              <Text style={[styles.dayStatLb, { color: colors.textMuted }]}>kcal</Text>
            </View>
            <View style={styles.dayStatDivider} />
            <View style={styles.dayStat}>
              <Text style={[styles.dayStatVal, { color: colors.accent }]}>{Math.round(dayHistory.inclineM)}</Text>
              <Text style={[styles.dayStatLb, { color: colors.textMuted }]}>m przewyżka</Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.noDataTxt, { color: colors.textMuted }]}>Brak danych dla tego dnia</Text>
        )}
      </Card>

      {/* ── Sessions for selected day ─────────────────────────────── */}
      {daySessions.length > 0 && (
        <>
          <Text style={[styles.sec, { color: colors.text }]}>Treningi — {formatDayLabel(selectedDay)}</Text>
          {daySessions.map((s) => {
            const km = s.distanceM / 1000;
            const kcal = Math.round(km * 55);
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => parent?.navigate('SessionEdit', { sessionId: s.id })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sessionType, { color: colors.accent }]}>{s.exerciseName}</Text>
                  <Text style={[styles.sessionTime, { color: colors.textMuted }]}>
                    {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' – '}
                    {new Date(s.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.sessionStats}>
                  <View style={styles.sStat}>
                    <Flame color={colors.accent} size={14} />
                    <Text style={styles.sStatVal}>{kcal} kcal</Text>
                  </View>
                  <View style={styles.sStat}>
                    <Clock color={colors.accent} size={14} />
                    <Text style={styles.sStatVal}>
                      {Math.floor(s.durationSec / 60)}m {s.durationSec % 60}s
                    </Text>
                  </View>
                  <Text style={[styles.sStatKm, { color: colors.accent }]}>{km.toFixed(2)} km</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {/* ── Goal button ───────────────────────────────────────────── */}
      <TouchableOpacity style={[styles.goalBtn, { backgroundColor: colors.cardElevated, borderColor: colors.accent }]} onPress={() => parent?.navigate('Goals')}>
        <Text style={[styles.goalBtnTxt, { color: colors.accent }]}>Daily goals (km & calories)</Text>
      </TouchableOpacity>

      {/* ── Custom workout builder ────────────────────────────────── */}
      <Text style={[styles.sec, { color: colors.text }]}>Build custom workout</Text>
      <Card>
        <Text style={[styles.lb, { color: colors.textMuted }]}>Name</Text>
        <TextInput
          value={tplName}
          onChangeText={setTplName}
          placeholder="Morning loop"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
        />
        <Text style={[styles.lb, { color: colors.textMuted }]}>Exercises</Text>
        <View style={styles.chips}>
          {EXERCISE_TYPES.map((e) => {
            const on = tplEx.includes(e);
            return (
              <TouchableOpacity
                key={e}
                style={[styles.chip, { backgroundColor: colors.bg, borderColor: colors.border }, on && { borderColor: colors.accent, backgroundColor: colors.cardElevated }]}
                onPress={() => toggleTplExercise(e)}
              >
                <Text style={[styles.chipTxt, { color: colors.textMuted }, on && { color: colors.accent }]}>{e}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={[styles.addBig, { backgroundColor: colors.accent }]} onPress={saveTemplate}>
          <Plus color={colors.bg} size={20} />
          <Text style={[styles.addBigTxt, { color: colors.bg }]}>Save workout template</Text>
        </TouchableOpacity>
      </Card>

      <Text style={[styles.sec, { color: colors.text }]}>Your templates</Text>
      {customWorkouts.map((w) => (
        <Card key={w.id} style={styles.rowCard}>
          <Text style={[styles.lb, { color: colors.textMuted }]}>Name</Text>
          <TextInput
            value={nameFor(w.id, w.name)}
            onChangeText={(t) => setDrafts((d) => ({ ...d, [w.id]: t }))}
            onBlur={() => {
              const v = nameFor(w.id, w.name).trim() || w.name;
              updateCustomWorkout(w.id, v, w.exercises);
            }}
            style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[styles.wEx, { color: colors.textMuted }]}>{w.exercises.join(' · ')}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
              onPress={() => pickExercisesForTemplate(w.id, nameFor(w.id, w.name).trim() || w.name, w.exercises)}
            >
              <Text style={[styles.smallBtnTxt, { color: colors.accent }]}>Edit exercises</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
              onPress={() => addTaskFromTemplate(nameFor(w.id, w.name) || w.name, w.exercises)}
            >
              <Text style={[styles.smallBtnTxt, { color: colors.accent }]}>Add task</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeCustomWorkout(w.id)}>
              <Trash2 color={colors.textMuted} size={20} />
            </TouchableOpacity>
          </View>
        </Card>
      ))}

      <Text style={[styles.sec, { color: colors.text }]}>Today's tasks (tap to complete)</Text>
      {tasks.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>Add a task from a template or create below.</Text>
      ) : null}
      {tasks.map((t) => {
        const k = `task-${t.id}`;
        return (
          <Card key={t.id} style={styles.task}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lb, { color: colors.textMuted }]}>Name</Text>
              <TextInput
                value={nameFor(k, t.name)}
                onChangeText={(text) => setDrafts((d) => ({ ...d, [k]: text }))}
                onBlur={() => {
                  const v = nameFor(k, t.name).trim() || t.name;
                  updateTask(t.id, { name: v });
                }}
                style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity onPress={() => toggleTask(t.id)}>
                <Text style={[styles.taskName, { color: colors.accent }, t.completed && { textDecorationLine: 'line-through', color: colors.textMuted }]}>
                  {t.completed ? 'Completed — tap to undo' : 'Tap here when done'}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.taskEx, { color: colors.textMuted }]}>{t.exercises.join(' · ')}</Text>
            </View>
            <View style={styles.taskActions}>
              <TouchableOpacity onPress={() => pickTaskExercises(t.id, t.name, t.exercises)}>
                <Text style={[styles.link, { color: colors.accent }]}>Exercises</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeTask(t.id)}>
                <Trash2 color={colors.textMuted} size={18} />
              </TouchableOpacity>
            </View>
          </Card>
        );
      })}

      <Card>
        <Text style={[styles.lb, { color: colors.textMuted }]}>Blank task</Text>
        <TextInput
          value={blankTaskName}
          onChangeText={setBlankTaskName}
          placeholder="Task name"
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }]}
        />
        <TouchableOpacity style={[styles.ghost, { borderColor: colors.border }]} onPress={saveBlankTask}>
          <Text style={[styles.ghostTxt, { color: colors.accent }]}>Add (starts as Walking — edit exercises after)</Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}