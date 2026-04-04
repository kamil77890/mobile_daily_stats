import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, RotateCcw, Ruler, Palette, Trash2, Moon, Bell, Activity, ListChecks, Trophy, Info } from 'lucide-react-native';

import { Card } from '../components/Card';
import { ColorPicker } from '../components/ColorPicker';
import { useAppStore } from '../store/useAppStore';
import { type AccentColor } from '../theme/accentColors';
import { useThemeColors } from '../theme/ThemeContext';
import { buttonPressHaptic } from '../utils/haptics';

type Props = { navigation: { goBack: () => void; getParent: () => any } };

const UNIT_SYSTEMS = [
  { id: 'metric', label: 'Metric', distance: 'km', weight: 'kg' },
  { id: 'imperial', label: 'Imperial', distance: 'mi', weight: 'lbs' },
];

const APP_VERSION = '1.0.0';

export function SettingsScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [selectedUnit, setSelectedUnit] = useState<'metric' | 'imperial'>('metric');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [batterySaverMode, setBatterySaverMode] = useState(false);

  const accentColor = useAppStore((s) => s.accentColor);
  const setAccentColor = useAppStore((s) => s.setAccentColor);

  const handleResetData = () => {
    void buttonPressHaptic();
    Alert.alert(
      'Reset All Data',
      'This will delete all your workouts, achievements, and progress. This action cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: () => {
            useAppStore.persist.clearStorage();
            Alert.alert('Data Reset', 'All data has been cleared. Restarting app...');
            setTimeout(() => {
              global.location?.reload?.();
            }, 1500);
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    void buttonPressHaptic();
    Alert.alert('Export Data', 'Export feature coming soon! You will be able to export your data as CSV or JSON.');
  };

  const handleColorSelect = (colorId: string) => {
    void buttonPressHaptic();
    setAccentColor(colorId as AccentColor);
  };

  const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { gap: 14 },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginBottom: 8 },
    backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    title: { flex: 1, fontSize: 24, fontWeight: '900', textAlign: 'center' },
    placeholder: { width: 44 },

    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    cardTitle: { fontSize: 16, fontWeight: '800' },

    quickAccessContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12 },
    quickAccessItem: { alignItems: 'center', gap: 8 },
    quickAccessIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    quickAccessLabel: { fontSize: 12, fontWeight: '700' },

    unitContainer: { flexDirection: 'row', gap: 12 },
    unitOption: { flex: 1, paddingVertical: 16, paddingHorizontal: 12, borderRadius: 14, alignItems: 'center', borderWidth: 2 },
    unitOptionActive: {},
    unitLabel: { fontSize: 14, fontWeight: '700' },
    unitLabelActive: {},
    unitSub: { fontSize: 11, marginTop: 4 },
    unitSubActive: {},

    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    switchInfo: { flex: 1, paddingRight: 12 },
    switchTitle: { fontSize: 15, fontWeight: '700' },
    switchSub: { fontSize: 12, marginTop: 4 },

    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
    actionBtnTxt: { fontSize: 15, fontWeight: '700' },
    dangerBtn: { marginBottom: 0 },
    dangerBtnTxt: {},

    infoContainer: { gap: 12 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    infoLabel: { fontSize: 14 },
    infoValue: { fontSize: 14, fontWeight: '700' },
    infoCopyright: { fontSize: 11, textAlign: 'center', marginTop: 8, paddingTop: 12, borderTopWidth: 1 },
  });

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 40 }]}
    >
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.cardElevated, borderColor: colors.border }]} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <ChevronLeft color={colors.text} size={26} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <Card>
        <View style={styles.cardHeader}>
          <Activity color={colors.accent} size={20} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Quick Access</Text>
        </View>
        <View style={styles.quickAccessContainer}>
          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => {
              void buttonPressHaptic();
              const rootNav = navigation.getParent();
              if (rootNav) rootNav.navigate('Track');
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.quickAccessIcon, { backgroundColor: colors.accent + '22' }]}>
              <Activity color={colors.accent} size={24} />
            </View>
            <Text style={[styles.quickAccessLabel, { color: colors.text }]}>Track</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => {
              void buttonPressHaptic();
              const rootNav = navigation.getParent();
              if (rootNav) rootNav.navigate('Plan');
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.quickAccessIcon, { backgroundColor: '#7bed9f22' }]}>
              <ListChecks color="#7bed9f" size={24} />
            </View>
            <Text style={[styles.quickAccessLabel, { color: colors.text }]}>Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAccessItem}
            onPress={() => {
              void buttonPressHaptic();
              const rootNav = navigation.getParent();
              if (rootNav) rootNav.navigate('Achievements');
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.quickAccessIcon, { backgroundColor: '#ffa50222' }]}>
              <Trophy color="#ffa502" size={24} />
            </View>
            <Text style={[styles.quickAccessLabel, { color: colors.text }]}>Awards</Text>
          </TouchableOpacity>
        </View>
      </Card>

      <Card>
        <View style={styles.cardHeader}>
          <Ruler color={colors.accent} size={20} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Units</Text>
        </View>
        <View style={styles.unitContainer}>
          {UNIT_SYSTEMS.map((unit) => (
            <TouchableOpacity
              key={unit.id}
              style={[
                styles.unitOption,
                { backgroundColor: colors.cardElevated, borderColor: colors.border },
                selectedUnit === unit.id && { borderColor: colors.accent, backgroundColor: colors.accent + '11' },
              ]}
              onPress={() => {
                void buttonPressHaptic();
                setSelectedUnit(unit.id as 'metric' | 'imperial');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.unitLabel,
                  { color: colors.textMuted },
                  selectedUnit === unit.id && { color: colors.accent },
                ]}
              >
                {unit.label}
              </Text>
              <Text
                style={[
                  styles.unitSub,
                  { color: colors.textMuted },
                  selectedUnit === unit.id && { color: colors.accent },
                ]}
              >
                {unit.distance} / {unit.weight}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card>
        <View style={styles.cardHeader}>
          <Palette color={colors.accent} size={20} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Accent Color</Text>
        </View>
        <ColorPicker selectedColor={accentColor} onSelectColor={handleColorSelect} />
      </Card>

      <Card>
        <View style={styles.cardHeader}>
          <Bell color={colors.accent} size={20} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Notifications</Text>
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={[styles.switchTitle, { color: colors.text }]}>Enable Notifications</Text>
            <Text style={[styles.switchSub, { color: colors.textMuted }]}>Get updates on your progress</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={(v) => {
              void buttonPressHaptic();
              setNotificationsEnabled(v);
            }}
            trackColor={{ false: colors.border, true: colors.accentMuted }}
            thumbColor={notificationsEnabled ? colors.accent : colors.textMuted}
          />
        </View>
      </Card>

      <Card>
        <View style={styles.cardHeader}>
          <Moon color={colors.accent} size={20} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Battery Saver</Text>
        </View>
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={[styles.switchTitle, { color: colors.text }]}>Power Saving Mode</Text>
            <Text style={[styles.switchSub, { color: colors.textMuted }]}>Limit background updates</Text>
          </View>
          <Switch
            value={batterySaverMode}
            onValueChange={(v) => {
              void buttonPressHaptic();
              setBatterySaverMode(v);
            }}
            trackColor={{ false: colors.border, true: colors.accentMuted }}
            thumbColor={batterySaverMode ? colors.accent : colors.textMuted}
          />
        </View>
      </Card>

      <Card>
        <View style={styles.cardHeader}>
          <RotateCcw color={colors.accent} size={20} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Data</Text>
        </View>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.cardElevated, borderColor: colors.border }]} onPress={handleExportData} activeOpacity={0.8}>
          <Text style={[styles.actionBtnTxt, { color: colors.accent }]}>📤 Export Data</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.dangerBtn, { backgroundColor: colors.textMuted + '22', borderColor: colors.textMuted }]}
          onPress={handleResetData}
          activeOpacity={0.8}
        >
          <Trash2 color={colors.textMuted} size={18} />
          <Text style={[styles.actionBtnTxt, styles.dangerBtnTxt, { color: colors.textMuted }]}>Reset All Data</Text>
        </TouchableOpacity>
      </Card>

      <Card>
        <View style={styles.cardHeader}>
          <Info color={colors.accent} size={20} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>About</Text>
        </View>
        <View style={styles.infoContainer}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Version</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{APP_VERSION}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Developer</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>Kamil Jakubowski</Text>
          </View>
          <Text style={[styles.infoCopyright, { color: colors.textMuted, borderTopColor: colors.border }]}>© 2024 Mobile Daily Stats. All rights reserved.</Text>
        </View>
      </Card>
    </ScrollView>
  );
}
