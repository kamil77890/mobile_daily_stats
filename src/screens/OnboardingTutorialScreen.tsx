import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, FlatList, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import {
  Home,
  Activity,
  BarChart3,
  Clock,
  ListChecks,
  MapPin,
  Trophy,
  Zap,
  ChevronRight,
} from 'lucide-react-native';

import { useThemeColors } from '../theme/ThemeContext';

type Props = {
  onComplete: () => void;
};

type SlideData = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  tip?: string;
};

type SlideProps = {
  item: SlideData;
  isActive: boolean;
};

function Slide({ item, isActive }: { item: SlideData; isActive: boolean }) {
  const colors = useThemeColors();
  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: isActive ? 1.1 : 1,
      },
    ],
  }));

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, width: SCREEN_WIDTH }}>
      <Animated.View style={[{ marginBottom: 32 }, animatedIconStyle]}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.accent + '22', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</View>
      </Animated.View>
      <Text style={{ fontSize: 24, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: 12 }}>{item.title}</Text>
      <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 }}>{item.description}</Text>
      {item.tip && (
        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginTop: 24, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.accent, marginBottom: 4 }}>💡 Tip</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 18 }}>{item.tip}</Text>
        </View>
      )}
    </View>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function OnboardingTutorialScreen({ onComplete }: Props) {
  const colors = useThemeColors();
  const [currentSlide, setCurrentSlide] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const progress = useSharedValue(0);

  const slides: SlideData[] = [
    {
      id: '1',
      icon: <Home color={colors.accent} size={40} />,
      title: 'Summary Dashboard',
      description: 'See your daily progress at a glance. Your map, steps, distance, and calories are all displayed on the home screen.',
      tip: 'Tap the map to view and share your full route',
    },
    {
      id: '2',
      icon: <Activity color={colors.accent} size={40} />,
      title: 'Track Workouts',
      description: 'Start manual workouts for detailed tracking. Choose your exercise type and see live stats as you move.',
      tip: 'Background walking runs automatically when enabled',
    },
    {
      id: '3',
      icon: <BarChart3 color={colors.accent} size={40} />,
      title: 'View Statistics',
      description: 'Track your progress over time with detailed charts and monthly calendars.',
      tip: 'Check your stats regularly to stay motivated',
    },
    {
      id: '4',
      icon: <Clock color={colors.accent} size={40} />,
      title: 'Activity Timeline',
      description: 'See your day broken down into walking, transit, and stationary periods with location details.',
      tip: 'Tap any timeline block to see detailed activity segments',
    },
    {
      id: '5',
      icon: <ListChecks color={colors.accent} size={40} />,
      title: 'Plan & Tasks',
      description: 'Create custom workout templates and daily tasks to stay organized and motivated.',
      tip: 'Mark tasks as complete to track your consistency',
    },
    {
      id: '6',
      icon: <Trophy color={colors.accent} size={40} />,
      title: 'Achievements & Levels',
      description: 'Earn badges for milestones and level up as you stay active. Compete with yourself!',
      tip: 'Check achievements screen for all unlockable badges',
    },
    {
      id: '7',
      icon: <Zap color={colors.accent} size={40} />,
      title: 'Ready to Go!',
      description: 'You\'re all set! Start walking and let the app track your activity automatically.',
      tip: 'Keep location enabled for best results',
    },
  ];

  useEffect(() => {
    progress.value = withTiming(currentSlide / (slides.length - 1), { duration: 300 });
  }, [currentSlide]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      goToSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    progressContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, gap: 12 },
    progressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
    progressText: { fontSize: 13, fontWeight: '700', minWidth: 40, textAlign: 'right' },
    slider: { flex: 1 },
    slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 48 },
    iconWrapper: { marginBottom: 32 },
    iconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
    slideTitle: { fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 16 },
    slideDescription: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
    tipContainer: { borderRadius: 16, padding: 16, borderWidth: 1, maxWidth: 300 },
    tipLabel: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
    tipText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 24 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    dotActive: { width: 24, borderRadius: 4 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
    skipButton: { paddingVertical: 14, paddingHorizontal: 20 },
    skipButtonText: { fontSize: 15, fontWeight: '700' },
    nextButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 28, borderRadius: 999, gap: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
    nextButtonText: { fontSize: 17, fontWeight: '900' },
    finishButton: { paddingVertical: 18, paddingHorizontal: 48, borderRadius: 999, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
    finishButtonText: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  });

  const iconCircleStyle = { backgroundColor: colors.cardElevated, borderColor: colors.border };
  const slideTitleStyle = { color: colors.text };
  const slideDescStyle = { color: colors.textMuted };
  const tipContainerStyle = { backgroundColor: colors.card, borderColor: colors.border };
  const tipLabelStyle = { color: colors.accent };
  const tipTextStyle = { color: colors.text };
  const dotStyle = { backgroundColor: colors.border };
  const dotActiveStyle = { backgroundColor: colors.accent };
  const skipButtonTextStyle = { color: colors.textMuted };
  const nextButtonStyle = { backgroundColor: colors.accent, shadowColor: colors.accent };
  const nextButtonTextStyle = { color: colors.bg };
  const finishButtonStyle = { backgroundColor: colors.accent, shadowColor: colors.accent };
  const finishButtonTextStyle = { color: colors.bg };

  const colorStyles = { iconCircle: iconCircleStyle, slideTitle: slideTitleStyle, slideDesc: slideDescStyle, tipContainer: tipContainerStyle, tipLabel: tipLabelStyle, tipText: tipTextStyle };

  const renderItem = ({ item, index }: { item: SlideData; index: number }) => {
    const isActive = index === currentSlide;
    return (
      <Slide item={item} isActive={isActive} />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: `${(currentSlide / (slides.length - 1)) * 100}%`,
                backgroundColor: colors.accent,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.textMuted }]}>
          {currentSlide + 1} / {slides.length}
        </Text>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        style={styles.slider}
      />

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: colors.border },
              index === currentSlide && { width: 24, backgroundColor: colors.accent },
            ]}
          />
        ))}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.footer}>
        {currentSlide > 0 && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => goToSlide(currentSlide - 1)}
            activeOpacity={0.8}
          >
            <Text style={[styles.skipButtonText, { color: colors.textMuted }]}>Back</Text>
          </TouchableOpacity>
        )}

        {currentSlide < slides.length - 1 ? (
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={[styles.nextButtonText, { color: colors.bg }]}>Next</Text>
            <ChevronRight color={colors.bg} size={20} strokeWidth={3} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.finishButton, { backgroundColor: colors.accent, shadowColor: colors.accent }]}
            onPress={onComplete}
            activeOpacity={0.8}
          >
            <Text style={[styles.finishButtonText, { color: colors.bg }]}>Start Using App</Text>
          </TouchableOpacity>
        )}

        {currentSlide < slides.length - 1 && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onComplete}
            activeOpacity={0.8}
          >
            <Text style={[styles.skipButtonText, { color: colors.textMuted }]}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
