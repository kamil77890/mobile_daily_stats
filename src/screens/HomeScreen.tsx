import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronDown, ChevronUp, MapPin, Plus, Settings2 } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedCard } from '../components/AnimatedCard';
import { InlineMapDaySelector } from '../components/InlineMapDaySelector';
import { LevelBadge } from '../components/LevelBadge';
import { WeatherCard } from '../components/WeatherCard';
import { ActivityRing } from '../components/ActivityRings';
import { WeeklyBars } from '../components/WeeklyBars';
import { CustomGoalModal } from '../components/CustomGoalModal';
import { CustomGoalCard } from '../components/CustomGoalCard';
import { useActivityStatus } from '../hooks/useActivityStatus';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useAppStore } from '../store/useAppStore';
import type { Coord, DailyGoal } from '../store/types';
import { useThemeColors } from '../theme/ThemeContext';
import { darkMapStyle } from '../theme/mapStyle';
import { buildColoredPolylines } from '../utils/activityTimeline';
import { dayKey, lastNDayKeys, parseDayKey } from '../utils/dates';
import { kcalFromWalk, regionForCoords } from '../utils/geo';

const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function StartDot() {
  const colors = useThemeColors();
  return (
    <View style={{
      width: 14, height: 14, borderRadius: 7,
      backgroundColor: colors.markerStart,
      borderWidth: 2, borderColor: '#fff',
    }} />
  );
}

function EndDot() {
  const colors = useThemeColors();
  return (
    <View style={{
      width: 14, height: 14, borderRadius: 7,
      backgroundColor: colors.markerEnd,
      borderWidth: 2, borderColor: '#fff',
    }} />
  );
}

function getWaypoints(coords: Coord[], intervalMs = 20_000): Coord[] {
  if (coords.length < 3) return [];
  const pts: Coord[] = [];
  let lastT = (coords[0].timestamp ?? 0) - 1;
  for (let i = 1; i < coords.length - 1; i++) {
    const t = coords[i].timestamp ?? 0;
    if (t - lastT >= intervalMs) { pts.push(coords[i]); lastT = t; }
  }
  return pts;
}

export function HomeScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const dk = dayKey();
  const history = useAppStore(s => s.history);
  const sessions = useAppStore(s => s.sessions);
  const goalKm = useAppStore(s => s.dailyGoalKm);
  const goalCal = useAppStore(s => s.dailyGoalCalories);
  const goalSteps = 10000;
  const actStatus = useActivityStatus();
  const level = useAppStore(s => s.gamification.level);
  const xp = useAppStore(s => s.gamification.xp);

  const [currentLocation, setCurrentLocation] = useState<Coord | null>(null);

  // Map expansion state
  const [mapExpanded, setMapExpanded] = useState(false);

  // Map day selection state (defaults to today)
  const [mapDayKey, setMapDayKey] = useState(() => dayKey());

  // Custom goals state
  const dailyGoals = useAppStore(s => s.dailyGoals);
  const addDailyGoal = useAppStore(s => s.addDailyGoal);
  const updateDailyGoal = useAppStore(s => s.updateDailyGoal);
  const removeDailyGoal = useAppStore(s => s.removeDailyGoal);
  const completeDailyGoal = useAppStore(s => s.completeDailyGoal);
  const incrementDailyGoals = useAppStore(s => s.incrementDailyGoals);

  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<DailyGoal | null>(null);

  // Increment goals on mount (new day check)
  useEffect(() => {
    incrementDailyGoals();
  }, []);

  const handleGoalSave = (name: string, targetValue: number, dailyIncrement: number, unit: string) => {
    if (editingGoal) {
      updateDailyGoal(editingGoal.id, { name, targetValue, dailyIncrement, unit });
      setEditingGoal(null);
    } else {
      addDailyGoal(name, targetValue, dailyIncrement, unit);
    }
  };

  const handleGoalEdit = (goal: DailyGoal) => {
    setEditingGoal(goal);
    setGoalModalVisible(true);
  };

  const handleGoalDelete = (id: string) => {
    removeDailyGoal(id);
  };

  const handleGoalComplete = (id: string) => {
    completeDailyGoal(id);
  };

  const handleOpenCreateGoal = () => {
    setEditingGoal(null);
    setGoalModalVisible(true);
  };

  useEffect(() => {
    let isMounted = true;

    const getCurrentLocation = async () => {
      try {
        const { getForegroundPermissionsAsync, getCurrentPositionAsync } = await import('expo-location');
        const { status } = await getForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await getCurrentPositionAsync({ accuracy: 3 });
          if (isMounted) {
            setCurrentLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              altitude: location.coords.altitude ?? null,
              timestamp: Date.now(),
            });
          }
        }
      } catch (err) {
        console.log('Location fetch error:', err);
        
      }
    };

    getCurrentLocation();
    const interval = setInterval(getCurrentLocation, 120000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleNavigate = useCallback((screen: keyof RootStackParamList) => {
    const rootNav = nav.getParent();
    if (rootNav && 'navigate' in rootNav) {
      (rootNav as any).navigate(screen);
    }
  }, [nav]);

  const handleNavigateToTab = useCallback((tabName: keyof MainTabParamList) => {
    const rootNav = nav.getParent();
    if (rootNav && 'navigate' in rootNav) {
      (rootNav as any).navigate('MainTabs', { screen: tabName });
    }
  }, [nav]);

  // ── Map data computed from selected map day ─────────────────────
  const mapDaySessions = useMemo(
    () => [...sessions].filter(s => s.dayKey === mapDayKey).sort((a, b) => a.startedAt - b.startedAt),
    [sessions, mapDayKey],
  );
  const mergedCoords = useMemo(() => mapDaySessions.flatMap(s => s.coords), [mapDaySessions]);
  const mapRegion = useMemo(() => regionForCoords(mergedCoords), [mergedCoords]);
  const waypoints = useMemo(() => getWaypoints(mergedCoords, 20_000), [mergedCoords]);

  const startEnd = useMemo(() => {
    if (!mapDaySessions.length) return null;
    const first = mapDaySessions[0].coords[0];
    const lastS = mapDaySessions[mapDaySessions.length - 1];
    const last = lastS.coords[lastS.coords.length - 1];
    return first && last ? { start: first, end: last } : null;
  }, [mapDaySessions]);

  const hasRoute = mergedCoords.length > 1;

  const handleDaySelect = useCallback((newDk: string) => {
    setMapDayKey(newDk);
  }, []);

  const toggleMapExpanded = useCallback(() => {
    setMapExpanded(prev => !prev);
  }, []);

  const today = history[dk] ?? { steps: 0, distanceM: 0, kcal: 0, inclineM: 0, goalMet: false };

  const weekKeys = useMemo(() => lastNDayKeys(7), []);
  const weekKm = weekKeys.map(k => (history[k]?.distanceM ?? 0) / 1000);
  const weekSteps = weekKeys.map(k => history[k]?.steps ?? 0);
  const weekLabels = weekKeys.map(k => WD[parseDayKey(k).getDay()]);
  const maxWeek = Math.max(...weekKm, goalKm);

  const todayKm = today.distanceM / 1000;
  const burnKcal = kcalFromWalk(todayKm, today.steps);

  const actColor =
    actStatus === 'walking' ? '#39FF14' :
    actStatus === 'vehicle' ? colors.vehicle : colors.textMuted;
  const actIcon = actStatus === 'walking' ? '🚶' : actStatus === 'vehicle' ? '🚗' : '💺';
  const actLabel = actStatus === 'walking' ? 'Walking' : actStatus === 'vehicle' ? 'In Vehicle' : 'Stationary';

  const styles = StyleSheet.create({
    scroll: { flex: 1 },
    content: { paddingBottom: 32, paddingHorizontal: 16, gap: 14 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 28, fontWeight: '800' },
    muted: { marginTop: 4, fontSize: 13 },
    muted2: { fontSize: 11, marginTop: 10, fontWeight: '700' },
    gear: {
      width: 44, height: 44, borderRadius: 22,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1,
    },
    actPill: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 10, paddingVertical: 6,
      borderRadius: 999, borderWidth: 1.5,
      gap: 5,
    },
    actIcon: { fontSize: 14 },
    actLabel: { fontSize: 12, fontWeight: '800' },

    ringsCard: { padding: 20 },
    ringsContainer: { alignItems: 'center' },
    ringsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
    ringItem: { alignItems: 'center', gap: 6 },
    ringLabel: { fontSize: 11, fontWeight: '700', marginTop: 6 },

    mapCard: { padding: 0, overflow: 'hidden' },
    mapWrap: { height: 190, width: '100%', backgroundColor: '#111' },
    mapWrapExpanded: { height: 400, width: '100%', backgroundColor: '#111' },
    mapEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
    mapEmptyTxt: { textAlign: 'center', lineHeight: 20 },
    mapStats: { padding: 16, gap: 4 },
    mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
    mapHeaderTitle: { fontSize: 14, fontWeight: '800' },
    mapExpandBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    statLine: { fontSize: 13, fontWeight: '700' },
    statVal: {},

    legendRow: { flexDirection: 'row', gap: 14, marginTop: 6 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendLine: { width: 20, height: 3, borderRadius: 2 },
    legendTxt: { fontSize: 11, fontWeight: '600' },
    mapHint: { fontSize: 12, marginTop: 4, fontWeight: '700' },

    currentLocationMarker: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 10,
      elevation: 8,
    },

    waypointDot: {
      width: 7, height: 7, borderRadius: 3.5,
      opacity: 0.7,
    },

    rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20 },
    rowBig: { fontSize: 22, fontWeight: '800' },
    donutContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 2,
    },
    donutLabel: {
      fontSize: 20,
      fontWeight: '900',
    },
    donutSub: {
      fontSize: 9,
      fontWeight: '700',
      marginTop: 4,
      textAlign: 'center',
    },

    weekHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    cardTitle: { fontSize: 18, fontWeight: '800' },
  });

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={[styles.scroll, { backgroundColor: colors.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Summary</Text>
            <Text style={[styles.muted, { color: colors.textMuted }]}>Today's movement</Text>
          </View>
          <LevelBadge level={level} xp={xp} size="small" />
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.actPill, { borderColor: actColor }]}>
            <Text style={styles.actIcon}>{actIcon}</Text>
            <Text style={[styles.actLabel, { color: actColor }]}>{actLabel}</Text>
          </View>
          <TouchableOpacity style={[styles.gear, { backgroundColor: colors.cardElevated, borderColor: colors.border }]} onPress={() => handleNavigateToTab('Settings')} activeOpacity={0.8}>
            <Settings2 color={colors.accent} size={22} />
          </TouchableOpacity>
        </View>
      </View>

      <WeatherCard />

      {/* Interactive Map Card */}
      <AnimatedCard style={styles.mapCard} delay={100}>
        {/* Map header (always visible) */}
        <View style={styles.mapHeader}>
          <Text style={[styles.mapHeaderTitle, { color: colors.text }]}>
            {mapDayKey === dk ? 'Today\'s Route' : parseDayKey(mapDayKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity
              style={[styles.mapExpandBtn, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}
              onPress={toggleMapExpanded}
              activeOpacity={0.8}
            >
              {mapExpanded ? <ChevronUp color={colors.accent} size={18} /> : <ChevronDown color={colors.accent} size={18} />}
            </TouchableOpacity>
            {!mapExpanded && (
              <TouchableOpacity
                style={[styles.mapExpandBtn, { backgroundColor: colors.accent, borderColor: colors.accent }]}
                onPress={() => handleNavigate('MapShare')}
                activeOpacity={0.8}
              >
                <MapPin color={colors.bg} size={16} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Day selector (visible when expanded) */}
        {mapExpanded && (
          <InlineMapDaySelector
            selectedDayKey={mapDayKey}
            onDaySelect={handleDaySelect}
            history={history}
          />
        )}

        {/* Map view */}
        <View style={mapExpanded ? styles.mapWrapExpanded : styles.mapWrap}>
          {hasRoute || currentLocation ? (
            <MapView
              style={StyleSheet.absoluteFill}
              initialRegion={currentLocation && mapDayKey === dk ? regionForCoords([currentLocation]) : mapRegion}
              scrollEnabled={mapExpanded}
              zoomEnabled={mapExpanded}
              pitchEnabled={false}
              rotateEnabled={false}
              customMapStyle={darkMapStyle}
              userInterfaceStyle="dark"
            >
              {/* Current location marker (only on today's map) */}
              {currentLocation && mapDayKey === dk && (
                <Marker
                  coordinate={{ latitude: currentLocation.latitude, longitude: currentLocation.longitude }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}
                >
                  <View style={[styles.currentLocationMarker, { backgroundColor: colors.accent, borderColor: colors.bg, shadowColor: colors.accent }]}>
                    <MapPin color={colors.bg} size={20} strokeWidth={3} />
                  </View>
                </Marker>
              )}
              {mapDaySessions.map(s => {
                const segs = buildColoredPolylines(s.coords, s.startedAt, s.endedAt);
                return segs.map((seg, idx) => (
                  <Polyline
                    key={`${s.id}-${idx}`}
                    coordinates={seg.coords}
                    strokeColor={seg.color}
                    strokeWidth={seg.strokeWidth}
                    lineJoin="round"
                    lineCap="round"
                  />
                ));
              })}
              {waypoints.map((wp, idx) => (
                <Marker
                  key={`wp-${idx}`}
                  coordinate={wp}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}
                >
                  <View style={[styles.waypointDot, { backgroundColor: colors.routeLine }]} />
                </Marker>
              ))}
              {startEnd && (
                <>
                  <Marker
                    coordinate={{ latitude: startEnd.start.latitude, longitude: startEnd.start.longitude }}
                    anchor={{ x: 0.5, y: 0.5 }}
                    tracksViewChanges={false}
                  >
                    <StartDot />
                  </Marker>
                  <Marker
                    coordinate={{ latitude: startEnd.end.latitude, longitude: startEnd.end.longitude }}
                    anchor={{ x: 0.5, y: 0.5 }}
                    tracksViewChanges={false}
                  >
                    <EndDot />
                  </Marker>
                </>
              )}
            </MapView>
          ) : (
            <View style={styles.mapEmpty}>
              <Text style={[styles.mapEmptyTxt, { color: colors.textMuted }]}>
                {mapDayKey === dk ? 'Enable location to see the map' : 'No route data for this day'}
              </Text>
            </View>
          )}
        </View>

        {/* Map stats (only when not expanded) */}
        {!mapExpanded && (
          <View style={styles.mapStats}>
            <Text style={[styles.statLine, { color: colors.textMuted }]}>STEPS: <Text style={[styles.statVal, { color: colors.accent }]}>{today.steps.toLocaleString()}</Text></Text>
            <Text style={[styles.statLine, { color: colors.textMuted }]}>DISTANCE: <Text style={[styles.statVal, { color: colors.accent }]}>{todayKm.toFixed(1)} km</Text></Text>
            <Text style={[styles.statLine, { color: colors.textMuted }]}>CALORIES: <Text style={[styles.statVal, { color: colors.accent }]}>{burnKcal} kcal</Text></Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: colors.routeLine }]} />
                <Text style={[styles.legendTxt, { color: colors.textMuted }]}>Walk</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: colors.routeVehicle }]} />
                <Text style={[styles.legendTxt, { color: colors.textMuted }]}>Vehicle</Text>
              </View>
            </View>
            <Text style={[styles.mapHint, { color: colors.accent }]}>Tap ↑ to expand, or pin for full map</Text>
          </View>
        )}
      </AnimatedCard>

      <AnimatedCard style={styles.ringsCard} delay={200}>
        <View style={styles.ringsContainer}>
          <View style={styles.ringsRow}>
            <View style={styles.ringItem}>
              <ActivityRing
                value={today.steps}
                maxValue={goalSteps}
                color={colors.accent}
                size={100}
                stroke={12}
                centerLabel={`${Math.max(0, goalSteps - today.steps).toLocaleString()}`}
                centerSubLabel="left"
              />
              <Text style={[styles.ringLabel, { color: colors.textMuted }]}>Steps</Text>
            </View>
            <View style={styles.ringItem}>
              <ActivityRing
                value={todayKm}
                maxValue={goalKm}
                color="#FF4500"
                size={100}
                stroke={12}
                centerLabel={`${Math.max(0, goalKm - todayKm).toFixed(1)}`}
                centerSubLabel="km left"
              />
              <Text style={[styles.ringLabel, { color: colors.textMuted }]}>Distance</Text>
            </View>
            <View style={styles.ringItem}>
              <ActivityRing
                value={burnKcal}
                maxValue={goalCal}
                color="#00E676"
                size={100}
                stroke={12}
                centerLabel={`${Math.max(0, goalCal - burnKcal)}`}
                centerSubLabel="kcal left"
              />
              <Text style={[styles.ringLabel, { color: colors.textMuted }]}>Calories</Text>
            </View>
          </View>
        </View>
      </AnimatedCard>

      <AnimatedCard delay={300}>
        <View style={styles.weekHead}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Weekly distance</Text>
          <Text style={[styles.muted, { color: colors.textMuted }]}>LAST 7 DAYS</Text>
        </View>
        <WeeklyBars labels={weekLabels} values={weekKm} steps={weekSteps} goalKm={goalKm} maxVal={maxWeek} />
      </AnimatedCard>

      {/* Custom Daily Goals Section */}
      <View style={{ marginTop: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Daily Goals</Text>
          <TouchableOpacity
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}
            onPress={handleOpenCreateGoal}
            activeOpacity={0.8}
          >
            <Plus color={colors.bg} size={20} />
          </TouchableOpacity>
        </View>

        {dailyGoals.length === 0 ? (
          <TouchableOpacity
            style={{ backgroundColor: colors.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center' }}
            onPress={handleOpenCreateGoal}
            activeOpacity={0.8}
          >
            <Plus color={colors.textMuted} size={32} />
            <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '600', marginTop: 8 }}>Add your first daily goal</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>Track custom habits that increase daily</Text>
          </TouchableOpacity>
        ) : (
          dailyGoals.map(goal => (
            <CustomGoalCard
              key={goal.id}
              goal={goal}
              onComplete={handleGoalComplete}
              onEdit={handleGoalEdit}
              onDelete={handleGoalDelete}
            />
          ))
        )}
      </View>

      {/* Goal Modal */}
      <CustomGoalModal
        visible={goalModalVisible}
        onClose={() => { setGoalModalVisible(false); setEditingGoal(null); }}
        onSave={handleGoalSave}
        editGoal={editingGoal}
      />
    </ScrollView>
  );
}
