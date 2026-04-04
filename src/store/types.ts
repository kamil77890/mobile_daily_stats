export type Coord = {
  latitude: number;
  longitude: number;
  altitude: number | null;
  /** Epoch ms — used for vehicle filtering and pause detection */
  timestamp?: number;
};

export type WorkoutSession = {
  id: string;
  dayKey: string;
  startedAt: number;
  endedAt: number;
  exerciseName: string;
  coords: Coord[];
  distanceM: number;
  elevationGainM: number;
  durationSec: number;
};

export type CustomWorkoutTemplate = {
  id: string;
  name: string;
  exercises: string[];
};

export type UserTask = {
  id: string;
  name: string;
  exercises: string[];
  completed: boolean;
  createdAt: number;
};

/**
 * Custom daily goal that increases its target each day.
 * Used for things like "do 50 push-ups daily, increase by 5 each day".
 */
export type DailyGoal = {
  id: string;
  name: string;
  targetValue: number;      // current target (increases daily)
  currentValue: number;     // today's progress (resets when completed)
  dailyIncrement: number;   // how much target increases each day
  unit: string;             // e.g., "push-ups", "km", "minutes"
  createdAt: number;        // epoch ms
  lastCompletedDate: string | null; // dayKey of last completion
};

export const EXERCISE_TYPES = [
  'Walking',
  'Running',
  'Cycling',
  'Hiking',
  'Elliptical',
  'Other',
] as const;


