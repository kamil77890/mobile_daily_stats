import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors } from '../theme/colors';

type Props = {
  progress: number;
  centerLabel: string;
  subLabel?: string;
  size?: number;
  stroke?: number;
};

export function DonutGoal({
  progress,
  centerLabel,
  subLabel,
  size = 140,
  stroke = 14,
}: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  const dash = c * p;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.border}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.accent}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={styles.centerText}>{centerLabel}</Text>
        {subLabel ? <Text style={styles.sub}>{subLabel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'center',
  },
  sub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
});
