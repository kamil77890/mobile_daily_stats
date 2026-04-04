import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, TrendingUp, Award, Clock, Footprints, Flame } from 'lucide-react-native';

import { AnimatedCard } from '../components/AnimatedCard';
import { useAppStore } from '../store/useAppStore';
import { useThemeColors } from '../theme/ThemeContext';
import { dayKey, lastNDayKeys, parseDayKey } from '../utils/dates';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function AnalyticsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  
  const history = useAppStore(s => s.history);
  const sessions = useAppStore(s => s.sessions);
  const gamification = useAppStore(s => s.gamification);

  const dayKeys = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    return lastNDayKeys(days);
  }, [timeRange]);

  const analytics = useMemo(() => {
    let totalSteps = 0;
    let totalDistance = 0;
    let totalCalories = 0;
    let totalIncline = 0;
    let activeDays = 0;
    let maxSteps = 0;
    let maxDistance = 0;
    let maxCalories = 0;

    dayKeys.forEach(key => {
      const day = history[key];
      if (day) {
        totalSteps += day.steps;
        totalDistance += day.distanceM / 1000;
        totalCalories += day.kcal;
        totalIncline += day.inclineM;
        if (day.steps > 0 || day.distanceM > 0) activeDays++;
        maxSteps = Math.max(maxSteps, day.steps);
        maxDistance = Math.max(maxDistance, day.distanceM / 1000);
        maxCalories = Math.max(maxCalories, day.kcal);
      }
    });

    const avgSteps = activeDays > 0 ? Math.round(totalSteps / activeDays) : 0;
    const avgDistance = activeDays > 0 ? (totalDistance / activeDays).toFixed(2) : '0';
    const avgCalories = activeDays > 0 ? Math.round(totalCalories / activeDays) : 0;

    return {
      totalSteps,
      totalDistance: totalDistance.toFixed(1),
      totalCalories,
      totalIncline: Math.round(totalIncline),
      avgSteps,
      avgDistance,
      avgCalories,
      activeDays,
      maxSteps,
      maxDistance: maxDistance.toFixed(2),
      maxCalories,
    };
  }, [history, dayKeys]);

  // Personal Records
  const personalRecords = useMemo(() => {
    let bestDay: { key: string; steps: number; distance: number; calories: number } | null = null;
    
    Object.entries(history).forEach(([key, data]) => {
      if (!bestDay || data.steps > bestDay.steps) {
        bestDay = { key, steps: data.steps, distance: data.distanceM / 1000, calories: data.kcal };
      }
    });

    // Find longest streak
    let longestStreak = 0;
    let currentStreak = 0;
    const sortedDays = Object.entries(history)
      .filter(([, data]) => data.steps > 0 || data.distanceM > 0)
      .sort((a, b) => a[0].localeCompare(b[0]));
    
    for (let i = 0; i < sortedDays.length; i++) {
      if (i === 0 || sortedDays[i][0] === sortedDays[i - 1][0].slice(0, 10)) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return {
      bestDay,
      longestStreak,
      totalWorkouts: sessions.length,
      level: gamification.level,
      achievements: gamification.unlockedAchievements.length,
    };
  }, [history, sessions, gamification]);

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    const months: Record<string, { steps: number; distance: number; days: number }> = {};
    
    Object.entries(history).forEach(([key, data]) => {
      const month = key.slice(0, 7); // YYYY-MM
      if (!months[month]) {
        months[month] = { steps: 0, distance: 0, days: 0 };
      }
      months[month].steps += data.steps;
      months[month].distance += data.distanceM / 1000;
      if (data.steps > 0 || data.distanceM > 0) months[month].days++;
    });

    return Object.entries(months)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6)
      .map(([month, data]) => ({
        month: MONTH_SHORT[new Date(month).getMonth()],
        ...data,
      }));
  }, [history]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingHorizontal: 16,
      gap: 12,
    },
    title: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '900',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 15,
      marginBottom: 12,
    },
    rangeContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    rangeBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.card,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    rangeBtnActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    rangeTxt: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    rangeTxtActive: {
      color: colors.bg,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 14,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 14,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statItem: {
      width: '48%',
      backgroundColor: colors.bg,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
    },
    statIcon: {
      marginBottom: 6,
    },
    statValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 4,
      textAlign: 'center',
    },
    avgRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avgItem: {
      flex: 1,
      alignItems: 'center',
    },
    avgValue: {
      color: colors.accent,
      fontSize: 16,
      fontWeight: '800',
    },
    avgLabel: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 4,
    },
    avgDivider: {
      width: 1,
      height: 40,
      backgroundColor: colors.border,
    },
    recordItem: {
      marginBottom: 14,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    recordHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    recordLabel: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    recordValue: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: '800',
    },
    recordSub: {
      color: colors.textMuted,
      fontSize: 12,
    },
    monthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      gap: 10,
    },
    monthName: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      width: 35,
    },
    monthBars: {
      flex: 1,
    },
    monthBarContainer: {
      height: 8,
      backgroundColor: colors.bg,
      borderRadius: 4,
      overflow: 'hidden',
    },
    monthBar: {
      height: '100%',
      backgroundColor: colors.accent,
      borderRadius: 4,
    },
    monthValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      width: 50,
      textAlign: 'right',
    },
    peakGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    peakItem: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    peakValue: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
      textAlign: 'center',
    },
    peakLabel: {
      color: colors.textMuted,
      fontSize: 10,
      textAlign: 'center',
    },
  });

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 40 }]}
    >
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>Deep dive into your activity</Text>

      {/* Time Range Selector */}
      <View style={styles.rangeContainer}>
        {(['7d', '30d', '90d'] as const).map(range => (
          <TouchableOpacity
            key={range}
            style={[styles.rangeBtn, timeRange === range && styles.rangeBtnActive]}
            onPress={() => setTimeRange(range)}
            activeOpacity={0.8}
          >
            <Text style={[styles.rangeTxt, timeRange === range && styles.rangeTxtActive]}>
              {range === '7d' ? 'Week' : range === '30d' ? 'Month' : '90 Days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary Stats */}
      <AnimatedCard delay={100}>
        <View style={styles.summaryGrid}>
          <StatItem
            icon={<Footprints color={colors.accent} size={20} />}
            label="Total Steps"
            value={analytics.totalSteps.toLocaleString()}
          />
          <StatItem
            icon={<TrendingUp color={colors.accent} size={20} />}
            label="Total Distance"
            value={`${analytics.totalDistance} km`}
          />
          <StatItem
            icon={<Flame color={colors.accent} size={20} />}
            label="Calories Burned"
            value={analytics.totalCalories.toLocaleString()}
          />
          <StatItem
            icon={<Calendar color={colors.accent} size={20} />}
            label="Active Days"
            value={analytics.activeDays.toString()}
          />
        </View>
      </AnimatedCard>

      {/* Averages */}
      <AnimatedCard delay={200}>
        <Text style={styles.cardTitle}>Daily Averages</Text>
        <View style={styles.avgRow}>
          <AvgItem label="Steps" value={analytics.avgSteps.toLocaleString()} />
          <View style={styles.avgDivider} />
          <AvgItem label="Distance" value={`${analytics.avgDistance} km`} />
          <View style={styles.avgDivider} />
          <AvgItem label="Calories" value={analytics.avgCalories.toLocaleString()} />
        </View>
      </AnimatedCard>

      {/* Personal Records */}
      <AnimatedCard delay={300}>
        <View style={styles.cardHeader}>
          <Award color={colors.accent} size={20} />
          <Text style={styles.cardTitle}>Personal Records</Text>
        </View>
        
        {personalRecords.bestDay && (
          <RecordItem
            label="Best Day"
            value={`${personalRecords.bestDay.steps.toLocaleString()} steps`}
            sub={`${(personalRecords.bestDay.distance).toFixed(1)} km on ${personalRecords.bestDay.key}`}
          />
        )}
        <RecordItem
          label="Longest Streak"
          value={`${personalRecords.longestStreak} days`}
          sub="Consecutive days active"
        />
        <RecordItem
          label="Total Workouts"
          value={personalRecords.totalWorkouts.toString()}
          sub="All tracked sessions"
        />
        <RecordItem
          label="Current Level"
          value={`Level ${personalRecords.level}`}
          sub={`${personalRecords.achievements} achievements unlocked`}
        />
      </AnimatedCard>

      {/* Monthly Breakdown */}
      <AnimatedCard delay={400}>
        <Text style={styles.cardTitle}>Monthly Breakdown</Text>
        {monthlyData.map((month, idx) => (
          <View key={month.month} style={styles.monthRow}>
            <Text style={styles.monthName}>{month.month}</Text>
            <View style={styles.monthBars}>
              <View style={styles.monthBarContainer}>
                <View
                  style={[
                    styles.monthBar,
                    { width: `${Math.min(100, (month.distance / 100) * 100)}%` },
                  ]}
                />
              </View>
            </View>
            <Text style={styles.monthValue}>{month.distance.toFixed(0)} km</Text>
          </View>
        ))}
      </AnimatedCard>

      {/* Max Records */}
      <AnimatedCard delay={500}>
        <Text style={styles.cardTitle}>Peak Performance</Text>
        <View style={styles.peakGrid}>
          <PeakItem
            icon={<Footprints color={colors.accent} size={18} />}
            label="Most Steps"
            value={analytics.maxSteps.toLocaleString()}
          />
          <PeakItem
            icon={<TrendingUp color={colors.accent} size={18} />}
            label="Longest Walk"
            value={`${analytics.maxDistance} km`}
          />
          <PeakItem
            icon={<Flame color={colors.accent} size={18} />}
            label="Most Calories"
            value={analytics.maxCalories.toLocaleString()}
          />
        </View>
      </AnimatedCard>
    </ScrollView>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View style={{ marginBottom: 8 }}>{icon}</View>
      <Text style={{ fontSize: 18, fontWeight: '900', color: '#ffffff' }}>{value}</Text>
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#9a9a9a', marginTop: 4 }}>{label}</Text>
    </View>
  );
}

function AvgItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '900', color: '#ffffff' }}>{value}</Text>
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#9a9a9a', marginTop: 4 }}>{label}</Text>
    </View>
  );
}

function RecordItem({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 13, color: '#9a9a9a', fontWeight: '600' }}>{label}</Text>
        <Text style={{ fontSize: 14, color: '#ffffff', fontWeight: '700' }}>{value}</Text>
      </View>
      <Text style={{ fontSize: 11, color: '#9a9a9a' }}>{sub}</Text>
    </View>
  );
}

function PeakItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {icon}
      <Text style={{ fontSize: 18, fontWeight: '900', color: '#ffffff' }}>{value}</Text>
      <Text style={{ fontSize: 12, color: '#9a9a9a' }}>{label}</Text>
    </View>
  );
}
