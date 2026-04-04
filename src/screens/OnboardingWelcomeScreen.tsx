import { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Activity } from 'lucide-react-native';

import { useThemeColors } from '../theme/ThemeContext';

type Props = {
  onComplete: () => void;
};

export function OnboardingWelcomeScreen({ onComplete }: Props) {
  const colors = useThemeColors();
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    // Logo entrance animation
    scale.value = withSpring(1, { damping: 12, stiffness: 80 });
    opacity.value = withTiming(1, { duration: 800 });

    // Continuous rotation
    rotate.value = withRepeat(
      withTiming(360, { duration: 20000 }),
      -1,
      false
    );

    // Pulse effect
    pulse.value = withRepeat(
      withTiming(1.1, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: interpolate(opacity.value, [0, 1], [20, 0]) }],
  }));

  const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 32 },
    logoContainer: { alignItems: 'center', marginBottom: 32 },
    logoWrapper: { padding: 20 },
    logoCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 30, elevation: 20 },
    textContainer: { alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
    description: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
    features: { flex: 1, justifyContent: 'center', gap: 16, marginBottom: 32 },
    featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
    featureEmoji: { fontSize: 28 },
    featureTextContainer: { flex: 1 },
    featureTitle: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
    featureText: { fontSize: 13, lineHeight: 18 },
    buttonContainer: { paddingBottom: 16 },
    button: { paddingVertical: 18, borderRadius: 999, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
    buttonText: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Animated Logo */}
      <Animated.View style={[styles.logoContainer, pulseStyle]}>
        <Animated.View style={[styles.logoWrapper, logoStyle]}>
          <View style={[styles.logoCircle, { backgroundColor: colors.accent, shadowColor: colors.accent }]}>
            <Activity color={colors.bg} size={48} strokeWidth={2.5} />
          </View>
        </Animated.View>
      </Animated.View>

      {/* Title */}
      <Animated.View style={[styles.textContainer, titleStyle]}>
        <Text style={[styles.title, { color: colors.text }]}>Mobile Daily Stats</Text>
        <Text style={[styles.subtitle, { color: colors.accent }]}>
          Track your walks, runs, and daily activity
        </Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>
          Your personal fitness companion that works in the background,
          automatically tracking your movement throughout the day.
        </Text>
      </Animated.View>

      {/* Features */}
      <Animated.View style={[styles.features, titleStyle]}>
        <FeatureItem
          emoji="👟"
          title="Auto Tracking"
          text="Background GPS tracks your walks automatically"
        />
        <FeatureItem
          emoji="📊"
          title="Detailed Stats"
          text="See your progress with beautiful charts and insights"
        />
        <FeatureItem
          emoji="🏆"
          title="Achievements"
          text="Unlock badges and level up as you move more"
        />
        <FeatureItem
          emoji="🗺️"
          title="Route Maps"
          text="Visualize your walks with colored speed zones"
        />
      </Animated.View>

      {/* CTA Button */}
      <Animated.View style={[styles.buttonContainer, titleStyle]}>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent, shadowColor: colors.accent }]} onPress={onComplete} activeOpacity={0.8}>
          <Text style={[styles.buttonText, { color: colors.bg }]}>Get Started</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function FeatureItem({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  const colors = useThemeColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, backgroundColor: colors.card, borderColor: colors.border, gap: 12 }}>
      <Text style={{ fontSize: 28 }}>{emoji}</Text>
      <View>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{title}</Text>
        <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{text}</Text>
      </View>
    </View>
  );
}
