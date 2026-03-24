import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../components/Card';
import { useAppStore } from '../store/useAppStore';
import { colors } from '../theme/colors';
import { dayKey, monthMatrix, parseDayKey } from '../utils/dates';

export function StatsScreen() {
  const insets = useSafeAreaInsets();
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

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 40 }]}
    >
      <Text style={styles.title}>Stats</Text>
      <Text style={styles.sub}>Steps, distance, calories, meters, incline</Text>

      <View style={styles.grid2}>
        <Card style={styles.tile}>
          <Text style={styles.tileLb}>Steps (today)</Text>
          <Text style={styles.tileVal}>{today.steps.toLocaleString()}</Text>
        </Card>
        <Card style={styles.tile}>
          <Text style={styles.tileLb}>KM (today)</Text>
          <Text style={styles.tileVal}>{(today.distanceM / 1000).toFixed(2)}</Text>
        </Card>
        <Card style={styles.tile}>
          <Text style={styles.tileLb}>Cal (today)</Text>
          <Text style={styles.tileVal}>{today.kcal}</Text>
        </Card>
        <Card style={styles.tile}>
          <Text style={styles.tileLb}>Meters (today)</Text>
          <Text style={styles.tileVal}>{Math.round(today.distanceM)}</Text>
        </Card>
      </View>

      <Card>
        <Text style={styles.tileLb}>Incline gain (today)</Text>
        <Text style={styles.big}>{Math.round(today.inclineM)} m</Text>
        <Text style={styles.hint}>From GPS altitude while tracking workouts.</Text>
      </Card>

      <Card>
        <Text style={styles.tileLb}>All-time tracked (stored days)</Text>
        <Text style={styles.rowSm}>Steps: {totals.steps.toLocaleString()}</Text>
        <Text style={styles.rowSm}>Distance: {(totals.m / 1000).toFixed(1)} km</Text>
        <Text style={styles.rowSm}>Calories (est.): {totals.kcal}</Text>
        <Text style={styles.rowSm}>Incline: {Math.round(totals.inc)} m</Text>
      </Card>

      <Card>
        <View style={styles.calHead}>
          <TouchableOpacity onPress={() => shiftMonth(-1)}>
            <Text style={styles.calNav}>{'‹'}</Text>
          </TouchableOpacity>
          <Text style={styles.calTitle}>
            {anchor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => shiftMonth(1)}>
            <Text style={styles.calNav}>{'›'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.weekRow}>
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((w) => (
            <Text key={w} style={styles.weekHd}>
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
                <View key={cell.key} style={[styles.dayCell, { borderColor }]}>
                  <Text style={[styles.dayNum, !cell.inMonth && styles.dim]}>
                    {parseDayKey(cell.key).getDate()}
                  </Text>
                  {active ? <Text style={styles.dot}>{ok ? '✓' : '×'}</Text> : null}
                </View>
              );
            })}
          </View>
        ))}
        <Text style={styles.legend}>
          Lime ring: hit {dailyGoalKm} km (or step-equivalent). Grey ring: moved but under goal. Dot only when
          there is data for that day.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 16, gap: 12 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  sub: { color: colors.textMuted, marginBottom: 8 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', minHeight: 88 },
  tileLb: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  tileVal: { color: colors.accent, fontSize: 22, fontWeight: '900', marginTop: 8 },
  big: { color: colors.accent, fontSize: 28, fontWeight: '900', marginTop: 8 },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 8, lineHeight: 18 },
  rowSm: { color: colors.text, marginTop: 6, fontWeight: '600' },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  calNav: { color: colors.accent, fontSize: 28, fontWeight: '800', paddingHorizontal: 12 },
  calTitle: { color: colors.text, fontWeight: '800', fontSize: 16 },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekHd: { flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 11 },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 2,
    borderRadius: 10,
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  dayNum: { color: colors.text, fontWeight: '800' },
  dim: { color: colors.textMuted },
  dot: { color: colors.text, fontSize: 12, marginTop: 2, fontWeight: '900' },
  legend: { color: colors.textMuted, fontSize: 11, marginTop: 12, lineHeight: 16 },
});
