import { ACCENT_COLOR_VALUES, type AccentColor } from './accentColors';

// Base colors (non-accent)
export const BASE_COLORS = {
  bg: '#000000',
  card: '#161616',
  cardElevated: '#1f1f1f',
  border: '#2a2a2a',
  text: '#ffffff',
  textMuted: '#9a9a9a',

  success: '#2ed573',
  error: '#ff4757',
  warning: '#ffa502',
  info: '#00a8ff',

  vehicle: '#FF4500',
  vehicleMuted: '#5a1500',

  routeLine: '#39FF14',
  routeVehicle: '#FF4500',
  routeSitting: '#333333',

  markerStart: '#00E676',
  markerEnd: '#FF4500',
} as const;

// Helper to generate accent-dependent colors
function generateAccentColors(accentHex: string): {
  accent: string;
  accentMuted: string;
  gradientStart: string;
  gradientEnd: string;
} {
  // Parse hex color
  const hex = accentHex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Create muted version (60% opacity blend with dark gray #333)
  const mutedR = Math.round(r * 0.6 + 51 * 0.4);
  const mutedG = Math.round(g * 0.6 + 51 * 0.4);
  const mutedB = Math.round(b * 0.6 + 51 * 0.4);
  const accentMuted = `#${mutedR.toString(16).padStart(2, '0')}${mutedG.toString(16).padStart(2, '0')}${mutedB.toString(16).padStart(2, '0')}`;

  // Create gradient end (green-tinted version)
  const gradientEndR = Math.round(r * 0.3 + 0 * 0.7);
  const gradientEndG = Math.round(g * 0.3 + 230 * 0.7);
  const gradientEndB = Math.round(b * 0.3 + 118 * 0.7);
  const gradientEnd = `#${gradientEndR.toString(16).padStart(2, '0')}${gradientEndG.toString(16).padStart(2, '0')}${gradientEndB.toString(16).padStart(2, '0')}`;

  return {
    accent: accentHex,
    accentMuted,
    gradientStart: accentHex,
    gradientEnd,
  };
}

// Default colors (lime accent)
export const colors = {
  ...BASE_COLORS,
  ...generateAccentColors(ACCENT_COLOR_VALUES.lime),
} as const;

// Function to get colors with custom accent
export function getColorsWithAccent(accentColor: AccentColor) {
  const accentHex = ACCENT_COLOR_VALUES[accentColor];
  return {
    ...BASE_COLORS,
    ...generateAccentColors(accentHex),
  };
}

// Function to get colors with custom accent hex value
export function getColorsWithAccentHex(accentHex: string) {
  return {
    ...BASE_COLORS,
    ...generateAccentColors(accentHex),
  };
}

export type { AccentColor };
export { ACCENT_COLOR_VALUES };