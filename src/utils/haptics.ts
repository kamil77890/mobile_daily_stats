import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback utility for various user interactions.
 * Uses expo-haptics for tactile feedback.
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Trigger a haptic feedback of the specified type.
 * On iOS, uses native haptics. On Android, uses vibration.
 */
export async function triggerHaptic(type: HapticType): Promise<void> {
  try {
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch {
    // Haptics not available (web, simulator, etc.)
  }
}

/**
 * Trigger a light haptic on button press.
 */
export async function buttonPressHaptic(): Promise<void> {
  await triggerHaptic('light');
}

/**
 * Trigger a success haptic when a goal is completed.
 */
export async function goalCompletedHaptic(): Promise<void> {
  await triggerHaptic('success');
  // Add a small delay and another heavy impact for emphasis
  // Use void since we can't cleanup setTimeout in a utility function
  void (async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await triggerHaptic('heavy');
    } catch {
      // Ignore errors in delayed haptic
    }
  })();
}

/**
 * Trigger haptic for workout start/stop.
 */
export async function workoutActionHaptic(): Promise<void> {
  await triggerHaptic('medium');
}

/**
 * Trigger haptic for achievement unlock.
 */
export async function achievementUnlockHaptic(): Promise<void> {
  await triggerHaptic('success');
  // Use void since we can't cleanup setTimeout in a utility function
  void (async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      await triggerHaptic('success');
      await new Promise((resolve) => setTimeout(resolve, 150));
      await triggerHaptic('heavy');
    } catch {
      // Ignore errors in delayed haptic
    }
  })();
}

/**
 * Trigger haptic for stepper increment/decrement.
 */
export async function stepperHaptic(): Promise<void> {
  await triggerHaptic('light');
}
