import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { BarChart2, Clock, Home, Settings as SettingsIcon } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
  ensureBackgroundWalkingStarted,
  restartBackgroundWalkingIfPeriodChanged,
  syncBackgroundWalkingSessionsFromStorage,
} from './src/background/backgroundWalkingService';
import { usePedometerSync } from './src/hooks/usePedometerSync';
import {
  ensureWalkingStatsNotificationSetup,
  refreshWalkingStatsNotificationFromStore,
} from './src/notifications/walkingStatsNotification';
import type { MainTabParamList, RootStackParamList } from './src/navigation/types';
import { AchievementsScreen } from './src/screens/AchievementsScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';
import { DailyTimelineScreen } from './src/screens/DailyTimelineScreen';
import { GoalsScreen } from './src/screens/GoalsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MapShareScreen } from './src/screens/MapShareScreen';
import { PlanScreen } from './src/screens/PlanScreen';
import { SessionEditScreen } from './src/screens/SessionEditScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { TrackScreen } from './src/screens/TrackScreen';
import { useAppStore } from './src/store/useAppStore';
import { ThemeProvider, useThemeColors } from './src/theme/ThemeContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { colors, getColorsWithAccentHex } from './src/theme/colors';
import { ACCENT_COLOR_VALUES } from './src/theme/accentColors';
import { dayKey } from './src/utils/dates';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function DynamicTheme({ children }: { children: React.ReactNode }) {
  const themeColors = useThemeColors();
  
  const navTheme = useMemo(() => ({
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: themeColors.bg,
      card: themeColors.bg,
      text: themeColors.text,
      border: themeColors.border,
      primary: themeColors.accent,
    },
  }), [themeColors]);

  return (
    <NavigationContainer theme={navTheme}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: themeColors.bg }}>
        <StatusBar style="light" />
        {children}
      </GestureHandlerRootView>
    </NavigationContainer>
  );
}

function MainTabs() {
  const themeColors = useThemeColors();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: themeColors.bg,
          borderTopColor: themeColors.border,
        },
        tabBarActiveTintColor: themeColors.accent,
        tabBarInactiveTintColor: themeColors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Summary"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Summary',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: 'Stats',
          tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Timeline"
        component={DailyTimelineScreen}
        options={{
          tabBarLabel: 'Timeline',
          tabBarIcon: ({ color, size }) => <Clock color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <SettingsIcon color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

function RootStack() {
  const themeColors = useThemeColors();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: themeColors.bg },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="MapShare" component={MapShareScreen} />
      <Stack.Screen name="SessionEdit" component={SessionEditScreen} />
      <Stack.Screen name="Track" component={TrackScreen} />
      <Stack.Screen name="Plan" component={PlanScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  usePedometerSync();

  // Debounce guard for notification refresh
  const lastNotifRefreshRef = useRef(0);
  const safeNotifRefresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastNotifRefreshRef.current < 3000) return; // Skip if < 3s since last refresh
    lastNotifRefreshRef.current = now;
    await refreshWalkingStatsNotificationFromStore();
  }, []);

  // Pending flag for GPS sync to prevent overlapping calls
  const gpsSyncPendingRef = useRef(false);

  const statsTick = useAppStore((s) => {
    const key = dayKey();
    const h = s.history[key];
    return `${h?.steps ?? 0}-${h?.distanceM ?? 0}-${h?.kcal ?? 0}-${s.backgroundWalkingEnabled}`;
  });

  // ── Notification setup ────────────────────────────────────────────
  useEffect(() => {
    void ensureWalkingStatsNotificationSetup();
  }, []);

  useEffect(() => {
    refreshWalkingStatsNotificationFromStore().catch((err) => {
      console.error('[App] Notification refresh failed:', err);
    });
  }, [statsTick]);

  useEffect(() => {
    const interval = setInterval(() => {
      safeNotifRefresh().catch(() => {
        // Silently fail - will retry on next interval
      });
    }, 5_000);
    return () => clearInterval(interval);
  }, []);

  // ── Initial hydration ─────────────────────────────────────────────
  useEffect(() => {
    const runDaily = async () => {
      const key = dayKey();
      useAppStore.getState().recomputeHistoryForDay(key);
      try {
        await syncBackgroundWalkingSessionsFromStorage();
        await ensureBackgroundWalkingStarted();
        await refreshWalkingStatsNotificationFromStore();
      } catch (err) {
        console.error('[App] Initial hydration failed:', err);
      }
    };
    const unsub = useAppStore.persist.onFinishHydration(runDaily);
    if (useAppStore.persist.hasHydrated()) {
      runDaily();
    }
    return unsub;
  }, []);

  // ── App foreground transitions ────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      if (next === 'active') {
        try {
          await syncBackgroundWalkingSessionsFromStorage();
          await ensureBackgroundWalkingStarted();
          await refreshWalkingStatsNotificationFromStore();
        } catch (err) {
          console.error('[App] Foreground transition failed:', err);
        }
      }
    });
    return () => sub.remove();
  }, []);

  // ── Sync GPS data every 30 seconds (feeds activity status hook) ───
  useEffect(() => {
    const id = setInterval(() => {
      if (gpsSyncPendingRef.current) return; // Skip if previous call still pending
      gpsSyncPendingRef.current = true;
      syncBackgroundWalkingSessionsFromStorage()
        .catch(() => {
          // Silently fail - will retry on next interval
        })
        .finally(() => {
          gpsSyncPendingRef.current = false;
        });
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  // ── Restart background service when day/night period changes ──────
  //    Day 06-23 → 1-min interval   Night 23-06 → 10-min interval
  useEffect(() => {
    const id = setInterval(() => {
      restartBackgroundWalkingIfPeriodChanged().catch((err) => {
        console.error('[App] Background walking restart failed:', err);
      });
    }, 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <DynamicTheme>
          <RootStack />
        </DynamicTheme>
      </ThemeProvider>
    </ErrorBoundary>
  );
}