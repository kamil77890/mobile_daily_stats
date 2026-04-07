import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import { dayKey, lastNDayKeys, parseDayKey } from '../utils/dates';

type Props = {
  selectedDayKey: string;
  onDaySelect: (dk: string) => void;
  history: Record<string, { steps: number; distanceM: number }>;
};

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function InlineMapDaySelector({ selectedDayKey, onDaySelect, history }: Props) {
  const colors = useThemeColors();
  const days = lastNDayKeys(14);
  const today = dayKey();

  return (
    <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 8, paddingVertical: 6 }}>
      {days.map((dk) => {
        const isSelected = dk === selectedDayKey;
        const isToday = dk === today;
        const d = parseDayKey(dk);
        const dayLetter = WEEKDAY_LETTERS[d.getDay()];
        const dayNum = d.getDate();
        const hasData = history[dk] && (history[dk]!.steps > 0 || history[dk]!.distanceM > 0);

        return (
          <TouchableOpacity
            key={dk}
            style={[
              styles.dayPill,
              {
                backgroundColor: isSelected ? colors.accent : colors.cardElevated,
                borderColor: isSelected ? colors.accent : colors.border,
              },
            ]}
            onPress={() => onDaySelect(dk)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.dayLetter,
                { color: isSelected ? colors.bg : colors.textMuted },
              ]}
            >
              {dayLetter}
            </Text>
            <Text
              style={[
                styles.dayNumber,
                { color: isSelected ? colors.bg : colors.text },
              ]}
            >
              {dayNum}
            </Text>
            {hasData && !isSelected && (
              <View style={[styles.dataDot, { backgroundColor: colors.accent }]} />
            )}
            {isToday && isSelected && (
              <View style={[styles.todayBadge, { backgroundColor: colors.bg }]} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dayPill: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 6,
    minWidth: 28,
    borderWidth: 1,
    position: 'relative',
  },
  dayLetter: {
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
  dayNumber: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
  },
  dataDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  todayBadge: {
    position: 'absolute',
    bottom: 1,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
