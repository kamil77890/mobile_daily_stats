import { Pedometer } from 'expo-sensors';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { useAppStore } from '../store/useAppStore';
import { dayKey, startOfDay } from '../utils/dates';

export function usePedometerSync() {
  const onPedometerEmit = useAppStore((s) => s.onPedometerEmit);
  const setStepSnapshotForDay = useAppStore((s) => s.setStepSnapshotForDay);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    let watchSub: { remove: () => void } | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const pullIos = async () => {
      if (Platform.OS !== 'ios') return;
      try {
        const end = new Date();
        const start = startOfDay(end);
        const { steps } = await Pedometer.getStepCountAsync(start, end);
        if (!cancelled) setStepSnapshotForDay(dayKey(end), steps);
      } catch {
        /* unavailable (simulator / web) */
      }
    };

    (async () => {
      const avail = await Pedometer.isAvailableAsync();
      if (!avail || cancelled) return;
      const perm = await Pedometer.requestPermissionsAsync();
      if (!perm.granted || cancelled) return;

      await pullIos();

      watchSub = Pedometer.watchStepCount((r) => {
        if (Platform.OS === 'android') {
          onPedometerEmit(Math.round(r.steps));
        }
      });

      if (Platform.OS === 'ios') {
        poll = setInterval(pullIos, 20000);
      }
    })();

    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        pullIos();
      }
      appState.current = next;
    });

    return () => {
      cancelled = true;
      watchSub?.remove();
      if (poll) clearInterval(poll);
      sub.remove();
    };
  }, [onPedometerEmit, setStepSnapshotForDay]);
}
