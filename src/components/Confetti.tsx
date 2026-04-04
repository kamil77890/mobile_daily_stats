import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSpring,
} from 'react-native-reanimated';

type ConfettiParticle = {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
};

const COLORS = ['#ccff00', '#00a8ff', '#ff6b81', '#ffa502', '#2ed573', '#a55eea', '#00d2d3'];

function generateParticles(count: number): ConfettiParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: Math.random() * 10 + 5,
    rotation: Math.random() * 360,
    delay: Math.random() * 500,
  }));
}

export function Confetti({ visible, onComplete }: { visible: boolean; onComplete?: () => void }) {
  const particles = useRef(generateParticles(50)).current;
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, { damping: 15, stiffness: 80 });
      
      const timeout = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 500 }, () => {
          onComplete?.();
        });
      }, 2500);
      
      return () => clearTimeout(timeout);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {particles.map((particle) => (
        <ConfettiParticle key={particle.id} particle={particle} opacity={opacity} scale={scale} />
      ))}
    </View>
  );
}

function ConfettiParticle({
  particle,
  opacity,
  scale,
}: {
  particle: ConfettiParticle;
  opacity: any;
  scale: any;
}) {
  const translateY = useSharedValue(-200);
  const rotate = useSharedValue(particle.rotation);

  useEffect(() => {
    const timeout = setTimeout(() => {
      translateY.value = withRepeat(
        withTiming(400, { duration: 1500 + particle.delay }),
        1,
        false
      );
      rotate.value = withRepeat(
        withTiming(particle.rotation + 720, { duration: 1500 + particle.delay }),
        1,
        false
      );
    }, particle.delay);

    return () => clearTimeout(timeout);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        animatedStyle,
        {
          left: `${particle.x}%`,
          backgroundColor: particle.color,
          width: particle.size,
          height: particle.size * 0.6,
          borderRadius: particle.size / 5,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
    zIndex: 9999,
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
});

export default Confetti;
