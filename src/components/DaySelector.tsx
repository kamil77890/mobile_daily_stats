import { useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, FlatList, Dimensions } from 'react-native';

import { useThemeColors } from '../theme/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Day = {
  date: string;
  dayName: string;
  dayNum: number;
  isToday: boolean;
};

type Props = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  daysToShow?: number;
};

export function DaySelector({ selectedDate, onSelectDate, daysToShow = 14 }: Props) {
  const colors = useThemeColors();
  const flatListRef = useRef<FlatList>(null);

  const generateDays = (): Day[] => {
    const days: Day[] = [];
    const today = new Date();
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      days.push({
        date: date.toISOString().split('T')[0],
        dayName: dayNames[date.getDay()],
        dayNum: date.getDate(),
        isToday: i === 0,
      });
    }

    return days;
  };

  const days = generateDays();

  const scrollToSelected = () => {
    const selectedIndex = days.findIndex(d => d.date === selectedDate);
    if (selectedIndex >= 0 && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: selectedIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  };

  const handleSelectDate = (date: string) => {
    onSelectDate(date);
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.bg,
      paddingVertical: 12,
    },
    content: {
      paddingHorizontal: 16,
      gap: 10,
    },
    dayCard: {
      width: 52,
      height: 72,
      borderRadius: 16,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    selectedCard: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    todayCard: {
      borderColor: colors.accent,
    },
    dayName: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    dayNum: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    selectedText: {
      color: colors.bg,
    },
    todayText: {
      color: colors.accent,
    },
    todayIndicator: {
      position: 'absolute',
      bottom: 6,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.accent,
    },
  });

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={days}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.content}
        onContentSizeChange={scrollToSelected}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.dayCard,
              item.isToday && styles.todayCard,
              item.date === selectedDate && styles.selectedCard,
            ]}
            onPress={() => handleSelectDate(item.date)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.dayName,
                item.isToday && styles.todayText,
                item.date === selectedDate && styles.selectedText,
              ]}
            >
              {item.dayName}
            </Text>
            <Text
              style={[
                styles.dayNum,
                item.isToday && styles.todayText,
                item.date === selectedDate && styles.selectedText,
              ]}
            >
              {item.dayNum}
            </Text>
            {item.isToday && <View style={styles.todayIndicator} />}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
