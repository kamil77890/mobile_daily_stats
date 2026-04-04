import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';

import { useThemeColors } from '../theme/ThemeContext';

type Props = {
  options: { label: string; value: string }[];
  selectedValue: string;
  onValueChange: (value: string) => void;
};

export function SegmentedControl({ options, selectedValue, onValueChange }: Props) {
  const colors = useThemeColors();
  const [selectedIndex, setSelectedIndex] = useState(
    options.findIndex(o => o.value === selectedValue)
  );

  const handlePress = (index: number) => {
    setSelectedIndex(index);
    onValueChange(options[index].value);
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    segment: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    firstSegment: {
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
    },
    lastSegment: {
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8,
    },
    selectedSegment: {
      backgroundColor: colors.accent,
      borderRadius: 8,
    },
    label: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    selectedLabel: {
      color: colors.bg,
    },
  });

  return (
    <View style={styles.container}>
      {options.map((option, index) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.segment,
            index === 0 && styles.firstSegment,
            index === options.length - 1 && styles.lastSegment,
            index === selectedIndex && styles.selectedSegment,
          ]}
          onPress={() => handlePress(index)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.label,
              index === selectedIndex && styles.selectedLabel,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
