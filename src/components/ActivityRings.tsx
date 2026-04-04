import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useThemeColors } from '../theme/ThemeContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  value: number;
  maxValue: number;
  color: string;
  size?: number;
  stroke?: number;
  rotation?: number;
  centerLabel?: string;
  centerSubLabel?: string;
};

export function ActivityRing({
  value,
  maxValue,
  color,
  size = 100,
  stroke = 12,
  rotation = 0,
  centerLabel,
  centerSubLabel,
}: Props) {
  const colors = useThemeColors();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = useMemo(() => Math.min(1, Math.max(0, value / maxValue)), [value, maxValue]);

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      animatedProgress.value = withSpring(progress, { damping: 15, stiffness: 80 });
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: [c * animatedProgress.value, c],
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color + '33'}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          transform={`rotate(${rotation - 90} ${size / 2} ${size / 2})`}
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c}, ${c}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
        />
      </Svg>
      {(centerLabel || centerSubLabel) && (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          {centerLabel && <Text style={[styles.centerLabel, { color }]}>{centerLabel}</Text>}
          {centerSubLabel && <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 2 }}>{centerSubLabel}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontWeight: '900',
    fontSize: 16,
    textAlign: 'center',
  },
});
