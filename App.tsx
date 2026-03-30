import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Activity, BarChart2, Clock, Home, ListChecks } from 'lucide-react-native';
import { useEffect } from 'react';
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
import { DailyTimelineScreen } from './src/screens/DailyTimelineScreen';
import { GoalsScreen } from './src/screens/GoalsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MapShareScreen } from './src/screens/MapShareScreen';
import { PlanScreen } from './src/screens/PlanScreen';
import { SessionEditScreen } from './src/screens/SessionEditScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { TrackScreen } from './src/screens/TrackScreen';
import { useAppStore } from './src/store/useAppStore';
import { colors } from './src/theme/colors';
import { dayKey } from './src/utils/dates';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Summary',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Track"
        component={TrackScreen}
        options={{
          tabBarLabel: 'Track',
          tabBarIcon: ({ color, size }) => <Activity color={color} size={size} />,
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
        name="Plan"
        component={PlanScreen}
        options={{
          tabBarLabel: 'Plan',
          tabBarIcon: ({ color, size }) => <ListChecks color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

function RootStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Goals" component={GoalsScreen} />
      <Stack.Screen name="MapShare" component={MapShareScreen} />
      <Stack.Screen name="SessionEdit" component={SessionEditScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  usePedometerSync();

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
    void refreshWalkingStatsNotificationFromStore();
  }, [statsTick]);

  useEffect(() => {
    const interval = setInterval(() => {
      void refreshWalkingStatsNotificationFromStore();
    }, 5_000);
    return () => clearInterval(interval);
  }, []);

  // ── Initial hydration ─────────────────────────────────────────────
  useEffect(() => {
    const runDaily = () => {
      const key = dayKey();
      useAppStore.getState().recomputeHistoryForDay(key);
      void syncBackgroundWalkingSessionsFromStorage();
      void ensureBackgroundWalkingStarted();
      void refreshWalkingStatsNotificationFromStore();
    };
    const unsub = useAppStore.persist.onFinishHydration(runDaily);
    if (useAppStore.persist.hasHydrated()) {
      runDaily();
    }
    return unsub;
  }, []);

  // ── App foreground transitions ────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void syncBackgroundWalkingSessionsFromStorage();
        void ensureBackgroundWalkingStarted();
        void refreshWalkingStatsNotificationFromStore();
      }
    });
    return () => sub.remove();
  }, []);

  // ── Sync GPS data every 30 seconds (feeds activity status hook) ───
  useEffect(() => {
    const id = setInterval(() => {
      void syncBackgroundWalkingSessionsFromStorage();
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  // ── Restart background service when day/night period changes ──────
  //    Day 06-23 → 1-min interval   Night 23-06 → 10-min interval
  useEffect(() => {
    const id = setInterval(() => {
      void restartBackgroundWalkingIfPeriodChanged();
    }, 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="light" />
        <RootStack />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}