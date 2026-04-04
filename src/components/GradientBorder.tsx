import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { useThemeColors } from '../theme/ThemeContext';

type Props = {
  children: React.ReactNode;
  colors?: string[];
  borderRadius?: number;
  strokeWidth?: number;
  style?: any;
};

export function GradientBorder({
  children,
  colors: gradientColors,
  borderRadius = 16,
  strokeWidth = 2,
  style,
}: Props) {
  const colors = useThemeColors();
  const resolvedGradientColors = gradientColors ?? [colors.accent, '#00E676'];
  return (
    <View style={[{ borderRadius }, style]}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={resolvedGradientColors[0]} />
            <Stop offset="100%" stopColor={resolvedGradientColors[1]} />
          </LinearGradient>
        </Defs>
        <Rect
          x={strokeWidth / 2}
          y={strokeWidth / 2}
          width="100%"
          height="100%"
          rx={borderRadius}
          ry={borderRadius}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
        />
      </Svg>
      <View style={{ flex: 1, margin: strokeWidth, borderRadius: borderRadius - strokeWidth }}>
        {children}
      </View>
    </View>
  );
}

export function GradientBox({
  children,
  colors: gradientColors,
  borderRadius = 16,
  style,
}: Props) {
  const colors = useThemeColors();
  const resolvedGradientColors = gradientColors ?? [colors.accent + '22', colors.accent + '11'];
  return (
    <View style={[{ borderRadius }, style]}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="boxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={resolvedGradientColors[0]} />
            <Stop offset="100%" stopColor={resolvedGradientColors[1]} />
          </LinearGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx={borderRadius}
          ry={borderRadius}
          fill="url(#boxGradient)"
        />
      </Svg>
      <View style={{ flex: 1, borderRadius }}>{children}</View>
    </View>
  );
}
