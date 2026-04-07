import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import { Check, Edit2, Target, TrendingUp } from 'lucide-react-native';

import { useThemeColors } from '../theme/ThemeContext';
import type { DailyGoal } from '../store/types';
import { dayKey } from '../utils/dates';
import { goalCompletedHaptic } from '../utils/haptics';

type Props = {
  goal: DailyGoal;
  onComplete: (id: string) => void;
  onEdit: (goal: DailyGoal) => void;
  onDelete: (id: string) => void;
};

export function CustomGoalCard({ goal, onComplete, onEdit, onDelete }: Props) {
  const colors = useThemeColors();
  const [scale] = useState(new Animated.Value(1));

  const today = dayKey();
  const isCompletedToday = goal.lastCompletedDate === today;
  const progress = goal.targetValue > 0 ? goal.currentValue / goal.targetValue : 0;
  const progressPercent = Math.min(100, Math.round(progress * 100));

  const handleComplete = () => {
    if (isCompletedToday) return; // Already completed today, prevent double-click

    void goalCompletedHaptic();
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.1, useNativeDriver: true, damping: 10 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 10 }),
    ]).start(() => {
      onComplete(goal.id);
    });
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: isCompletedToday ? colors.accent + '11' : colors.card,
      borderRadius: 20,
      padding: 16,
      borderWidth: isCompletedToday ? 2 : 1,
      borderColor: isCompletedToday ? colors.accent : colors.border,
      marginBottom: 12,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    titleSection: {
      flex: 1,
    },
    title: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
    },
    iconButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.cardElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressSection: {
      marginBottom: 12,
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    currentValue: {
      color: colors.accent,
      fontSize: 24,
      fontWeight: '900',
    },
    targetValue: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    progressBar: {
      height: 8,
      backgroundColor: colors.cardElevated,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.accent,
      borderRadius: 4,
    },
    progressText: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 4,
      textAlign: 'right',
    },
    completeButton: {
      backgroundColor: isCompletedToday ? colors.accent : colors.cardElevated,
      borderRadius: 14,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: isCompletedToday ? colors.accent : colors.border,
      opacity: isCompletedToday ? 0.9 : 1,
    },
    completeButtonText: {
      color: isCompletedToday ? colors.bg : colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    incrementBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.accent + '22',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginTop: 8,
    },
    incrementText: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: '700',
    },
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onEdit(goal)}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>{goal.name}</Text>
          <Text style={styles.subtitle}>Daily goal</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => onEdit(goal)}
            activeOpacity={0.7}
          >
            <Edit2 color={colors.textMuted} size={14} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          <Text style={styles.currentValue}>{goal.currentValue}</Text>
          <Text style={styles.targetValue}>/ {goal.targetValue} {goal.unit}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.progressText}>{progressPercent}%</Text>
      </View>

      {/* Increment badge */}
      <View style={styles.incrementBadge}>
        <TrendingUp color={colors.accent} size={10} />
        <Text style={styles.incrementText}>+{goal.dailyIncrement}/day</Text>
      </View>

      {/* Complete button */}
      <Animated.View style={{ marginTop: 12, transform: [{ scale }] }}>
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleComplete}
          activeOpacity={0.8}
          disabled={isCompletedToday}
        >
          <Check color={isCompletedToday ? colors.bg : colors.accent} size={18} />
          <Text style={styles.completeButtonText}>
            {isCompletedToday ? 'Completed ✓' : 'Mark as Done'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </TouchableOpacity>
  );
}
