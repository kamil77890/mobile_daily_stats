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

export const EXERCISE_TYPES = [
  'Walking',
  'Running',
  'Cycling',
  'Hiking',
  'Elliptical',
  'Other',
] as const;
