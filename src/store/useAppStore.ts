import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { clearDay } from '../background/bgWalkingStorage';
import { dayKey } from '../utils/dates';
import { elevationGainWalkingOnly, pathLengthWalkingOnly } from '../utils/walkingMetrics';
import type { Coord, CustomWorkoutTemplate, UserTask, WorkoutSession, DailyGoal } from './types';
import { checkAchievements } from '../utils/achievementChecker';
import type { AccentColor } from '../theme/colors';

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

type OnboardingState = {
  onboardingCompleted: boolean;
  onboardingStep: number;
};

type GamificationState = {
  xp: number;
  level: number;
  unlockedAchievements: string[];
  totalGoalsMet: number;
  currentStreak: number;
  bestStreak: number;
};

type AppState = {
  dailyGoalKm: number;
  dailyGoalCalories: number;
  strideM: number;
  backgroundWalkingEnabled: boolean;
  customWorkouts: CustomWorkoutTemplate[];
  tasks: UserTask[];
  dailyGoals: DailyGoal[];
  sessions: WorkoutSession[];
  history: Record<string, DayHistory>;
  androidPed: AndroidPedState;
  onboarding: OnboardingState;
  gamification: GamificationState;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  setOnboardingCompleted: (v: boolean) => void;
  setOnboardingStep: (v: number) => void;
  updateOnboardingGoals: (goals: { dailyGoalKm: number; dailyGoalCalories: number; strideM: number }) => void;
  addXP: (amount: number) => void;
  unlockAchievement: (achievementId: string) => void;
  incrementGoalsMet: () => void;
  updateStreak: (goalMet: boolean) => void;
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
  addDailyGoal: (name: string, targetValue: number, dailyIncrement: number, unit: string) => void;
  updateDailyGoal: (id: string, patch: Partial<DailyGoal>) => void;
  removeDailyGoal: (id: string) => void;
  completeDailyGoal: (id: string) => void;
  incrementDailyGoals: () => void;
  addSession: (input: Omit<WorkoutSession, 'id' | 'distanceM' | 'elevationGainM' | 'durationSec'>) => WorkoutSession;
  updateSessionExercise: (id: string, exerciseName: string) => void;
  deleteSession: (id: string) => void;
  onPedometerEmit: (stepsInBatch: number) => void;
  setStepSnapshotForDay: (dk: string, steps: number) => void;
  resetAndroidPedForTests: () => void;
  recomputeHistoryForDay: (dk: string) => void;
  checkAndUnlockAchievements: (dk: string) => { unlocked: string[]; xpGained: number };
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
      dailyGoalCalories: 500,
      strideM: 0.78,
      backgroundWalkingEnabled: true,
      customWorkouts: [],
      tasks: [],
      dailyGoals: [],
      sessions: [],
      history: {},
      androidPed: { dayKey: '', cumulative: 0, prevEmit: 0 },
      onboarding: { onboardingCompleted: false, onboardingStep: 0 },
      gamification: { xp: 0, level: 1, unlockedAchievements: [], totalGoalsMet: 0, currentStreak: 0, bestStreak: 0 },
      accentColor: 'lime',
      setAccentColor: (color) => set({ accentColor: color }),

      setOnboardingCompleted: (v) => set((s) => ({ onboarding: { ...s.onboarding, onboardingCompleted: v } })),
      setOnboardingStep: (v) => set((s) => ({ onboarding: { ...s.onboarding, onboardingStep: v } })),
      updateOnboardingGoals: (goals) => set((s) => ({
        dailyGoalKm: goals.dailyGoalKm,
        dailyGoalCalories: goals.dailyGoalCalories,
        strideM: goals.strideM,
      })),

      addXP: (amount) => set((s) => {
        const newXp = s.gamification.xp + amount;
        const newLevel = Math.floor(newXp / 1000) + 1;
        return {
          gamification: {
            ...s.gamification,
            xp: newXp,
            level: Math.max(newLevel, s.gamification.level),
          },
        };
      }),

      unlockAchievement: (achievementId) => set((s) => {
        if (s.gamification.unlockedAchievements.includes(achievementId)) {
          return s;
        }
        return {
          gamification: {
            ...s.gamification,
            unlockedAchievements: [...s.gamification.unlockedAchievements, achievementId],
          },
        };
      }),

      incrementGoalsMet: () => set((s) => ({
        gamification: {
          ...s.gamification,
          totalGoalsMet: s.gamification.totalGoalsMet + 1,
        },
      })),

      updateStreak: (goalMet) => set((s) => {
        const newStreak = goalMet ? s.gamification.currentStreak + 1 : 0;
        return {
          gamification: {
            ...s.gamification,
            currentStreak: newStreak,
            bestStreak: Math.max(newStreak, s.gamification.bestStreak),
          },
        };
      }),

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

      // ─── Daily Goals ───────────────────────────────────────────────
      addDailyGoal: (name, targetValue, dailyIncrement, unit) =>
        set((s) => ({
          dailyGoals: [
            ...s.dailyGoals,
            {
              id: uid(),
              name,
              targetValue,
              currentValue: 0,
              dailyIncrement,
              unit,
              createdAt: Date.now(),
              lastCompletedDate: null,
            },
          ],
        })),

      updateDailyGoal: (id, patch) =>
        set((s) => ({
          dailyGoals: s.dailyGoals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),

      removeDailyGoal: (id) =>
        set((s) => ({
          dailyGoals: s.dailyGoals.filter((g) => g.id !== id),
        })),

      completeDailyGoal: (id) =>
        set((s) => {
          const today = dayKey();
          return {
            dailyGoals: s.dailyGoals.map((g) => {
              if (g.id !== id) return g;
              // Increase target by daily increment for next day
              const newTarget = g.targetValue + g.dailyIncrement;
              return {
                ...g,
                currentValue: 0, // Reset progress
                targetValue: newTarget,
                lastCompletedDate: today,
              };
            }),
          };
        }),

      incrementDailyGoals: () =>
        set((s) => {
          const today = dayKey();
          return {
            dailyGoals: s.dailyGoals.map((g) => {
              // If already completed today, don't increment
              if (g.lastCompletedDate === today) return g;
              // Calculate days since last completion (or since creation)
              const lastDate = g.lastCompletedDate ?? dayKey(new Date(g.createdAt));
              const [ly, lm, ld] = lastDate.split('-').map(Number);
              const lastDateObj = new Date(ly, lm - 1, ld);
              const [ty, tm, td] = today.split('-').map(Number);
              const todayObj = new Date(ty, tm - 1, td);
              const daysDiff = Math.floor((todayObj.getTime() - lastDateObj.getTime()) / (1000 * 60 * 60 * 24));
              if (daysDiff <= 0) return g;
              // Increment target for each missed day
              const newTarget = g.targetValue + g.dailyIncrement * daysDiff;
              return {
                ...g,
                targetValue: newTarget,
                currentValue: 0, // Reset progress for new day
              };
            }),
          };
        }),

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

      checkAndUnlockAchievements: (dk) => {
        const s = useAppStore.getState();
        const dayHistory = s.history[dk];
        if (!dayHistory) return { unlocked: [] as string[], xpGained: 0 };

        const result = checkAchievements(
          {
            todaySteps: dayHistory.steps,
            todayDistanceKm: dayHistory.distanceM / 1000,
            currentStreak: s.gamification.currentStreak,
            totalGoalsMet: s.gamification.totalGoalsMet,
            unlockedAchievements: s.gamification.unlockedAchievements,
          },
          s.sessions.map(sess => ({ startedAt: sess.startedAt, distanceM: sess.distanceM }))
        );

        // Batch unlock achievements and add XP in a single set() call
        // This prevents race conditions when multiple achievements unlock simultaneously
        const xpGained = result.newXp ?? 0;
        if (result.unlocked.length > 0) {
          set((state) => {
            const existingAchievements = new Set(state.gamification.unlockedAchievements);
            const newAchievements = result.unlocked.filter((id) => !existingAchievements.has(id));
            if (newAchievements.length === 0) return {};

            return {
              gamification: {
                ...state.gamification,
                unlockedAchievements: [...state.gamification.unlockedAchievements, ...newAchievements],
                xp: state.gamification.xp + xpGained,
              },
            };
          });
        }

        return { unlocked: result.unlocked, xpGained };
      },
    }),
    {
      name: 'mobile-daily-stats',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        dailyGoalKm: s.dailyGoalKm,
        dailyGoalCalories: s.dailyGoalCalories,
        strideM: s.strideM,
        backgroundWalkingEnabled: s.backgroundWalkingEnabled,
        accentColor: s.accentColor,
        customWorkouts: s.customWorkouts,
        tasks: s.tasks,
        dailyGoals: s.dailyGoals,
        sessions: s.sessions,
        history: s.history,
        androidPed: s.androidPed,
        onboarding: s.onboarding,
        gamification: s.gamification,
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
