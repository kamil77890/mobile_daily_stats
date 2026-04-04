import { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Plus, Target, TrendingUp } from 'lucide-react-native';

import { useThemeColors } from '../theme/ThemeContext';
import type { DailyGoal } from '../store/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, targetValue: number, dailyIncrement: number, unit: string) => void;
  editGoal?: DailyGoal | null;
};

export function CustomGoalModal({ visible, onClose, onSave, editGoal }: Props) {
  const colors = useThemeColors();
  const [name, setName] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [dailyIncrement, setDailyIncrement] = useState('');
  const [unit, setUnit] = useState('');

  useEffect(() => {
    if (editGoal) {
      setName(editGoal.name);
      setTargetValue(String(editGoal.targetValue));
      setDailyIncrement(String(editGoal.dailyIncrement));
      setUnit(editGoal.unit);
    } else {
      setName('');
      setTargetValue('');
      setDailyIncrement('');
      setUnit('');
    }
  }, [editGoal, visible]);

  const handleSave = () => {
    if (!name.trim()) return;
    const target = parseFloat(targetValue) || 0;
    const increment = parseFloat(dailyIncrement) || 0;
    if (target <= 0 || increment <= 0) return;

    onSave(name.trim(), target, increment, unit.trim() || 'reps');
    onClose();
  };

  const isFormValid = name.trim() && parseFloat(targetValue) > 0 && parseFloat(dailyIncrement) > 0;

  // Memoize dynamic styles to prevent re-creation on every keystroke
  const dynamicStyles = useMemo(() => ({
    modal: {
      backgroundColor: colors.card,
    },
    header: {
      borderBottomColor: colors.border,
    },
    title: {
      color: colors.text,
    },
    closeButton: {
      backgroundColor: colors.cardElevated,
    },
    label: {
      color: colors.textMuted,
    },
    input: {
      backgroundColor: colors.bg,
      borderColor: colors.border,
      color: colors.text,
    },
    hint: {
      color: colors.textMuted,
    },
    saveButton: {
      backgroundColor: colors.accent,
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      color: colors.bg,
    },
    preview: {
      backgroundColor: colors.bg,
      borderColor: colors.border,
    },
    previewTitle: {
      color: colors.text,
    },
    previewLabel: {
      color: colors.textMuted,
    },
    previewValue: {
      color: colors.accent,
    },
  }), [colors]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={staticStyles.overlay}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[staticStyles.modal, dynamicStyles.modal]}>
            <View style={[staticStyles.header, dynamicStyles.header]}>
              <Text style={[staticStyles.title, dynamicStyles.title]}>
                {editGoal ? 'Edit Goal' : 'New Daily Goal'}
              </Text>
              <TouchableOpacity
                style={[staticStyles.closeButton, dynamicStyles.closeButton]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <X color={colors.text} size={20} />
              </TouchableOpacity>
            </View>

            <View style={staticStyles.content}>
              {/* Goal Name */}
              <View style={staticStyles.field}>
                <Text style={[staticStyles.label, dynamicStyles.label]}>Goal Name</Text>
                <TextInput
                  style={[staticStyles.input, staticStyles.inputLarge, dynamicStyles.input]}
                  placeholder="e.g., Push-ups, Reading pages..."
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              {/* Target & Increment */}
              <View style={staticStyles.row}>
                <View style={[staticStyles.field, staticStyles.flex1]}>
                  <Text style={[staticStyles.label, dynamicStyles.label]}>
                    <Target color={colors.accent} size={12} /> Initial Target
                  </Text>
                  <TextInput
                    style={[staticStyles.input, staticStyles.inputLarge, dynamicStyles.input]}
                    placeholder="50"
                    placeholderTextColor={colors.textMuted}
                    value={targetValue}
                    onChangeText={setTargetValue}
                    keyboardType="numeric"
                  />
                  <Text style={[staticStyles.hint, dynamicStyles.hint]}>Starting daily target</Text>
                </View>
                <View style={[staticStyles.field, staticStyles.flex1]}>
                  <Text style={[staticStyles.label, dynamicStyles.label]}>
                    <TrendingUp color={colors.accent} size={12} /> Daily Increase
                  </Text>
                  <TextInput
                    style={[staticStyles.input, staticStyles.inputLarge, dynamicStyles.input]}
                    placeholder="5"
                    placeholderTextColor={colors.textMuted}
                    value={dailyIncrement}
                    onChangeText={setDailyIncrement}
                    keyboardType="numeric"
                  />
                  <Text style={[staticStyles.hint, dynamicStyles.hint]}>Increase per day</Text>
                </View>
              </View>

              {/* Unit */}
              <View style={staticStyles.field}>
                <Text style={[staticStyles.label, dynamicStyles.label]}>Unit (optional)</Text>
                <TextInput
                  style={[staticStyles.input, staticStyles.inputLarge, dynamicStyles.input]}
                  placeholder="e.g., push-ups, pages, minutes"
                  placeholderTextColor={colors.textMuted}
                  value={unit}
                  onChangeText={setUnit}
                  autoCapitalize="none"
                />
              </View>

              {/* Preview */}
              {isFormValid && (
                <View style={[staticStyles.preview, dynamicStyles.preview]}>
                  <Text style={[staticStyles.previewTitle, dynamicStyles.previewTitle]}>Preview</Text>
                  <View style={staticStyles.previewRow}>
                    <Text style={[staticStyles.previewLabel, dynamicStyles.previewLabel]}>Day 1:</Text>
                    <Text style={[staticStyles.previewValue, dynamicStyles.previewValue]}>
                      {targetValue} {unit || 'reps'}
                    </Text>
                  </View>
                  <View style={staticStyles.previewRow}>
                    <Text style={[staticStyles.previewLabel, dynamicStyles.previewLabel]}>Day 7:</Text>
                    <Text style={[staticStyles.previewValue, dynamicStyles.previewValue]}>
                      {parseFloat(targetValue) + parseFloat(dailyIncrement) * 6} {unit || 'reps'}
                    </Text>
                  </View>
                  <View style={staticStyles.previewRow}>
                    <Text style={[staticStyles.previewLabel, dynamicStyles.previewLabel]}>Day 30:</Text>
                    <Text style={[staticStyles.previewValue, dynamicStyles.previewValue]}>
                      {parseFloat(targetValue) + parseFloat(dailyIncrement) * 29} {unit || 'reps'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Save Button */}
              <TouchableOpacity
                style={[
                  staticStyles.saveButton,
                  dynamicStyles.saveButton,
                  !isFormValid && dynamicStyles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={!isFormValid}
                activeOpacity={0.8}
              >
                <Plus color={colors.bg} size={20} />
                <Text style={[staticStyles.saveButtonText, dynamicStyles.saveButtonText]}>
                  {editGoal ? 'Update Goal' : 'Create Goal'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Static styles - never change, created once outside the component
const staticStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  inputLarge: {
    height: 50,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  hint: {
    fontSize: 11,
    marginTop: 4,
  },
  saveButton: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  preview: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  previewLabel: {
    fontSize: 12,
  },
  previewValue: {
    fontSize: 12,
    fontWeight: '700',
  },
});
