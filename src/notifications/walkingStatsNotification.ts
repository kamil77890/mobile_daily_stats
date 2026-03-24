import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme/colors';
import { dayKey } from '../utils/dates';

const NOTIF_ID = 'walking-live-stats';

/** Local notifications are not supported in Expo Go (SDK 53+); use a dev/production build. */
export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

function skipNotifications(): boolean {
  return Platform.OS === 'web' || isExpoGo();
}

let handlerInstalled = false;

export async function ensureWalkingStatsNotificationSetup(): Promise<void> {
  if (skipNotifications()) return;
  try {
    const Notifications = await import('expo-notifications');
    if (!handlerInstalled) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      handlerInstalled = true;
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('walking-stats', {
        name: 'Walking stats',
        importance: Notifications.AndroidImportance.DEFAULT,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        vibrationPattern: [0, 0],
        lightColor: colors.accent,
      });
    }
    await Notifications.requestPermissionsAsync();
  } catch {
    /* Module unavailable in this runtime */
  }
}

export async function refreshWalkingStatsNotificationFromStore(): Promise<void> {
  if (skipNotifications()) return;
  try {
    const Notifications = await import('expo-notifications');
    const enabled = useAppStore.getState().backgroundWalkingEnabled;
    if (!enabled) {
      await Notifications.cancelScheduledNotificationAsync(NOTIF_ID).catch(() => {});
      return;
    }

    const dk = dayKey();
    const h = useAppStore.getState().history[dk];
    const steps = h?.steps ?? 0;
    const km = (h?.distanceM ?? 0) / 1000;
    const kcal = h ? h.kcal : 0;
    const body = `${steps.toLocaleString()} steps · ${km.toFixed(2)} km · ${kcal} kcal`;

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID,
      content: {
        title: 'Today',
        body,
        sticky: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        ...(Platform.OS === 'android' && {
          channelId: 'walking-stats',
          color: colors.routeLine,
        }),
      },
      trigger: null,
    });
  } catch {
    /* noop */
  }
}
