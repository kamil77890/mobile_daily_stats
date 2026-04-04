import { useMemo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useThemeColors } from '../theme/ThemeContext';

export type ShareTemplate = 'classic' | 'minimal' | 'bold' | 'gradient';

type ShareCardProps = {
  title: string;
  steps: number;
  distance: number; // km
  calories: number;
  date: string;
  template?: ShareTemplate;
  accentColor?: string;
  style?: ViewStyle;
};

export function ShareCard({
  title,
  steps,
  distance,
  calories,
  date,
  template = 'classic',
  accentColor,
  style,
}: ShareCardProps) {
  const colors = useThemeColors();
  const resolvedAccent = accentColor ?? colors.accent;
  const templateStyles = useMemo(() => getTemplateStyles(template, resolvedAccent, colors), [template, resolvedAccent, colors]);

  return (
    <View style={[styles.container, templateStyles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, templateStyles.title]}>{title}</Text>
        <Text style={[styles.date, templateStyles.date]}>{date}</Text>
      </View>

      {/* Main Stats */}
      <View style={styles.stats}>
        <StatItem
          label="Steps"
          value={steps.toLocaleString()}
          style={templateStyles.stat}
        />
        <StatItem
          label="Distance"
          value={`${distance.toFixed(2)} km`}
          style={templateStyles.stat}
        />
        <StatItem
          label="Calories"
          value={`${calories} kcal`}
          style={templateStyles.stat}
        />
      </View>

      {/* Footer */}
      <View style={[styles.footer, templateStyles.footer]}>
        <Text style={[styles.footerText, templateStyles.footerText]}>
          Mobile Daily Stats
        </Text>
        <View style={[styles.logo, { backgroundColor: accentColor }]} />
      </View>
    </View>
  );
}

function StatItem({ label, value, style }: { label: string; value: string; style?: any }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, style]}>{value}</Text>
      <Text style={[styles.statLabel, style]}>{label}</Text>
    </View>
  );
}

function getTemplateStyles(template: ShareTemplate, accentColor: string, colors: ReturnType<typeof useThemeColors>) {
  const base = {
    container: {},
    title: { color: colors.text },
    date: { color: colors.textMuted },
    stat: { color: colors.text },
    footer: {},
    footerText: { color: colors.textMuted },
  };

  switch (template) {
    case 'minimal':
      return {
        ...base,
        container: {
          backgroundColor: colors.card,
          padding: 24,
        },
        stat: { color: accentColor, fontWeight: '900' as const },
      };

    case 'bold':
      return {
        ...base,
        container: {
          backgroundColor: accentColor,
          padding: 24,
        },
        title: { color: colors.bg },
        date: { color: colors.bg + 'CC' },
        stat: { color: colors.bg },
        footerText: { color: colors.bg + '99' },
      };

    case 'gradient':
      return {
        ...base,
        container: {
          background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}66)`,
          padding: 24,
          borderWidth: 2,
          borderColor: accentColor,
        },
        stat: { color: accentColor, fontWeight: '900' as const },
      };

    default: // classic
      return {
        ...base,
        container: {
          backgroundColor: colors.card,
          padding: 24,
          borderWidth: 1,
          borderColor: colors.border,
        },
        stat: { color: accentColor },
      };
  }
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
  },
  date: {
    fontSize: 13,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  logo: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
});

export const SHARE_TEMPLATES: { id: ShareTemplate; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'bold', label: 'Bold' },
  { id: 'gradient', label: 'Gradient' },
];
