import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import {
  MapPin,
  Activity,
  Bell,
  CircleCheck,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import * as Notifications from 'expo-notifications';

import { useThemeColors } from '../theme/ThemeContext';

type Props = {
  onComplete: () => void;
};

type PermissionStatus = 'pending' | 'granted' | 'denied';

function AnimatedPermissionCard({
  fade,
  icon,
  title,
  description,
  status,
  onRequest,
  grantedText,
  requestText,
  deniedText,
}: {
  fade: any;
  icon: React.ReactNode;
  title: string;
  description: string;
  status: PermissionStatus;
  onRequest: () => void;
  grantedText: string;
  requestText: string;
  deniedText: string;
}) {
  const colors = useThemeColors();
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: (1 - fade.value) * 30 }],
  }));

  return (
    <Animated.View style={[{ backgroundColor: colors.card, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border }, animatedStyle]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.cardElevated, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
        <View>
          {status === 'granted' && (
            <CircleCheck color={colors.accent} size={24} />
          )}
          {status === 'denied' && (
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.textMuted }} />
          )}
        </View>
      </View>

      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 }}>{title}</Text>
      <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>{description}</Text>

      {status === 'pending' && (
        <TouchableOpacity style={{ backgroundColor: colors.accent, paddingVertical: 12, borderRadius: 12, alignItems: 'center' }} onPress={onRequest} activeOpacity={0.8}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.bg }}>{requestText}</Text>
        </TouchableOpacity>
      )}

      {status === 'granted' && (
        <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.accent + '22', borderWidth: 1, borderColor: colors.accent + '66', alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.accent }}>{grantedText}</Text>
        </View>
      )}

      {status === 'denied' && (
        <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.textMuted + '22', borderWidth: 1, borderColor: colors.textMuted + '66', alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted }}>{deniedText}</Text>
        </View>
      )}
    </Animated.View>
  );
}

export function OnboardingPermissionsScreen({ onComplete }: Props) {
  const colors = useThemeColors();
  const [locationStatus, setLocationStatus] = useState<PermissionStatus>('pending');
  const [fitnessStatus, setFitnessStatus] = useState<PermissionStatus>('pending');
  const [notificationStatus, setNotificationStatus] = useState<PermissionStatus>('pending');

  const fade1 = useSharedValue(0);
  const fade2 = useSharedValue(0);
  const fade3 = useSharedValue(0);

  useEffect(() => {
    fade1.value = withTiming(1, { duration: 600 });
    fade2.value = withDelay(200, withTiming(1, { duration: 600 }));
    fade3.value = withDelay(400, withTiming(1, { duration: 600 }));
  }, []);

  const requestLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationStatus('granted');
        return;
      }
      const fg = await Location.requestForegroundPermissionsAsync();
      if (fg.granted) {
        const bg = await Location.requestBackgroundPermissionsAsync();
        setLocationStatus(bg.granted ? 'granted' : 'denied');
      } else {
        setLocationStatus('denied');
      }
    } catch (error) {
      console.log('Location permission error:', error);
      setLocationStatus('denied');
    }
  };

  const requestFitness = async () => {
    try {
      const { granted } = await Pedometer.requestPermissionsAsync();
      setFitnessStatus(granted ? 'granted' : 'denied');
    } catch (error) {
      console.log('Fitness permission error:', error);
      setFitnessStatus('denied');
    }
  };

  const requestNotification = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        setNotificationStatus('granted');
        return;
      }
      const perm = await Notifications.requestPermissionsAsync();
      setNotificationStatus(perm.granted ? 'granted' : 'denied');
    } catch (error) {
      console.log('Notification permission error:', error);
      setNotificationStatus('denied');
    }
  };

  const allGranted =
    locationStatus === 'granted' &&
    fitnessStatus === 'granted' &&
    notificationStatus === 'granted';

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 32 },
    header: { marginBottom: 24 },
    title: { color: colors.text, fontSize: 28, fontWeight: '900', marginBottom: 8 },
    subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
    card: { backgroundColor: colors.card, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    iconContainer: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    statusContainer: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    deniedDot: { width: 12, height: 12, borderRadius: 6 },
    cardTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 6 },
    cardDescription: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginBottom: 14 },
    requestButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center' },
    requestButtonText: { fontSize: 15, fontWeight: '800' },
    statusBadge: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center' },
    statusBadgeGranted: { borderWidth: 1 },
    statusBadgeDenied: { borderWidth: 1 },
    statusText: { fontSize: 13, fontWeight: '700' },
    statusTextGranted: {},
    statusTextDenied: {},
    footer: { marginTop: 16, alignItems: 'center', gap: 16 },
    footerText: { fontSize: 13, textAlign: 'center' },
    button: { paddingVertical: 18, paddingHorizontal: 48, borderRadius: 999, minWidth: 200, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
    buttonSecondary: { borderWidth: 1, shadowOpacity: 0, elevation: 0 },
    buttonText: { fontSize: 17, fontWeight: '900' },
    buttonTextSecondary: {},
  });

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Allow Permissions</Text>
        <Text style={styles.subtitle}>
          These permissions are needed to track your activity accurately
        </Text>
      </View>

      {/* Location Permission */}
      <AnimatedPermissionCard
        fade={fade1}
        icon={<MapPin color={colors.accent} size={28} />}
        title="Location Access"
        description="Required to map your walking/running routes and calculate distance accurately."
        status={locationStatus}
        onRequest={requestLocation}
        grantedText="Location enabled"
        requestText="Enable Location"
        deniedText="Location denied"
      />

      {/* Fitness Permission */}
      <AnimatedPermissionCard
        fade={fade2}
        icon={<Activity color={colors.accent} size={28} />}
        title="Fitness & Motion"
        description="Used to count your steps throughout the day for daily stats and goal tracking."
        status={fitnessStatus}
        onRequest={requestFitness}
        grantedText="Fitness access granted"
        requestText="Enable Fitness"
        deniedText="Fitness access denied"
      />

      {/* Notification Permission */}
      <AnimatedPermissionCard
        fade={fade3}
        icon={<Bell color={colors.accent} size={28} />}
        title="Notifications"
        description="Get updates about your daily progress, goal achievements, and background tracking."
        status={notificationStatus}
        onRequest={requestNotification}
        grantedText="Notifications enabled"
        requestText="Enable Notifications"
        deniedText="Notifications denied"
      />

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          You can change these settings anytime in your phone settings.
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent, shadowColor: colors.accent }, !allGranted && { backgroundColor: colors.cardElevated, borderColor: colors.border }]}
          onPress={onComplete}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, { color: colors.bg }, !allGranted && { color: colors.text }]}>
            {allGranted ? 'Continue' : 'Continue Anyway'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
