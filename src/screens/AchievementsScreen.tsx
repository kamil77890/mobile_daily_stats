import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ArrowLeft } from 'lucide-react-native';

import { useAppStore } from '../store/useAppStore';
import type { Achievement, AchievementTier } from '../store/achievementsTypes';
import { ACHIEVEMENTS, TIER_COLORS } from '../store/achievementsTypes';
import { ACCENT_COLOR_VALUES, type AccentColor } from '../theme/accentColors';
import { useThemeColors } from '../theme/ThemeContext';

type CategoryFilter = 'all' | Achievement['category'];

const CATEGORIES: { id: CategoryFilter; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '🎯' },
  { id: 'distance', label: 'Distance', emoji: '📏' },
  { id: 'steps', label: 'Steps', emoji: '👣' },
  { id: 'streak', label: 'Streaks', emoji: '🔥' },
  { id: 'goals', label: 'Goals', emoji: '✅' },
  { id: 'special', label: 'Special', emoji: '⭐' },
];

export function AchievementsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const selectedAccent = useAppStore(s => s.accentColor);

  const unlockedAchievements = useAppStore(s => s.gamification.unlockedAchievements);
  const xp = useAppStore(s => s.gamification.xp);
  const level = useAppStore(s => s.gamification.level);

  const filteredAchievements = useMemo(() => {
    if (selectedCategory === 'all') return ACHIEVEMENTS;
    return ACHIEVEMENTS.filter(a => a.category === selectedCategory);
  }, [selectedCategory]);

  const unlockedCount = unlockedAchievements.length;
  const totalCount = ACHIEVEMENTS.length;
  const progressPercent = (unlockedCount / totalCount) * 100;

  const accentColor = ACCENT_COLOR_VALUES[selectedAccent] || colors.accent;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingHorizontal: 16,
      gap: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    headerTitle: {
      marginBottom: 8,
    },
    title: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '900',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 15,
      marginTop: 4,
    },
    levelCard: {
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      gap: 16,
    },
    levelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    levelLeft: {
      gap: 6,
    },
    levelLabel: {
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 1,
    },
    xpValue: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '800',
    },
    ringContainer: {
      width: 80,
      height: 80,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringCenter: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringPercent: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '900',
    },
    levelSub: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: 'center',
    },
    categoryScroll: {
      maxHeight: 44,
    },
    categoryContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryLabel: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    categoryLabelActive: {
      color: colors.bg,
    },
    categoryEmoji: {
      fontSize: 16,
    },
    achievementsGrid: {
      gap: 12,
    },
    achievementCard: {
      flexDirection: 'row',
      borderRadius: 16,
      padding: 14,
      gap: 12,
      borderWidth: 1,
    },
    achievementIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
    },
    achievementEmoji: {
      fontSize: 28,
    },
    achievementInfo: {
      flex: 1,
      justifyContent: 'center',
      gap: 6,
    },
    achievementTitle: {
      fontSize: 15,
      fontWeight: '800',
    },
    achievementDescription: {
      fontSize: 12,
      lineHeight: 16,
    },
    achievementFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 2,
    },
    tierBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: colors.bg,
    },
    tierText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    achievementXp: {
      fontSize: 11,
      fontWeight: '700',
    },
  });

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 40 }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <ArrowLeft color={colors.text} size={20} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Achievements</Text>
          <Text style={styles.subtitle}>
            Unlock badges by completing challenges
          </Text>
        </View>
      </View>

      {/* Level & Progress Ring Card */}
      <View style={[styles.levelCard, { backgroundColor: accentColor + '11', borderColor: accentColor + '44' }]}>
        <View style={styles.levelHeader}>
          <View style={styles.levelLeft}>
            <Text style={[styles.levelLabel, { color: accentColor }]}>LEVEL {level}</Text>
            <Text style={styles.xpValue}>{xp.toLocaleString()} XP</Text>
          </View>
          <View style={styles.ringContainer}>
            <ProgressRing
              progress={progressPercent / 100}
              size={80}
              stroke={8}
              color={accentColor}
            />
            <View style={styles.ringCenter}>
              <Text style={styles.ringPercent}>{Math.round(progressPercent)}%</Text>
            </View>
          </View>
        </View>
        <Text style={styles.levelSub}>{unlockedCount} of {totalCount} achievements unlocked</Text>
      </View>

      {/* Category Filter */}
      <ScrollView
      showsVerticalScrollIndicator={false}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              selectedCategory === cat.id && { backgroundColor: accentColor, borderColor: accentColor },
            ]}
            onPress={() => setSelectedCategory(cat.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            <Text
              style={[
                styles.categoryLabel,
                selectedCategory === cat.id && styles.categoryLabelActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Achievements Grid */}
      <View style={styles.achievementsGrid}>
        {filteredAchievements.map(achievement => {
          const isUnlocked = unlockedAchievements.includes(achievement.id);
          return (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              isUnlocked={isUnlocked}
              accentColor={accentColor}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

function ProgressRing({ progress, size, stroke, color }: { progress: number; size: number; stroke: number; color: string }) {
  const colors = useThemeColors();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - progress * c;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={color} />
          <Stop offset="100%" stopColor="#FF4500" />
        </LinearGradient>
      </Defs>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={colors.bg}
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={`url(#ringGradient)`}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${c}, ${c}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

function AchievementCard({
  achievement,
  isUnlocked,
  accentColor,
}: {
  achievement: Achievement;
  isUnlocked: boolean;
  accentColor: string;
}) {
  const colors = useThemeColors();
  const tierColor = isUnlocked ? TIER_COLORS[achievement.tier] : colors.border;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 8, backgroundColor: tierColor + '11', borderColor: tierColor + '44' }}>
      <View
        style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginRight: 12, backgroundColor: tierColor + '22', borderColor: tierColor }}
      >
        <Text style={{ fontSize: 28 }}>
          {isUnlocked ? achievement.emoji : '🔒'}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{ color: isUnlocked ? tierColor : colors.textMuted, fontSize: 14, fontWeight: '700' }}
        >
          {achievement.title}
        </Text>
        <Text
          style={{ color: isUnlocked ? colors.textMuted : colors.border, fontSize: 11, marginTop: 2 }}
          numberOfLines={2}
        >
          {isUnlocked ? achievement.description : '???'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
          <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: tierColor + '22' }}>
            <Text style={{ color: tierColor, fontSize: 9, fontWeight: '700' }}>
              {achievement.tier.toUpperCase()}
            </Text>
          </View>
          {isUnlocked && (
            <Text style={{ color: accentColor, fontSize: 12, fontWeight: '700' }}>+{achievement.xpReward} XP</Text>
          )}
        </View>
      </View>
    </View>
  );
}
