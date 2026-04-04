import { ACHIEVEMENTS, type Achievement } from '../store/achievementsTypes';
import { dayKey, parseDayKey } from './dates';

/**
 * Achievement Checker - checks and unlocks achievements based on user activity.
 */

type AchievementCheckResult = {
  unlocked: string[];
  newXp: number;
};

/**
 * Check all achievements and return newly unlocked ones.
 */
export function checkAchievements(
  state: {
    todaySteps: number;
    todayDistanceKm: number;
    currentStreak: number;
    totalGoalsMet: number;
    unlockedAchievements: string[];
  },
  sessions: Array<{
    startedAt: number;
    distanceM: number;
  }>
): AchievementCheckResult {
  const newlyUnlocked: string[] = [];
  let newXp = 0;

  const { todaySteps, todayDistanceKm, currentStreak, totalGoalsMet, unlockedAchievements } = state;

  // Helper to check and unlock
  const tryUnlock = (achievementId: string) => {
    if (!unlockedAchievements.includes(achievementId)) {
      const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
      if (achievement) {
        newlyUnlocked.push(achievementId);
        newXp += achievement.xpReward;
      }
    }
  };

  // Distance achievements
  if (todayDistanceKm >= 1) tryUnlock('distance_1km');
  if (todayDistanceKm >= 5) tryUnlock('distance_5km');
  if (todayDistanceKm >= 10) tryUnlock('distance_10km');
  if (todayDistanceKm >= 21) tryUnlock('distance_21km');
  if (todayDistanceKm >= 42) tryUnlock('special_marathon');

  // Steps achievements
  if (todaySteps >= 1000) tryUnlock('steps_1k');
  if (todaySteps >= 5000) tryUnlock('steps_5k');
  if (todaySteps >= 10000) tryUnlock('steps_10k');
  if (todaySteps >= 20000) tryUnlock('steps_20k');

  // Streak achievements
  if (currentStreak >= 3) tryUnlock('streak_3days');
  if (currentStreak >= 7) tryUnlock('streak_7days');
  if (currentStreak >= 30) tryUnlock('streak_30days');
  if (currentStreak >= 100) tryUnlock('streak_100days');

  // Goal achievements
  if (totalGoalsMet >= 1) tryUnlock('goal_first');
  if (totalGoalsMet >= 10) tryUnlock('goal_10times');
  if (totalGoalsMet >= 50) tryUnlock('goal_50times');
  if (totalGoalsMet >= 100) tryUnlock('goal_100times');

  // Special achievements - time based
  const today = new Date();
  const hour = today.getHours();
  const dayOfWeek = today.getDay();

  if (hour < 7 && sessions.some(s => s.startedAt)) {
    tryUnlock('special_earlybird');
  }

  if (hour >= 22 && sessions.some(s => s.startedAt)) {
    tryUnlock('special_nightowl');
  }

  // Weekend warrior (Saturday = 6, Sunday = 0)
  if ((dayOfWeek === 0 || dayOfWeek === 6) && todayDistanceKm > 5) {
    tryUnlock('special_weekend');
  }

  return { unlocked: newlyUnlocked, newXp };
}

/**
 * Get a random achievement tip for display.
 */
export function getAchievementTip(): string {
  const lockedAchievements = ACHIEVEMENTS.filter(() => true); // Would need unlocked list
  const random = lockedAchievements[Math.floor(Math.random() * Math.min(5, lockedAchievements.length))];
  
  const tips = [
    `💡 Tip: Walk ${random?.title === '10K Club' ? '10,000' : 'more'} steps to unlock achievements!`,
    '💡 Tip: Maintain your streak for bonus XP!',
    '💡 Tip: Early morning walks unlock the Early Bird achievement!',
    '💡 Tip: Weekend long walks count towards special achievements!',
  ];
  
  return tips[Math.floor(Math.random() * tips.length)];
}

/**
 * Calculate level from XP.
 */
export function calculateLevel(xp: number): number {
  return Math.floor(xp / 1000) + 1;
}

/**
 * Get XP progress to next level (0-100).
 */
export function getXpProgress(xp: number): { current: number; needed: number; percentage: number } {
  const level = calculateLevel(xp);
  const xpForCurrentLevel = (level - 1) * 1000;
  const xpForNextLevel = level * 1000;
  const current = xp - xpForCurrentLevel;
  const needed = 1000;
  const percentage = (current / needed) * 100;
  
  return { current, needed, percentage: Math.min(100, percentage) };
}
