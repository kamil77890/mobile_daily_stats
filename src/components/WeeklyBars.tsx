import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type Props = {
  labels: string[];
  values: number[];
  goalKm: number;
  maxVal: number;
};

export function WeeklyBars({ labels, values, goalKm, maxVal }: Props) {
  const cap = Math.max(maxVal, goalKm, 0.001);
  return (
    <View style={styles.row}>
      {labels.map((lb, i) => {
        const v = values[i] ?? 0;
        const h = Math.min(1, v / cap);
        const met = v >= goalKm - 1e-6;
        return (
          <View key={`${lb}-${i}`} style={styles.col}>
            {met ? <Text style={styles.check}>✓</Text> : <View style={styles.checkSpacer} />}
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: Math.max(4, Math.round(96 * h)) }]} />
            </View>
            <Text style={styles.lb}>{lb}</Text>
          </View>
        );
      })}
    </View>
  );
}

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
  check: {
    color: colors.accent,
    fontSize: 14,
    marginBottom: 4,
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
});
