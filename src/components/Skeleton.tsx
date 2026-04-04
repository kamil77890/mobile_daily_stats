import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useThemeColors } from '../theme/ThemeContext';

type Props = {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
};

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: Props) {
  const colors = useThemeColors();
  const translateX = useSharedValue(-100);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(400, { duration: 1500 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.card,
      overflow: 'hidden',
    },
    shimmer: {
      flex: 1,
      backgroundColor: colors.cardElevated,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    cardIcon: {
      alignSelf: 'center',
      marginBottom: 8,
    },
  });

  return (
    <View style={[styles.container, { width, height, borderRadius }, style]}>
      <Animated.View style={[styles.shimmer, animatedStyle]} />
    </View>
  );
}

type SkeletonCardProps = {
  lines?: number;
};

export function SkeletonCard({ lines = 3 }: SkeletonCardProps) {
  const colors = useThemeColors();
  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    cardIcon: {
      alignSelf: 'center',
      marginBottom: 8,
    },
  });
  return (
    <View style={styles.card}>
      <Skeleton width={60} height={60} borderRadius={30} style={styles.cardIcon} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={12}
          borderRadius={6}
          style={i === lines - 1 ? { width: '60%' } : undefined}
        />
      ))}
    </View>
  );
}

export function SkeletonText({ width = '80%', height = 14 }: Props) {
  return <Skeleton width={width} height={height} borderRadius={7} />;
}
