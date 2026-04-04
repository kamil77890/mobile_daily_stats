/**
 * Achievement definitions for the gamification system.
 * Each achievement has an ID, title, description, emoji, and unlock condition.
 */

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export type Achievement = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  tier: AchievementTier;
  xpReward: number;
  category: 'distance' | 'steps' | 'streak' | 'goals' | 'special';
};

export const ACHIEVEMENTS: Achievement[] = [
  // Distance achievements
  {
    id: 'distance_1km',
    title: 'First Steps',
    description: 'Walk your first 1 km',
    emoji: '👣',
    tier: 'bronze',
    xpReward: 50,
    category: 'distance',
  },
  {
    id: 'distance_5km',
    title: 'Walking Pro',
    description: 'Walk 5 km in a single day',
    emoji: '🚶',
    tier: 'silver',
    xpReward: 100,
    category: 'distance',
  },
  {
    id: 'distance_10km',
    title: 'Distance Master',
    description: 'Walk 10 km in a single day',
    emoji: '🏆',
    tier: 'gold',
    xpReward: 200,
    category: 'distance',
  },
  {
    id: 'distance_21km',
    title: 'Half Marathon',
    description: 'Walk 21 km in a single day',
    emoji: '🥇',
    tier: 'platinum',
    xpReward: 500,
    category: 'distance',
  },

  // Steps achievements
  {
    id: 'steps_1k',
    title: 'Getting Started',
    description: 'Take 1,000 steps in a day',
    emoji: '👟',
    tier: 'bronze',
    xpReward: 30,
    category: 'steps',
  },
  {
    id: 'steps_5k',
    title: 'Step Counter',
    description: 'Take 5,000 steps in a day',
    emoji: '📈',
    tier: 'silver',
    xpReward: 80,
    category: 'steps',
  },
  {
    id: 'steps_10k',
    title: '10K Club',
    description: 'Take 10,000 steps in a day',
    emoji: '⭐',
    tier: 'gold',
    xpReward: 150,
    category: 'steps',
  },
  {
    id: 'steps_20k',
    title: 'Step Legend',
    description: 'Take 20,000 steps in a day',
    emoji: '👑',
    tier: 'platinum',
    xpReward: 400,
    category: 'steps',
  },

  // Streak achievements
  {
    id: 'streak_3days',
    title: 'Getting Serious',
    description: 'Meet your goal 3 days in a row',
    emoji: '🔥',
    tier: 'bronze',
    xpReward: 100,
    category: 'streak',
  },
  {
    id: 'streak_7days',
    title: 'Week Warrior',
    description: 'Meet your goal 7 days in a row',
    emoji: '💪',
    tier: 'silver',
    xpReward: 250,
    category: 'streak',
  },
  {
    id: 'streak_30days',
    title: 'Monthly Master',
    description: 'Meet your goal 30 days in a row',
    emoji: '🏅',
    tier: 'gold',
    xpReward: 600,
    category: 'streak',
  },
  {
    id: 'streak_100days',
    title: 'Century Club',
    description: 'Meet your goal 100 days in a row',
    emoji: '💎',
    tier: 'platinum',
    xpReward: 1500,
    category: 'streak',
  },

  // Goal achievements
  {
    id: 'goal_first',
    title: 'Goal Crusher',
    description: 'Meet your daily goal for the first time',
    emoji: '✅',
    tier: 'bronze',
    xpReward: 50,
    category: 'goals',
  },
  {
    id: 'goal_10times',
    title: 'Consistent',
    description: 'Meet your daily goal 10 times',
    emoji: '🎯',
    tier: 'silver',
    xpReward: 150,
    category: 'goals',
  },
  {
    id: 'goal_50times',
    title: 'Dedicated',
    description: 'Meet your daily goal 50 times',
    emoji: '🌟',
    tier: 'gold',
    xpReward: 400,
    category: 'goals',
  },
  {
    id: 'goal_100times',
    title: 'Unstoppable',
    description: 'Meet your daily goal 100 times',
    emoji: '🚀',
    tier: 'platinum',
    xpReward: 1000,
    category: 'goals',
  },

  // Special achievements
  {
    id: 'special_earlybird',
    title: 'Early Bird',
    description: 'Complete a walk before 7 AM',
    emoji: '🌅',
    tier: 'silver',
    xpReward: 100,
    category: 'special',
  },
  {
    id: 'special_nightowl',
    title: 'Night Owl',
    description: 'Complete a walk after 10 PM',
    emoji: '🌙',
    tier: 'silver',
    xpReward: 100,
    category: 'special',
  },
  {
    id: 'special_weekend',
    title: 'Weekend Warrior',
    description: 'Walk more than 5 km on a weekend',
    emoji: '📅',
    tier: 'silver',
    xpReward: 120,
    category: 'special',
  },
  {
    id: 'special_marathon',
    title: 'Marathon Day',
    description: 'Walk 42 km in a single day',
    emoji: '🏃',
    tier: 'platinum',
    xpReward: 1000,
    category: 'special',
  },
];

export const TIER_COLORS = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
};

export const TIER_MULTIPLIERS = {
  bronze: 1,
  silver: 2,
  gold: 4,
  platinum: 10,
};

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

export function getAchievementsByCategory(category: Achievement['category']): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.category === category);
}

export function getUnlockedAchievements(unlockedIds: string[]): Achievement[] {
  return ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id));
}

export function getProgressToNextTier(unlockedIds: string[]): number {
  const total = ACHIEVEMENTS.length;
  const unlocked = unlockedIds.length;
  return Math.round((unlocked / total) * 100);
}
