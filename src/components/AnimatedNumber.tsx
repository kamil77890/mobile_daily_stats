import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';

type Props = {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  style?: any;
};

export function AnimatedNumber({
  value,
  duration = 1000,
  prefix = '',
  suffix = '',
  decimals = 0,
  style,
}: Props) {
  const animatedValue = useSharedValue(value);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    animatedValue.value = withTiming(value, { duration });
    
    const startTime = Date.now();
    const startValue = displayValue;
    const targetValue = value;
    
    const updateInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentValue = startValue + (targetValue - startValue) * progress;
      setDisplayValue(currentValue);
      
      if (progress >= 1) {
        clearInterval(updateInterval);
      }
    }, 16);
    
    return () => clearInterval(updateInterval);
  }, [value, duration]);

  const formatted = prefix + displayValue.toFixed(decimals) + suffix;

  return <Text style={style}>{formatted}</Text>;
}
