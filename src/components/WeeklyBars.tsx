import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  interpolate,
} from 'react-native-reanimated';

import { useThemeColors } from '../theme/ThemeContext';

type Props = {
  labels: string[];
  values: number[]; // km per day
  steps: number[];  // steps per day
  goalKm: number;
  maxVal: number;
};

export function WeeklyBars({ labels, values, steps, goalKm, maxVal }: Props) {
  const colors = useThemeColors();
  const cap = useMemo(() => Math.max(maxVal, goalKm, 0.001), [maxVal, goalKm]);
  const targetHeights = useMemo(() => values.map(v => Math.min(1, v / cap)), [values, cap]);

  // Create stable animated values
  const h0 = useSharedValue(0);
  const h1 = useSharedValue(0);
  const h2 = useSharedValue(0);
  const h3 = useSharedValue(0);
  const h4 = useSharedValue(0);
  const h5 = useSharedValue(0);
  const h6 = useSharedValue(0);
  
  const o0 = useSharedValue(0);
  const o1 = useSharedValue(0);
  const o2 = useSharedValue(0);
  const o3 = useSharedValue(0);
  const o4 = useSharedValue(0);
  const o5 = useSharedValue(0);
  const o6 = useSharedValue(0);

  const animatedHeights = [h0, h1, h2, h3, h4, h5, h6];
  const animatedOpacities = [o0, o1, o2, o3, o4, o5, o6];

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: 6,
      marginTop: 8,
    },
    col: {
      flex: 1,
      alignItems: 'center',
    },
    checkContainer: {
      height: 18,
      marginBottom: 4,
    },
    check: {
      color: colors.accent,
      fontSize: 14,
      fontWeight: '800',
    },
    checkSpacer: { height: 18 },
    barTrack: {
      width: '100%',
      height: 96,
      backgroundColor: colors.bg,
      borderRadius: 10,
      overflow: 'hidden',
      justifyContent: 'flex-end',
    },
    barFill: {
      width: '100%',
      backgroundColor: colors.accent,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
    },
    lb: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 6,
      fontWeight: '600',
    },
    steps: {
      color: colors.accent,
      fontSize: 9,
      marginTop: 2,
      fontWeight: '700',
      textAlign: 'center',
    },
    stepsSpacer: { height: 13 },
  });

  useMemo(() => {
    labels.forEach((_, i) => {
      if (i < 7) {
        animatedHeights[i].value = withDelay(
          100 + i * 80,
          withSpring(targetHeights[i], { damping: 15, stiffness: 80 })
        );
        animatedOpacities[i].value = withDelay(
          100 + i * 80,
          withSpring(1, { damping: 15 })
        );
      }
    });
  }, [targetHeights, labels]);

  return (
    <View style={styles.row}>
      {labels.map((lb, i) => {
        const v = values[i] ?? 0;
        const s = steps[i] ?? 0;
        const met = v >= goalKm - 1e-6;
        
        const barStyle = useAnimatedStyle(() => ({
          height: interpolate(animatedHeights[i].value, [0, 1], [4, 96]),
        }));
        
        const labelStyle = useAnimatedStyle(() => ({
          opacity: animatedOpacities[i].value,
        }));
        
        const checkStyle = useAnimatedStyle(() => ({
          opacity: animatedOpacities[i].value,
        }));
        
        const stepsStyle = useAnimatedStyle(() => ({
          opacity: animatedOpacities[i].value,
        }));
        
        return (
          <View key={`${lb}-${i}`} style={styles.col}>
            <Animated.View style={[styles.checkContainer, checkStyle]}>
              {met ? <Text style={styles.check}>✓</Text> : <View style={styles.checkSpacer} />}
            </Animated.View>
            
            <View style={styles.barTrack}>
              <Animated.View style={[styles.barFill, barStyle]} />
            </View>
            
            <Animated.Text style={[styles.lb, labelStyle]}>
              {lb}
            </Animated.Text>
            
            {s > 0 ? (
              <Animated.Text style={[styles.steps, stepsStyle]}>
                {s >= 1000 ? `${(s / 1000).toFixed(1)}k` : `${s}`}
              </Animated.Text>
            ) : (
              <View style={styles.stepsSpacer} />
            )}
          </View>
        );
      })}
    </View>
  );
}
