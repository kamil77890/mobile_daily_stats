import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  PanResponder,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Move } from 'lucide-react-native';

import { useAppStore } from '../store/useAppStore';
import { useThemeColors } from '../theme/ThemeContext';
import { dayKey } from '../utils/dates';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function DraggableStatsPanel() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const dk = dayKey();
  const today = useAppStore((s) => s.history[dk]) ?? {
    steps: 0,
    distanceM: 0,
    kcal: 0,
    inclineM: 0,
    goalMet: false,
  };

  const dailyGoalKm = useAppStore((s) => s.dailyGoalKm);
  const dailyGoalCalories = useAppStore((s) => s.dailyGoalCalories);

  // Pozycja początkowa - prawa strona ekranu
  const startPosition = {
    x: SCREEN_WIDTH - 140,
    y: SCREEN_HEIGHT / 2 - 100,
  };

  const pan = useState(
    new Animated.ValueXY({
      x: startPosition.x,
      y: startPosition.y,
    })
  )[0];

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: () => {
      pan.setOffset({
        x: pan.x._value,
        y: pan.y._value,
      });
    },
    onPanResponderMove: Animated.event([
      null,
      { dx: pan.x, dy: pan.y },
    ]),
    onPanResponderRelease: (e, gesture) => {
      pan.flattenOffset();
      
      // Przyciąganie do krawędzi ekranu
      let newX = gesture.moveX;
      const newY = Math.max(
        insets.top,
        Math.min(gesture.moveY, SCREEN_HEIGHT - 150 - insets.bottom)
      );

      // Przyciągaj do lewej lub prawej krawędzi
      const leftEdge = 140;
      const rightEdge = SCREEN_WIDTH - 140;
      
      if (newX < SCREEN_WIDTH / 2) {
        newX = leftEdge;
      } else {
        newX = rightEdge;
      }

      Animated.spring(pan, {
        toValue: { x: newX, y: newY },
        useNativeDriver: false,
      }).start();
    },
  });

  const todayKm = (today.distanceM / 1000).toFixed(1);
  const todayCal = today.kcal;
  const stepsProgress = Math.min((today.steps / 10000) * 100, 100);
  const kmProgress = Math.min((parseFloat(todayKm) / dailyGoalKm) * 100, 100);
  const calProgress = Math.min((todayCal / dailyGoalCalories) * 100, 100);

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      width: 130,
      backgroundColor: colors.cardElevated + 'EE',
      borderRadius: 16,
      padding: 10,
      borderWidth: 1.5,
      borderColor: colors.accent + '88',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 9999,
    },
    dragHandle: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 8,
    },
    statRow: {
      marginBottom: 8,
    },
    statItem: {
      alignItems: 'center',
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: 9,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    statValue: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '900',
      marginBottom: 3,
    },
    progressBar: {
      width: '100%',
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      overflow: 'hidden',
      marginTop: 2,
    },
    progressFill: {
      height: '100%',
      borderRadius: 2,
    },
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.dragHandle}>
        <Move color={colors.textMuted} size={16} />
      </View>
      
      <View style={styles.statRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>STEPS</Text>
          <Text style={styles.statValue}>{today.steps.toLocaleString()}</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${stepsProgress}%`, backgroundColor: colors.accent }
              ]} 
            />
          </View>
        </View>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>KM</Text>
          <Text style={styles.statValue}>{todayKm}</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${kmProgress}%`, backgroundColor: '#FF4500' }
              ]} 
            />
          </View>
        </View>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>CAL</Text>
          <Text style={styles.statValue}>{todayCal}</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${calProgress}%`, backgroundColor: '#00E676' }
              ]} 
            />
          </View>
        </View>
      </View>

      <View style={styles.statRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>INCLINE</Text>
          <Text style={styles.statValue}>{Math.round(today.inclineM)}m</Text>
        </View>
      </View>
    </Animated.View>
  );
}
