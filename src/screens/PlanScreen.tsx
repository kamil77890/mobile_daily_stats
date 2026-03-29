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
import { colors } from '../theme/colors';
import { addDays, dayKey, parseDayKey } from '../utils/dates';
import { kcalFromWalk } from '../utils/geo';

const WEEKDAY_PL = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
const MONTH_PL = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

function formatDayLabel(dk: string): string {
  const d = parseDayKey(dk);
  return `${WEEKDAY_PL[d.getDay()]}, ${d.getDate()} ${MONTH_PL[d.getMonth()]}`;
}

export function PlanScreen() {
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

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 40 }]}
    >
      <Text style={styles.title}>Plan</Text>

      {/* ── Day navigation ───────────────────────────────────────── */}
      <Card style={styles.dayNavCard}>
        <View style={styles.dayNavRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigateDay(-1)}>
            <ChevronLeft color={colors.text} size={22} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedDay(todayKey)}>
            <Text style={styles.dayLabel}>{formatDayLabel(selectedDay)}</Text>
            {isToday && <Text style={styles.todayBadge}>● dzisiaj</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, isToday && styles.navBtnDisabled]}
            onPress={() => !isToday && navigateDay(1)}
          >
            <ChevronRight color={isToday ? colors.border : colors.text} size={22} />
          </TouchableOpacity>
        </View>

        {/* Day stats summary */}
        {dayHistory ? (
          <View style={styles.daySummaryRow}>
            <View style={styles.dayStat}>
              <Text style={styles.dayStatVal}>{dayHistory.steps.toLocaleString()}</Text>
              <Text style={styles.dayStatLb}>kroków</Text>
            </View>
            <View style={styles.dayStatDivider} />
            <View style={styles.dayStat}>
              <Text style={styles.dayStatVal}>{dayKm.toFixed(2)}</Text>
              <Text style={styles.dayStatLb}>km</Text>
            </View>
            <View style={styles.dayStatDivider} />
            <View style={styles.dayStat}>
              <Text style={styles.dayStatVal}>{dayBurnKcal}</Text>
              <Text style={styles.dayStatLb}>kcal</Text>
            </View>
            <View style={styles.dayStatDivider} />
            <View style={styles.dayStat}>
              <Text style={styles.dayStatVal}>{Math.round(dayHistory.inclineM)}</Text>
              <Text style={styles.dayStatLb}>m przewyżka</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noDataTxt}>Brak danych dla tego dnia</Text>
        )}
      </Card>

      {/* ── Sessions for selected day ─────────────────────────────── */}
      {daySessions.length > 0 && (
        <>
          <Text style={styles.sec}>Treningi — {formatDayLabel(selectedDay)}</Text>
          {daySessions.map((s) => {
            const km = s.distanceM / 1000;
            const kcal = Math.round(km * 55);
            return (
              <TouchableOpacity
                key={s.id}
                style={styles.sessionCard}
                onPress={() => parent?.navigate('SessionEdit', { sessionId: s.id })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionType}>{s.exerciseName}</Text>
                  <Text style={styles.sessionTime}>
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
                  <Text style={styles.sStatKm}>{km.toFixed(2)} km</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {/* ── Goal button ───────────────────────────────────────────── */}
      <TouchableOpacity style={styles.goalBtn} onPress={() => parent?.navigate('Goals')}>
        <Text style={styles.goalBtnTxt}>Daily goals (km & calories)</Text>
      </TouchableOpacity>

      {/* ── Custom workout builder ────────────────────────────────── */}
      <Text style={styles.sec}>Build custom workout</Text>
      <Card>
        <Text style={styles.lb}>Name</Text>
        <TextInput
          value={tplName}
          onChangeText={setTplName}
          placeholder="Morning loop"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Text style={styles.lb}>Exercises</Text>
        <View style={styles.chips}>
          {EXERCISE_TYPES.map((e) => {
            const on = tplEx.includes(e);
            return (
              <TouchableOpacity
                key={e}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => toggleTplExercise(e)}
              >
                <Text style={[styles.chipTxt, on && styles.chipTxtOn]}>{e}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={styles.addBig} onPress={saveTemplate}>
          <Plus color={colors.bg} size={20} />
          <Text style={styles.addBigTxt}>Save workout template</Text>
        </TouchableOpacity>
      </Card>

      <Text style={styles.sec}>Your templates</Text>
      {customWorkouts.map((w) => (
        <Card key={w.id} style={styles.rowCard}>
          <Text style={styles.lb}>Name</Text>
          <TextInput
            value={nameFor(w.id, w.name)}
            onChangeText={(t) => setDrafts((d) => ({ ...d, [w.id]: t }))}
            onBlur={() => {
              const v = nameFor(w.id, w.name).trim() || w.name;
              updateCustomWorkout(w.id, v, w.exercises);
            }}
            style={styles.input}
            placeholderTextColor={colors.textMuted}
          />
          <Text style={styles.wEx}>{w.exercises.join(' · ')}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.smallBtn}
              onPress={() => pickExercisesForTemplate(w.id, nameFor(w.id, w.name).trim() || w.name, w.exercises)}
            >
              <Text style={styles.smallBtnTxt}>Edit exercises</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.smallBtn}
              onPress={() => addTaskFromTemplate(nameFor(w.id, w.name) || w.name, w.exercises)}
            >
              <Text style={styles.smallBtnTxt}>Add task</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeCustomWorkout(w.id)}>
              <Trash2 color={colors.textMuted} size={20} />
            </TouchableOpacity>
          </View>
        </Card>
      ))}

      <Text style={styles.sec}>Today's tasks (tap to complete)</Text>
      {tasks.length === 0 ? (
        <Text style={styles.empty}>Add a task from a template or create below.</Text>
      ) : null}
      {tasks.map((t) => {
        const k = `task-${t.id}`;
        return (
          <Card key={t.id} style={styles.task}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lb}>Name</Text>
              <TextInput
                value={nameFor(k, t.name)}
                onChangeText={(text) => setDrafts((d) => ({ ...d, [k]: text }))}
                onBlur={() => {
                  const v = nameFor(k, t.name).trim() || t.name;
                  updateTask(t.id, { name: v });
                }}
                style={styles.input}
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity onPress={() => toggleTask(t.id)}>
                <Text style={[styles.taskName, t.completed && styles.done]}>
                  {t.completed ? 'Completed — tap to undo' : 'Tap here when done'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.taskEx}>{t.exercises.join(' · ')}</Text>
            </View>
            <View style={styles.taskActions}>
              <TouchableOpacity onPress={() => pickTaskExercises(t.id, t.name, t.exercises)}>
                <Text style={styles.link}>Exercises</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeTask(t.id)}>
                <Trash2 color={colors.textMuted} size={18} />
              </TouchableOpacity>
            </View>
          </Card>
        );
      })}

      <Card>
        <Text style={styles.lb}>Blank task</Text>
        <TextInput
          value={blankTaskName}
          onChangeText={setBlankTaskName}
          placeholder="Task name"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <TouchableOpacity style={styles.ghost} onPress={saveBlankTask}>
          <Text style={styles.ghostTxt}>Add (starts as Walking — edit exercises after)</Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 16, gap: 10 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  // Day navigation
  dayNavCard: { gap: 0 },
  dayNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  navBtnDisabled: { opacity: 0.3 },
  dayLabel: { color: colors.text, fontWeight: '800', fontSize: 16, textAlign: 'center' },
  todayBadge: { color: colors.accent, fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  daySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  dayStat: { alignItems: 'center', flex: 1 },
  dayStatVal: { color: colors.accent, fontWeight: '900', fontSize: 18 },
  dayStatLb: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 2 },
  dayStatDivider: { width: 1, height: 36, backgroundColor: colors.border },
  noDataTxt: { color: colors.textMuted, textAlign: 'center', paddingVertical: 8 },
  // Sessions
  sessionCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    alignItems: 'center',
  },
  sessionType: { color: colors.accent, fontWeight: '800', fontSize: 15 },
  sessionTime: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  sessionStats: { alignItems: 'flex-end', gap: 4 },
  sStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sStatVal: { color: colors.text, fontSize: 12, fontWeight: '700' },
  sStatKm: { color: colors.accent, fontSize: 14, fontWeight: '900' },
  // Goal
  goalBtn: {
    backgroundColor: colors.cardElevated,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  goalBtnTxt: { color: colors.accent, fontWeight: '800', textAlign: 'center' },
  sec: { color: colors.text, fontWeight: '800', fontSize: 16, marginTop: 8 },
  lb: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.cardElevated },
  chipTxt: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  chipTxtOn: { color: colors.accent },
  addBig: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 999,
  },
  addBigTxt: { color: colors.bg, fontWeight: '900' },
  rowCard: { gap: 10 },
  wEx: { color: colors.textMuted, marginTop: 6, fontSize: 13 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallBtnTxt: { color: colors.accent, fontWeight: '800', fontSize: 12 },
  task: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  taskName: { color: colors.accent, fontWeight: '800', marginTop: 8 },
  done: { textDecorationLine: 'line-through', color: colors.textMuted },
  taskEx: { color: colors.textMuted, marginTop: 4, fontSize: 13 },
  taskActions: { alignItems: 'flex-end', gap: 8 },
  link: { color: colors.accent, fontWeight: '800' },
  empty: { color: colors.textMuted },
  ghost: {
    marginTop: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  ghostTxt: { color: colors.accent, fontWeight: '800', textAlign: 'center' },
});