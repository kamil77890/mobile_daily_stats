import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';

import { useThemeColors } from '../theme/ThemeContext';
import { getXpProgress } from '../utils/achievementChecker';

type Props = {
  level: number;
  xp: number;
  size?: 'small' | 'medium' | 'large';
};

export function LevelBadge({ level, xp, size = 'medium' }: Props) {
  const colors = useThemeColors();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  
  const xpProgress = getXpProgress(xp);
  
  useEffect(() => {
    scale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 80 }));
    opacity.value = withDelay(100, withSpring(1, { damping: 12 }));
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${xpProgress.percentage}%`,
  }));

  const sizes = {
    small: { container: 36, level: 14, xp: 10 },
    medium: { container: 44, level: 18, xp: 11 },
    large: { container: 56, level: 24, xp: 13 },
  };

  const s = sizes[size];

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    circle: {
      borderRadius: 22,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.bg,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
    },
    levelText: {
      color: colors.bg,
      fontWeight: '900',
    },
    xpProgress: {
      position: 'absolute',
      bottom: -2,
      left: 2,
      right: 2,
      height: 3,
      backgroundColor: colors.border,
      borderRadius: 2,
      overflow: 'hidden',
    },
    xpProgressFill: {
      height: '100%',
      backgroundColor: colors.accent,
      borderRadius: 2,
    },
    badgeWrapper: {
      alignItems: 'center',
    },
    tooltip: {
      marginTop: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: colors.cardElevated,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tooltipXp: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
    },
    tooltipNext: {
      color: colors.textMuted,
      fontSize: 9,
      textAlign: 'center',
      marginTop: 2,
    },
  });

  return (
    <Animated.View style={[styles.container, containerStyle, { width: s.container, height: s.container }]}>
      <View style={[styles.circle, { width: s.container, height: s.container }]}>
        <Text style={[styles.levelText, { fontSize: s.level }]}>{level}</Text>
      </View>
      
      {/* XP Progress ring indicator */}
      <View style={styles.xpProgress}>
        <Animated.View style={[styles.xpProgressFill, progressStyle]} />
      </View>
      
      {/* XP tooltip on press could be added */}
    </Animated.View>
  );
}

function LevelBadgeWithTooltip({ level, xp }: { level: number; xp: number }) {
  const colors = useThemeColors();
  const xpProgress = getXpProgress(xp);
  const nextLevelXp = xpProgress.needed - xpProgress.current;

  const styles = StyleSheet.create({
    badgeWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    tooltip: {
      flex: 1,
    },
    tooltipXp: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    tooltipNext: {
      color: colors.textMuted,
      fontSize: 10,
    },
  });

  return (
    <View style={styles.badgeWrapper}>
      <LevelBadge level={level} xp={xp} size="medium" />
      <View style={styles.tooltip}>
        <Text style={styles.tooltipXp}>{xpProgress.current} / {xpProgress.needed} XP</Text>
        <Text style={styles.tooltipNext}>+{nextLevelXp} XP to level {level + 1}</Text>
      </View>
    </View>
  );
}

export default LevelBadgeWithTooltip;
