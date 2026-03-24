import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { clearDay } from '../background/bgWalkingStorage';
import { dayKey } from '../utils/dates';
import { elevationGainWalkingOnly, pathLengthWalkingOnly } from '../utils/walkingMetrics';
import type { Coord, CustomWorkoutTemplate, UserTask, WorkoutSession } from './types';

type AndroidPedState = { dayKey: string; cumulative: number; prevEmit: number };

type DayHistory = {
  steps: number;
  distanceM: number;
  kcal: number;
  inclineM: number;
  goalMet: boolean;
};

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const BG_WALK_PREFIX = 'bgwalk-';

type AppState = {
  dailyGoalKm: number;
  dailyGoalCalories: number;
  strideM: number;
  backgroundWalkingEnabled: boolean;
  customWorkouts: CustomWorkoutTemplate[];
  tasks: UserTask[];
  sessions: WorkoutSession[];
  history: Record<string, DayHistory>;
  androidPed: AndroidPedState;
  setDailyGoalKm: (v: number) => void;
  setDailyGoalCalories: (v: number) => void;
  setStrideM: (v: number) => void;
  setBackgroundWalkingEnabled: (v: boolean) => void;
  upsertBackgroundWalkingSession: (dk: string, coords: Coord[], startedAt: number, endedAt: number) => void;
  addCustomWorkout: (name: string, exercises: string[]) => void;
  updateCustomWorkout: (id: string, name: string, exercises: string[]) => void;
  removeCustomWorkout: (id: string) => void;
  addTask: (name: string, exercises: string[]) => void;
  updateTask: (id: string, patch: Partial<Pick<UserTask, 'name' | 'exercises' | 'completed'>>) => void;
  removeTask: (id: string) => void;
  toggleTask: (id: string) => void;
  addSession: (input: Omit<WorkoutSession, 'id' | 'distanceM' | 'elevationGainM' | 'durationSec'>) => WorkoutSession;
  updateSessionExercise: (id: string, exerciseName: string) => void;
  deleteSession: (id: string) => void;
  onPedometerEmit: (stepsInBatch: number) => void;
  setStepSnapshotForDay: (dk: string, steps: number) => void;
  resetAndroidPedForTests: () => void;
  recomputeHistoryForDay: (dk: string) => void;
};

function aggregateDay(
  dk: string,
  sessions: WorkoutSession[],
  dailyGoalKm: number,
  liveSteps: number,
  strideM: number,
): DayHistory {
  const daySessions = sessions.filter((s) => s.dayKey === dk);
  const gpsM = daySessions.reduce((a, s) => a + s.distanceM, 0);
  const inclineM = daySessions.reduce((a, s) => a + s.elevationGainM, 0);
  const stepKm = (liveSteps * strideM) / 1000;
  const gpsKm = gpsM / 1000;
  const totalKm = Math.max(gpsKm, stepKm);
  const steps = Math.max(liveSteps, Math.round(gpsM / Math.max(strideM, 0.01)));
  const kcal = Math.round(totalKm * 55 + steps * 0.04);
  return {
    steps,
    distanceM: totalKm * 1000,
    kcal,
    inclineM,
    goalMet: totalKm >= dailyGoalKm - 1e-6,
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      dailyGoalKm: 3,
      dailyGoalCalories: 2500,
      strideM: 0.78,
      backgroundWalkingEnabled: true,
      customWorkouts: [],
      tasks: [],
      sessions: [],
      history: {},
      androidPed: { dayKey: '', cumulative: 0, prevEmit: 0 },

      setDailyGoalKm: (v) => set({ dailyGoalKm: Math.max(0.1, Math.min(100, v)) }),
      setDailyGoalCalories: (v) => set({ dailyGoalCalories: Math.max(500, Math.min(20000, Math.round(v))) }),
      setStrideM: (v) => set({ strideM: Math.max(0.5, Math.min(1.2, v)) }),

      setBackgroundWalkingEnabled: (v) => set({ backgroundWalkingEnabled: v }),

      upsertBackgroundWalkingSession: (dk, coords, startedAt, endedAt) =>
        set((s) => {
          const sid = `${BG_WALK_PREFIX}${dk}`;
          const others = s.sessions.filter((x) => x.id !== sid);
          if (coords.length < 2) {
            const sessions = others;
            const h = { ...s.history };
            const toRecompute = new Set<string>([dayKey(), dk]);
            sessions.forEach((x) => toRecompute.add(x.dayKey));
            for (const xdk of toRecompute) {
              const st = h[xdk]?.steps ?? 0;
              h[xdk] = aggregateDay(xdk, sessions, s.dailyGoalKm, st, s.strideM);
            }
            return { sessions, history: h };
          }
          const distanceM = pathLengthWalkingOnly(coords, startedAt, endedAt);
          const eg = elevationGainWalkingOnly(coords, startedAt, endedAt);
          const durationSec = Math.max(0, Math.round((endedAt - startedAt) / 1000));
          const session: WorkoutSession = {
            id: sid,
            dayKey: dk,
            startedAt,
            endedAt,
            exerciseName: 'Walking',
            coords,
            distanceM,
            elevationGainM: eg,
            durationSec,
          };
          const sessions = [...others, session];
          const h = { ...s.history };
          const toRecompute = new Set<string>([dayKey(), dk]);
          sessions.forEach((x) => toRecompute.add(x.dayKey));
          for (const xdk of toRecompute) {
            const st = h[xdk]?.steps ?? 0;
            h[xdk] = aggregateDay(xdk, sessions, s.dailyGoalKm, st, s.strideM);
          }
          return { sessions, history: h };
        }),

      addCustomWorkout: (name, exercises) =>
        set((s) => ({
          customWorkouts: [
            ...s.customWorkouts,
            { id: uid(), name: name.trim() || 'Workout', exercises },
          ],
        })),

      updateCustomWorkout: (id, name, exercises) =>
        set((s) => ({
          customWorkouts: s.customWorkouts.map((w) =>
            w.id === id ? { ...w, name: name.trim() || w.name, exercises } : w,
          ),
        })),

      removeCustomWorkout: (id) =>
        set((s) => ({ customWorkouts: s.customWorkouts.filter((w) => w.id !== id) })),

      addTask: (name, exercises) =>
        set((s) => ({
          tasks: [
            ...s.tasks,
            {
              id: uid(),
              name: name.trim() || 'Task',
              exercises,
              completed: false,
              createdAt: Date.now(),
            },
          ],
        })),

      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
        })),

      addSession: (input) => {
        const distanceM = pathLengthWalkingOnly(input.coords, input.startedAt, input.endedAt);
        const el = elevationGainWalkingOnly(input.coords, input.startedAt, input.endedAt);
        const durationSec = Math.max(0, Math.round((input.endedAt - input.startedAt) / 1000));
        const session: WorkoutSession = {
          ...input,
          id: uid(),
          distanceM,
          elevationGainM: el,
          durationSec,
        };
        set((s) => {
          const sessions = [...s.sessions, session];
          const h = { ...s.history };
          const dk = session.dayKey;
          const liveSteps = h[dk]?.steps ?? 0;
          h[dk] = aggregateDay(dk, sessions, s.dailyGoalKm, liveSteps, s.strideM);
          return { sessions, history: h };
        });
        return session;
      },

      updateSessionExercise: (id, exerciseName) =>
        set((s) => {
          const sessions = s.sessions.map((x) => (x.id === id ? { ...x, exerciseName } : x));
          const h = { ...s.history };
          for (const dk of new Set(sessions.map((x) => x.dayKey))) {
            const liveSteps = h[dk]?.steps ?? 0;
            h[dk] = aggregateDay(dk, sessions, s.dailyGoalKm, liveSteps, s.strideM);
          }
          return { sessions, history: h };
        }),

      deleteSession: (id) =>
        set((s) => {
          if (id.startsWith(BG_WALK_PREFIX)) {
            const dk = id.slice(BG_WALK_PREFIX.length);
            void clearDay(dk);
          }
          const removed = s.sessions.find((x) => x.id === id);
          const sessions = s.sessions.filter((x) => x.id !== id);
          const h = { ...s.history };
          const toRecompute = new Set<string>([dayKey()]);
          if (removed) toRecompute.add(removed.dayKey);
          sessions.forEach((x) => toRecompute.add(x.dayKey));
          for (const dk of toRecompute) {
            const st = h[dk]?.steps ?? 0;
            h[dk] = aggregateDay(dk, sessions, s.dailyGoalKm, st, s.strideM);
          }
          return { sessions, history: h };
        }),

      onPedometerEmit: (stepsInBatch) =>
        set((s) => {
          const dk = dayKey();
          let { androidPed } = s;
          if (androidPed.dayKey !== dk) {
            androidPed = { dayKey: dk, cumulative: 0, prevEmit: 0 };
          }
          let { cumulative, prevEmit } = androidPed;
          if (stepsInBatch >= prevEmit) {
            cumulative += stepsInBatch - prevEmit;
          } else {
            cumulative += stepsInBatch;
          }
          prevEmit = stepsInBatch;
          const androidPedNext = { dayKey: dk, cumulative, prevEmit };
          const sessions = s.sessions;
          const h = { ...s.history };
          const iosSteps = h[dk]?.steps;
          const mergedSteps = Math.max(iosSteps ?? 0, cumulative);
          h[dk] = aggregateDay(dk, sessions, s.dailyGoalKm, mergedSteps, s.strideM);
          return { androidPed: androidPedNext, history: h };
        }),

      setStepSnapshotForDay: (dk, steps) =>
        set((s) => {
          const h = { ...s.history };
          const pedExtra = s.androidPed.dayKey === dk ? s.androidPed.cumulative : 0;
          const merged = Math.max(h[dk]?.steps ?? 0, steps, pedExtra);
          h[dk] = aggregateDay(dk, s.sessions, s.dailyGoalKm, merged, s.strideM);
          return { history: h };
        }),

      resetAndroidPedForTests: () =>
        set({ androidPed: { dayKey: '', cumulative: 0, prevEmit: 0 } }),

      recomputeHistoryForDay: (dk) =>
        set((s) => {
          const h = { ...s.history };
          const steps = h[dk]?.steps ?? 0;
          h[dk] = aggregateDay(dk, s.sessions, s.dailyGoalKm, steps, s.strideM);
          return { history: h };
        }),
    }),
    {
      name: 'mobile-daily-stats',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        dailyGoalKm: s.dailyGoalKm,
        dailyGoalCalories: s.dailyGoalCalories,
        strideM: s.strideM,
        backgroundWalkingEnabled: s.backgroundWalkingEnabled,
        customWorkouts: s.customWorkouts,
        tasks: s.tasks,
        sessions: s.sessions,
        history: s.history,
        androidPed: s.androidPed,
      }),
    },
  ),
);

export function buildSessionFromTrack(
  exerciseName: string,
  startedAt: number,
  endedAt: number,
  coords: Coord[],
): Omit<WorkoutSession, 'id' | 'distanceM' | 'elevationGainM' | 'durationSec'> {
  return {
    dayKey: dayKey(new Date(endedAt)),
    startedAt,
    endedAt,
    exerciseName,
    coords,
  };
}
