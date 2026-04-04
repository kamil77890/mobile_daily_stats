import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart3, TrendingUp } from 'lucide-react-native';

import { Card } from '../components/Card';
import { useAppStore } from '../store/useAppStore';
import type { RootStackParamList } from '../navigation/types';
import { useThemeColors } from '../theme/ThemeContext';
import { dayKey, monthMatrix, parseDayKey } from '../utils/dates';

export function StatsScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const parent = navigation.getParent();
  const [anchor, setAnchor] = useState(() => new Date());
  const history = useAppStore((s) => s.history);
  const dailyGoalKm = useAppStore((s) => s.dailyGoalKm);

  const matrix = useMemo(() => monthMatrix(anchor), [anchor]);
  const dk = dayKey();

  const totals = useMemo(() => {
    let steps = 0;
    let m = 0;
    let kcal = 0;
    let inc = 0;
    for (const v of Object.values(history)) {
      steps += v.steps;
      m += v.distanceM;
      kcal += v.kcal;
      inc += v.inclineM;
    }
    return { steps, m, kcal, inc };
  }, [history]);

  const today = history[dk] ?? {
    steps: 0,
    distanceM: 0,
    kcal: 0,
    inclineM: 0,
    goalMet: false,
  };

  const shiftMonth = (d: number) => {
    const n = new Date(anchor);
    n.setMonth(n.getMonth() + d);
    setAnchor(n);
  };

  const styles = StyleSheet.create({
    scroll: { flex: 1 },
    content: { paddingHorizontal: 16, gap: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    analyticsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
    analyticsBtnTxt: { fontSize: 13, fontWeight: '700' },
    title: { fontSize: 28, fontWeight: '800' },
    sub: { marginBottom: 8 },
    grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: { width: '48%', minHeight: 88 },
    tileLb: { fontSize: 12, fontWeight: '700' },
    tileVal: { fontSize: 22, fontWeight: '900', marginTop: 8 },
    big: { fontSize: 28, fontWeight: '900', marginTop: 8 },
    hint: { fontSize: 12, marginTop: 8, lineHeight: 18 },
    rowSm: { marginTop: 6, fontWeight: '600' },
    calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    calNav: { fontSize: 28, fontWeight: '800', paddingHorizontal: 12 },
    calTitle: { fontWeight: '800', fontSize: 16 },
    weekRow: { flexDirection: 'row', marginBottom: 6 },
    weekHd: { flex: 1, textAlign: 'center', fontSize: 11 },
    dayCell: { flex: 1, aspectRatio: 1, borderWidth: 2, borderRadius: 10, marginHorizontal: 2, alignItems: 'center', justifyContent: 'center' },
    dayNum: { fontWeight: '800' },
    dim: {},
    dot: { fontSize: 12, marginTop: 2, fontWeight: '900' },
    legend: { fontSize: 11, marginTop: 12, lineHeight: 16 },
  });

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={[styles.scroll, { backgroundColor: colors.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 40 }]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Stats</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>Steps, distance, calories, meters, incline</Text>
        </View>
        <TouchableOpacity
          style={[styles.analyticsBtn, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}
          onPress={() => parent?.navigate('Analytics')}
          activeOpacity={0.8}
        >
          <TrendingUp color={colors.accent} size={20} />
          <Text style={[styles.analyticsBtnTxt, { color: colors.accent }]}>Analytics</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid2}>
        <Card style={styles.tile}>
          <Text style={[styles.tileLb, { color: colors.textMuted }]}>Steps (today)</Text>
          <Text style={[styles.tileVal, { color: colors.accent }]}>{today.steps.toLocaleString()}</Text>
        </Card>
        <Card style={styles.tile}>
          <Text style={[styles.tileLb, { color: colors.textMuted }]}>KM (today)</Text>
          <Text style={[styles.tileVal, { color: colors.accent }]}>{(today.distanceM / 1000).toFixed(2)}</Text>
        </Card>
        <Card style={styles.tile}>
          <Text style={[styles.tileLb, { color: colors.textMuted }]}>Cal (today)</Text>
          <Text style={[styles.tileVal, { color: colors.accent }]}>{today.kcal}</Text>
        </Card>
        <Card style={styles.tile}>
          <Text style={[styles.tileLb, { color: colors.textMuted }]}>Meters (today)</Text>
          <Text style={[styles.tileVal, { color: colors.accent }]}>{Math.round(today.distanceM)}</Text>
        </Card>
      </View>

      <Card>
        <Text style={[styles.tileLb, { color: colors.textMuted }]}>Incline gain (today)</Text>
        <Text style={[styles.big, { color: colors.accent }]}>{Math.round(today.inclineM)} m</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>From GPS altitude while tracking workouts.</Text>
      </Card>

      <Card>
        <Text style={[styles.tileLb, { color: colors.textMuted }]}>All-time tracked (stored days)</Text>
        <Text style={[styles.rowSm, { color: colors.text }]}>Steps: {totals.steps.toLocaleString()}</Text>
        <Text style={[styles.rowSm, { color: colors.text }]}>Distance: {(totals.m / 1000).toFixed(1)} km</Text>
        <Text style={[styles.rowSm, { color: colors.text }]}>Calories (est.): {totals.kcal}</Text>
        <Text style={[styles.rowSm, { color: colors.text }]}>Incline: {Math.round(totals.inc)} m</Text>
      </Card>

      <Card>
        <View style={styles.calHead}>
          <TouchableOpacity onPress={() => shiftMonth(-1)}>
            <Text style={[styles.calNav, { color: colors.accent }]}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={[styles.calTitle, { color: colors.text }]}>
            {anchor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => shiftMonth(1)}>
            <Text style={[styles.calNav, { color: colors.accent }]}>{'›'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.weekRow}>
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((w) => (
            <Text key={w} style={[styles.weekHd, { color: colors.textMuted }]}>
              {w}
            </Text>
          ))}
        </View>
        {matrix.map((row, ri) => (
          <View key={ri} style={styles.weekRow}>
            {row.map((cell) => {
              const h = history[cell.key];
              const active = h && (h.distanceM > 2 || h.steps > 0);
              const ok = h?.goalMet;
              const borderColor = !cell.inMonth
                ? colors.border
                : !active
                  ? colors.border
                  : ok
                    ? colors.accent
                    : colors.textMuted;
              return (
                <View key={cell.key} style={[styles.dayCell, { backgroundColor: colors.bg, borderColor }]}>
                  <Text style={[styles.dayNum, { color: colors.text }, !cell.inMonth && { color: colors.textMuted }]}>
                    {parseDayKey(cell.key).getDate()}
                  </Text>
                  {active ? <Text style={[styles.dot, { color: colors.text }]}>{ok ? '✓' : '×'}</Text> : null}
                </View>
              );
            })}
          </View>
        ))}
        <Text style={[styles.legend, { color: colors.textMuted }]}>
          Lime ring: hit {dailyGoalKm} km (or step-equivalent). Grey ring: moved but under goal. Dot only when
          there is data for that day.
        </Text>
      </Card>
    </ScrollView>
  );
}
