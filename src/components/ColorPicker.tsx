import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useThemeColors } from '../theme/ThemeContext';

type ColorOption = {
  id: string;
  color: string;
  name: string;
};

const COLORS: ColorOption[] = [
  { id: 'lime', color: '#ccff00', name: 'Lime' },
  { id: 'blue', color: '#00a8ff', name: 'Blue' },
  { id: 'purple', color: '#a55eea', name: 'Purple' },
  { id: 'pink', color: '#ff6b81', name: 'Pink' },
  { id: 'orange', color: '#ffa502', name: 'Orange' },
  { id: 'green', color: '#2ed573', name: 'Green' },
  { id: 'cyan', color: '#00d2d3', name: 'Cyan' },
  { id: 'red', color: '#ff4757', name: 'Red' },
];

type Props = {
  selectedColor: string;
  onSelectColor: (colorId: string) => void;
};

export function ColorPicker({ selectedColor, onSelectColor }: Props) {
  const colors = useThemeColors();
  const [selectedId, setSelectedId] = useState(selectedColor);

  const handleSelect = (colorId: string) => {
    setSelectedId(colorId);
    onSelectColor(colorId);
  };

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    wheel: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 12,
      maxWidth: 280,
    },
    colorOption: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    selectedOption: {
      borderWidth: 3,
      borderColor: colors.bg,
      shadowColor: '#fff',
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 8,
    },
    checkmark: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.bg + 'cc',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkmarkText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '900',
    },
    preview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 20,
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    previewCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    previewName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.wheel}>
        {COLORS.map((color, index) => {
          const isSelected = selectedId === color.id;
          return (
            <TouchableOpacity
              key={color.id}
              style={[
                styles.colorOption,
                { backgroundColor: color.color },
                isSelected && styles.selectedOption,
              ]}
              onPress={() => handleSelect(color.id)}
              activeOpacity={0.8}
            >
              {isSelected && <View style={styles.checkmark}><Text style={styles.checkmarkText}>✓</Text></View>}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.preview}>
        <View style={[styles.previewCircle, { backgroundColor: COLORS.find(c => c.id === selectedId)?.color }]} />
        <Text style={styles.previewName}>{COLORS.find(c => c.id === selectedId)?.name}</Text>
      </View>
    </View>
  );
}
