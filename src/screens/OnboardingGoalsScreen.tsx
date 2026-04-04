import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Footprints, Flame, TrendingUp, Check } from 'lucide-react-native';

import { useThemeColors } from '../theme/ThemeContext';

type Props = {
  onComplete: (goals: { dailyGoalKm: number; dailyGoalCalories: number; strideM: number }) => void;
};

type GoalPreset = 'beginner' | 'intermediate' | 'advanced';

const PRESETS: Record<GoalPreset, { km: number; calories: number; label: string; description: string }> = {
  beginner: {
    km: 3,
    calories: 500,
    label: 'Beginner',
    description: '3 km / 500 kcal - Great for starting your fitness journey',
  },
  intermediate: {
    km: 6,
    calories: 1000,
    label: 'Intermediate',
    description: '6 km / 1000 kcal - For regular walkers building stamina',
  },
  advanced: {
    km: 10,
    calories: 1800,
    label: 'Advanced',
    description: '10 km / 1800 kcal - Challenge yourself with daily goals',
  },
};

export function OnboardingGoalsScreen({ onComplete }: Props) {
  const colors = useThemeColors();
  const [selectedPreset, setSelectedPreset] = useState<GoalPreset>('beginner');
  const [customKm, setCustomKm] = useState(3);
  const [customCalories, setCustomCalories] = useState(500);
  const [customMode, setCustomMode] = useState(false);

  const fade1 = useSharedValue(0);
  const fade2 = useSharedValue(0);
  const fade3 = useSharedValue(0);

  useEffect(() => {
    fade1.value = withTiming(1, { duration: 600 });
    fade2.value = withDelay(200, withTiming(1, { duration: 600 }));
    fade3.value = withDelay(400, withTiming(1, { duration: 600 }));
  }, []);

  const handlePresetSelect = (preset: GoalPreset) => {
    setSelectedPreset(preset);
    setCustomMode(false);
    setCustomKm(PRESETS[preset].km);
    setCustomCalories(PRESETS[preset].calories);
  };

  const handleContinue = () => {
    onComplete({
      dailyGoalKm: customKm,
      dailyGoalCalories: customCalories,
      strideM: 0.78,
    });
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 32 },
    header: { marginBottom: 24 },
    iconContainer: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    title: { fontSize: 28, fontWeight: '900', marginBottom: 8 },
    subtitle: { fontSize: 15, lineHeight: 22 },
    presetsContainer: { gap: 12, marginBottom: 24 },
    presetCard: { borderRadius: 16, padding: 16, borderWidth: 2 },
    presetCardSelected: { borderWidth: 2 },
    presetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    presetLabel: { fontSize: 17, fontWeight: '800' },
    presetLabelSelected: {},
    presetValue: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    presetDescription: { fontSize: 13, lineHeight: 18 },
    customSection: { marginBottom: 24 },
    customHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 16, padding: 16, borderWidth: 2 },
    customHeaderActive: {},
    customHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    customIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    customIconActive: {},
    customTitle: { fontSize: 16, fontWeight: '800' },
    customTitleActive: {},
    expandIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    expandIconActive: {},
    customControls: { marginTop: 16, gap: 16 },
    control: { borderRadius: 16, padding: 16, borderWidth: 1 },
    controlHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    controlLabel: { fontSize: 14, fontWeight: '700' },
    stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stepperBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    stepperTxt: { fontSize: 24, fontWeight: '900' },
    stepperValue: { minWidth: 100, alignItems: 'center' },
    stepperValueTxt: { fontSize: 24, fontWeight: '900' },
    summary: { borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1 },
    summaryLabel: { fontSize: 12, fontWeight: '700', marginBottom: 10, letterSpacing: 1 },
    summaryValues: { flexDirection: 'row', alignItems: 'center' },
    summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    summaryValue: { fontSize: 18, fontWeight: '900' },
    summaryDivider: { width: 1, height: 30 },
    button: { paddingVertical: 18, borderRadius: 999, alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
    buttonText: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  });

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.content}>
      <Animated.View style={[styles.header, { opacity: fade1 }]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.cardElevated }]}>
          <TrendingUp color={colors.accent} size={32} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Set Your Goals</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Choose a daily goal that matches your fitness level. You can adjust these anytime.
        </Text>
      </Animated.View>

      {/* Preset Cards */}
      <Animated.View style={[styles.presetsContainer, { opacity: fade2 }]}>
        <PresetCard
          preset="beginner"
          selected={selectedPreset === 'beginner' && !customMode}
          onSelect={() => handlePresetSelect('beginner')}
        />
        <PresetCard
          preset="intermediate"
          selected={selectedPreset === 'intermediate' && !customMode}
          onSelect={() => handlePresetSelect('intermediate')}
        />
        <PresetCard
          preset="advanced"
          selected={selectedPreset === 'advanced' && !customMode}
          onSelect={() => handlePresetSelect('advanced')}
        />
      </Animated.View>

      {/* Custom Option */}
      <Animated.View style={[styles.customSection, { opacity: fade3 }]}>
        <TouchableOpacity
          style={[styles.customHeader, { backgroundColor: colors.card, borderColor: colors.border }, customMode && { borderColor: colors.accent, backgroundColor: colors.cardElevated }]}
          onPress={() => setCustomMode(!customMode)}
          activeOpacity={0.8}
        >
          <View style={styles.customHeaderLeft}>
            <View style={[styles.customIcon, { backgroundColor: colors.bg }, customMode && { backgroundColor: colors.accent }]}>
              <Footprints color={customMode ? colors.bg : colors.textMuted} size={20} />
            </View>
            <Text style={[styles.customTitle, { color: colors.text }, customMode && { color: colors.accent }]}>
              Custom Goals
            </Text>
          </View>
          <View style={[styles.expandIcon, { backgroundColor: colors.bg }, customMode && { backgroundColor: colors.accent }]}>
            <Check color={customMode ? colors.bg : colors.textMuted} size={20} />
          </View>
        </TouchableOpacity>

        {customMode && (
          <View style={styles.customControls}>
            {/* Distance Control */}
            <View style={[styles.control, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.controlHeader}>
                <Footprints color={colors.accent} size={20} />
                <Text style={[styles.controlLabel, { color: colors.text }]}>Daily Distance (km)</Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: colors.accent }]}
                  onPress={() => setCustomKm(Math.max(0.5, customKm - 0.5))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepperTxt, { color: colors.bg }]}>−</Text>
                </TouchableOpacity>
                <View style={styles.stepperValue}>
                  <Text style={[styles.stepperValueTxt, { color: colors.text }]}>{customKm.toFixed(1)}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: colors.accent }]}
                  onPress={() => setCustomKm(Math.min(50, customKm + 0.5))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepperTxt, { color: colors.bg }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Calories Control */}
            <View style={[styles.control, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.controlHeader}>
                <Flame color={colors.accent} size={20} />
                <Text style={[styles.controlLabel, { color: colors.text }]}>Daily Calories (kcal)</Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: colors.accent }]}
                  onPress={() => setCustomCalories(Math.max(200, customCalories - 50))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepperTxt, { color: colors.bg }]}>−</Text>
                </TouchableOpacity>
                <View style={styles.stepperValue}>
                  <Text style={[styles.stepperValueTxt, { color: colors.text }]}>{customCalories.toLocaleString()}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.stepperBtn, { backgroundColor: colors.accent }]}
                  onPress={() => setCustomCalories(Math.min(5000, customCalories + 50))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.stepperTxt, { color: colors.bg }]}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Summary */}
      <Animated.View style={[styles.summary, { backgroundColor: colors.cardElevated, borderColor: colors.border, opacity: fade3 }]}>
        <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Your Daily Goals</Text>
        <View style={styles.summaryValues}>
          <View style={styles.summaryItem}>
            <Footprints color={colors.accent} size={18} />
            <Text style={[styles.summaryValue, { color: colors.text }]}>{customKm.toFixed(1)} km</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Flame color={colors.accent} size={18} />
            <Text style={[styles.summaryValue, { color: colors.text }]}>{customCalories.toLocaleString()} kcal</Text>
          </View>
        </View>
      </Animated.View>

      {/* Continue Button */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
        onPress={handleContinue}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, { color: colors.bg }]}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function PresetCard({
  preset,
  selected,
  onSelect,
}: {
  preset: GoalPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  const colors = useThemeColors();
  return (
    <TouchableOpacity
      style={[{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 2, borderRadius: 16, padding: 16, marginBottom: 12 }, selected && { borderColor: colors.accent, backgroundColor: colors.cardElevated }]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={[{ fontSize: 16, fontWeight: '700', color: colors.text }, selected && { color: colors.accent }]}>
          {PRESETS[preset].label}
        </Text>
        {selected && <Check color={colors.accent} size={20} strokeWidth={3} />}
      </View>
      <Text style={{ fontSize: 20, fontWeight: '900', color: colors.accent, marginBottom: 4 }}>
        {PRESETS[preset].km} km / {PRESETS[preset].calories} kcal
      </Text>
      <Text style={{ fontSize: 12, color: colors.textMuted }}>{PRESETS[preset].description}</Text>
    </TouchableOpacity>
  );
}
