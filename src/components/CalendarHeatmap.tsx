import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '../theme/ThemeContext';

type Props = {
  data: { date: string; value: number }[];
  maxVal?: number;
  showLabels?: boolean;
};

export function CalendarHeatmap({ data, maxVal, showLabels = true }: Props) {
  const colors = useThemeColors();
  const weeks = useMemo(() => {
    const result: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 83);

    const startDay = startDate.getDay();
    for (let i = 0; i < startDay; i++) {
      currentWeek.push(null);
    }

    for (let i = 0; i < 84; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];

      const item = data.find(d => d.date === dateKey);
      currentWeek.push(item ? item.value : 0);

      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      result.push(currentWeek);
    }

    return result;
  }, [data]);

  const maxValue = maxVal || Math.max(...data.map(d => d.value), 1);

  const getColor = (value: number | null) => {
    if (value === null || value === 0) return colors.border;
    const ratio = value / maxValue;
    if (ratio >= 0.8) return colors.accent;
    if (ratio >= 0.6) return '#aadd00';
    if (ratio >= 0.4) return '#88aa00';
    if (ratio >= 0.2) return '#668800';
    return '#446600';
  };

  const dayLabels = ['P', 'W', 'Ś', 'C', 'P', 'S', 'N'];

  return (
    <View style={styles.container}>
      {showLabels && (
        <View style={styles.labelsRow}>
          {dayLabels.map((label, i) => (
            <Text key={i} style={[styles.labelText, { color: colors.textMuted }]}>{label}</Text>
          ))}
        </View>
      )}
      <View style={styles.grid}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekColumn}>
            {week.map((value, dayIndex) => (
              <View
                key={dayIndex}
                style={[
                  styles.cell,
                  { backgroundColor: getColor(value) },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  labelsRow: {
    gap: 3,
    marginRight: 6,
  },
  labelText: {
    fontSize: 9,
    fontWeight: '600',
    height: 10,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    gap: 3,
  },
  weekColumn: {
    gap: 3,
  },
  cell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
