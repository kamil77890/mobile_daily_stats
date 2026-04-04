import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../theme/ThemeContext';

type Trend = 'up' | 'down' | 'neutral';

type Props = {
  label: string;
  value: string | number;
  trend?: Trend;
  trendValue?: string;
  icon?: string;
  color?: string;
};

export function StatsCard({
  label,
  value,
  trend,
  trendValue,
  icon,
  color,
}: Props) {
  const colors = useThemeColors();
  const resolvedColor = color ?? colors.accent;
  const getTrendIcon = () => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '→';
  };

  const getTrendColor = () => {
    if (trend === 'up') return '#2ed573';
    if (trend === 'down') return '#ff4757';
    return colors.textMuted;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: resolvedColor + '44' }]}>
      <View style={styles.header}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: resolvedColor }]}>{value}</Text>
      {trend && trendValue && (
        <View style={styles.trendRow}>
          <Text style={[styles.trendIcon, { color: getTrendColor() }]}>
            {getTrendIcon()}
          </Text>
          <Text style={[styles.trendValue, { color: getTrendColor() }]}>
            {trendValue}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 24,
    fontWeight: '900',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendIcon: {
    fontSize: 12,
    fontWeight: '800',
  },
  trendValue: {
    fontSize: 11,
    fontWeight: '700',
  },
});
