import { useMemo, createContext, useContext } from 'react';
import { getColorsWithAccentHex, colors as staticColors } from '../theme/colors';
import { useAppStore } from '../store/useAppStore';
import { ACCENT_COLOR_VALUES } from '../theme/accentColors';

type ThemeContextType = {
  colors: ReturnType<typeof getColorsWithAccentHex>;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

// Provider component
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const accentColor = useAppStore((s) => s.accentColor);
  
  const colors = useMemo(() => {
    const hex = ACCENT_COLOR_VALUES[accentColor];
    return getColorsWithAccentHex(hex);
  }, [accentColor]);

  return (
    <ThemeContext.Provider value={{ colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to get theme colors
export function useThemeColors() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback to dynamic colors if used outside ThemeProvider
    return getColorsWithAccentHex(ACCENT_COLOR_VALUES.lime);
  }
  return context.colors;
}

// Hook to get accent color name from store
export function useAccentColor() {
  return useAppStore((state) => state.accentColor);
}

// Hook to get accent setter from store
export function useSetAccentColor() {
  return useAppStore((state) => state.setAccentColor);
}

// Export static colors for backward compatibility (used in non-component files)
export const colors = staticColors;


