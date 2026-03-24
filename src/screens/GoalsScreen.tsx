import { ChevronLeft, Minus, Plus } from 'lucide-react-native';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ensureBackgroundWalkingStarted } from '../background/backgroundWalkingService';
import { colors } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';

type Props = { navigation: { goBack: () => void } };

export function GoalsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const dailyGoalKm = useAppStore((s) => s.dailyGoalKm);
  const dailyGoalCalories = useAppStore((s) => s.dailyGoalCalories);
  const setDailyGoalKm = useAppStore((s) => s.setDailyGoalKm);
  const setDailyGoalCalories = useAppStore((s) => s.setDailyGoalCalories);
  const backgroundWalkingEnabled = useAppStore((s) => s.backgroundWalkingEnabled);
  const setBackgroundWalkingEnabled = useAppStore((s) => s.setBackgroundWalkingEnabled);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color={colors.text} size={26} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Daily goals</Text>
        <View style={{ width: 44 }} />
      </View>

      <Text style={styles.h1}>Distance & calories</Text>
      <Text style={styles.sub}>
        Distance defaults to 3 km per day. Calories power your summary ring target.
      </Text>

      <View style={styles.bgRow}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.bgTitle}>All-day walking (background)</Text>
          <Text style={styles.bgSub}>
            Keeps GPS walking on automatically as Walking. Segments faster than ~25 km/h (car/train) are not
            counted toward km. Uses notifications on Android; iOS may ask for Always location. Pauses while you
            use Start workout.
          </Text>
        </View>
        <Switch
          value={backgroundWalkingEnabled}
          onValueChange={(v) => {
            setBackgroundWalkingEnabled(v);
            void ensureBackgroundWalkingStarted();
          }}
          trackColor={{ false: colors.border, true: colors.accentMuted }}
          thumbColor={backgroundWalkingEnabled ? colors.accent : colors.textMuted}
        />
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>KM / DAY</Text>
        <View style={styles.stepRow}>
          <TouchableOpacity
            style={styles.round}
            onPress={() => setDailyGoalKm(dailyGoalKm + 0.5)}
          >
            <Plus color={colors.bg} size={28} strokeWidth={3} />
          </TouchableOpacity>
          <Text style={styles.big}>{dailyGoalKm.toFixed(1)}</Text>
          <TouchableOpacity
            style={styles.round}
            onPress={() => setDailyGoalKm(dailyGoalKm - 0.5)}
          >
            <Minus color={colors.bg} size={28} strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.block}>
        <Text style={styles.label}>CALORIES / DAY (TARGET)</Text>
        <View style={styles.stepRow}>
          <TouchableOpacity
            style={styles.round}
            onPress={() => setDailyGoalCalories(dailyGoalCalories + 100)}
          >
            <Plus color={colors.bg} size={28} strokeWidth={3} />
          </TouchableOpacity>
          <Text style={styles.big}>{dailyGoalCalories.toLocaleString()}</Text>
          <TouchableOpacity
            style={styles.round}
            onPress={() => setDailyGoalCalories(dailyGoalCalories - 100)}
          >
            <Minus color={colors.bg} size={28} strokeWidth={3} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }} />
      <TouchableOpacity style={styles.primary} onPress={() => navigation.goBack()}>
        <Text style={styles.primaryTxt}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
  h1: { color: colors.text, fontSize: 28, fontWeight: '800' },
  sub: { color: colors.textMuted, marginTop: 10, lineHeight: 20, marginBottom: 16 },
  bgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.cardElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bgTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  bgSub: { color: colors.textMuted, fontSize: 12, marginTop: 6, lineHeight: 18 },
  block: { marginBottom: 32 },
  label: {
    color: colors.text,
    fontWeight: '800',
    letterSpacing: 1,
    fontSize: 12,
    textAlign: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  round: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  big: { color: colors.text, fontSize: 40, fontWeight: '800' },
  primary: {
    marginBottom: 24,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: 'center',
  },
  primaryTxt: { color: colors.bg, fontWeight: '900', fontSize: 16 },
});
