import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ScrollView, StatusBar, Modal, TextInput, Alert,
  ActivityIndicator, Linking, Switch, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Location } from '../types';
import { useVacations } from '../context/VacationContext';
import { Colors, Spacing, Radius } from '../theme';
import { formatDate } from '../utils/dateUtils';
import PlacesSearchInput from '../components/PlacesSearchInput';
import {
  parseGoogleMapsUrlAsync,
  formatDistance,
  formatDuration,
  formatStayDuration,
  distanceBetween,
} from '../utils/maps';
import MapComponent from '../components/MapComponent';
import { fetchPlacePhotos } from '../utils/maps';
import { GOOGLE_MAPS_API_KEY } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DayDetail'>;

const TRAVEL_MODES = [
  { key: 'walking' as const, label: 'Pe jos', icon: '🚶', speedKmh: 5 },
  { key: 'driving' as const, label: 'Cu mașina', icon: '🚗', speedKmh: 40 },
  { key: 'transit' as const, label: 'Transport', icon: '🚌', speedKmh: 20 },
];

function estimateTravelTime(loc1: Location, loc2: Location, travelMode: string): string {
  const dist = distanceBetween(loc1.lat, loc1.lng, loc2.lat, loc2.lng);
  const speed = TRAVEL_MODES.find(m => m.key === travelMode)?.speedKmh ?? 5;
  const hours = dist / 1000 / speed;
  const minutes = Math.round(hours * 60);
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function DayDetailScreen({ route, navigation }: Props) {
  const { vacationId, dayId } = route.params;
  const { getVacation, addLocation, deleteLocation, reorderLocations, autoOptimizeDay, setTravelMode, updateLocation, updateVacation } = useVacations();
  const vacation = getVacation(vacationId);
  const day = vacation?.days.find(d => d.id === dayId);

  const [activeTab, setActiveTab] = useState<'itinerariu' | 'harta'>('itinerariu');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [autoOptimize, setAutoOptimize] = useState(false);
  const [editingStay, setEditingStay] = useState<string | null>(null);
  const [stayInput, setStayInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [latInput, setLatInput] = useState('');
  const [lngInput, setLngInput] = useState('');
  const [stayDuration, setStayDuration] = useState('60');
  const [isAccommodation, setIsAccommodation] = useState(false);
  const [selectedPlacePhotos, setSelectedPlacePhotos] = useState<string[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState('');

  if (!vacation || !day) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Ziua nu a fost găsită.</Text>
      </SafeAreaView>
    );
  }

  const sortedLocations = [...day.locations].sort((a, b) => a.order - b.order);

  const handlePlaceSelected = (place: {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
  photos: string[];
}) => {
  setNameInput(place.name);
  setAddressInput(place.address);
  setLatInput(String(place.lat));
  setLngInput(String(place.lng));
  setSelectedPlacePhotos(place.photos);
  setSelectedPlaceId(place.placeId);
};

const handleAddLocation = async () => {
  if (!nameInput.trim()) {
    Alert.alert('Lipsă nume', 'Introdu un nume pentru locație.');
    return;
  }
  const lat = parseFloat(latInput) || 0;
  const lng = parseFloat(lngInput) || 0;

// Folosim direct datele deja fetchite din PlacesSearchInput
const photos = selectedPlacePhotos;
const placeId = selectedPlaceId;
const resolvedAddress = addressInput.trim();

  await addLocation(vacationId, dayId, {
    name: nameInput.trim(),
    address: resolvedAddress,
    lat,
    lng,
    googleMapsUrl: placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : '',
    stayDuration: parseInt(stayDuration) || 60,
    isAccommodation,
    photos,
    placeId,
  });


    // Dacă e cazare, salvează și pe vacation
    if (isAccommodation && lat !== 0 && lng !== 0 && vacation) {
      await updateVacation({
        ...vacation,
        accommodationLat: lat,
        accommodationLng: lng,
        accommodationName: nameInput.trim(),
      });
    }

    if (autoOptimize && lat !== 0 && lng !== 0) {
      await autoOptimizeDay(vacationId, dayId);
    }

    setNameInput(''); setAddressInput('');
    setLatInput(''); setLngInput(''); setStayDuration('60');
    setIsAccommodation(false);
    setSelectedPlacePhotos([]);
    setSelectedPlaceId('');
    setAddModalVisible(false);
  };

  const handleDeleteLocation = (loc: Location) => {
    Alert.alert(
      'Șterge locația',
      `Sigur vrei să ștergi "${loc.name}"?`,
      [
        { text: 'Anulează', style: 'cancel' },
        { text: 'Șterge', style: 'destructive', onPress: () => deleteLocation(vacationId, dayId, loc.id) },
      ]
    );
  };

  const handleAutoOptimize = async () => {
    await autoOptimizeDay(vacationId, dayId);
  };

  const handleMoveUp = async (idx: number) => {
    if (idx === 0) return;
    const newOrder = [...sortedLocations];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    await reorderLocations(vacationId, dayId, newOrder);
  };

  const handleMoveDown = async (idx: number) => {
    if (idx === sortedLocations.length - 1) return;
    const newOrder = [...sortedLocations];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    await reorderLocations(vacationId, dayId, newOrder);
  };

  const handleSaveStay = async (locId: string) => {
    const loc = day.locations.find(l => l.id === locId);
    if (!loc) return;
    await updateLocation(vacationId, dayId, {
      ...loc,
      stayDuration: parseInt(stayInput) || loc.stayDuration,
    });
    setEditingStay(null);
  };

  const totalStay = sortedLocations.reduce((s, l) => s + l.stayDuration, 0);
  const travelModeIcon = TRAVEL_MODES.find(m => m.key === day.travelMode)?.icon ?? '🚶';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: vacation.coverColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Ziua {day.dayNumber}</Text>
          <Text style={styles.headerSub}>{formatDate(day.date, 'long')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: vacation.coverColor }]}
          onPress={() => setAddModalVisible(true)}
        >
          <Text style={styles.addBtnText}>+ Locație</Text>
        </TouchableOpacity>
      </View>

      {/* Travel mode */}
      <View style={styles.travelModeBar}>
        {TRAVEL_MODES.map(m => (
          <TouchableOpacity
            key={m.key}
            style={[
              styles.travelModeBtn,
              day.travelMode === m.key && [styles.travelModeBtnActive, { backgroundColor: vacation.coverColor + '33', borderColor: vacation.coverColor }],
            ]}
            onPress={() => setTravelMode(vacationId, dayId, m.key)}
          >
            <Text style={styles.travelModeIcon}>{m.icon}</Text>
            <Text style={[styles.travelModeLabel, day.travelMode === m.key && { color: vacation.coverColor }]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.travelModeSep} />
        <TouchableOpacity
          style={[styles.optimizeBtn, autoOptimize && { backgroundColor: vacation.coverColor + '22' }]}
          onPress={() => {
            if (!autoOptimize) { setAutoOptimize(true); handleAutoOptimize(); }
            else setAutoOptimize(false);
          }}
        >
          <Text style={[styles.optimizeBtnText, autoOptimize && { color: vacation.coverColor }]}>
            {autoOptimize ? '🔀 Auto' : '✋ Manual'}
          </Text>
        </TouchableOpacity>
        {!autoOptimize && sortedLocations.length >= 2 && (
          <TouchableOpacity style={styles.optimizeNowBtn} onPress={handleAutoOptimize}>
            <Text style={styles.optimizeNowBtnText}>Optimizează</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Summary bar */}
      {sortedLocations.length > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryItem}>📍 {sortedLocations.length} locații</Text>
          <Text style={styles.summaryDot}>·</Text>
          <Text style={styles.summaryItem}>⏱ {formatStayDuration(totalStay)} total</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'itinerariu' && [styles.tabActive, { borderBottomColor: vacation.coverColor }]]}
          onPress={() => setActiveTab('itinerariu')}
        >
          <Text style={[styles.tabText, activeTab === 'itinerariu' && styles.tabTextActive]}>📋 Itinerariu</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'harta' && [styles.tabActive, { borderBottomColor: vacation.coverColor }]]}
          onPress={() => setActiveTab('harta')}
        >
          <Text style={[styles.tabText, activeTab === 'harta' && styles.tabTextActive]}>🗺️ Hartă</Text>
        </TouchableOpacity>
      </View>

      {/* TAB: Itinerariu */}
      {activeTab === 'itinerariu' ? (
        <FlatList
          data={sortedLocations}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={styles.emptyTitle}>Nicio locație planificată</Text>
              <Text style={styles.emptySub}>Adaugă un link Google Maps sau coordonate manuale</Text>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: vacation.coverColor }]} onPress={() => setAddModalVisible(true)}>
                <Text style={styles.emptyBtnText}>+ Adaugă locație</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item: loc, index }) => (
            <View>
              <View style={styles.locationCard}>
                <View style={styles.locationCardLeft}>
                  <View style={[styles.locNumber, { backgroundColor: loc.isAccommodation ? Colors.gold : vacation.coverColor }]}>
                    {loc.isAccommodation
                      ? <Text style={styles.locNumberText}>🏨</Text>
                      : <Text style={styles.locNumberText}>{index + 1}</Text>
                    }
                  </View>
                  {index < sortedLocations.length - 1 && (
                    <View style={[styles.connector, { backgroundColor: vacation.coverColor + '40' }]} />
                  )}
                </View>

                <View style={styles.locationCardBody}>
                  <View style={styles.locationCardTop}>
                    <View style={styles.locationCardInfo}>
                      <Text style={styles.locationName}>{loc.name}</Text>
                      {loc.address ? <Text style={styles.locationAddress}>{loc.address}</Text> : null}
                      {/* Poze Google Maps */}
{loc.photos && loc.photos.length > 0 && (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.photosRow}
  >
    {loc.photos.map((uri, idx) => (
      <Image
        key={idx}
        source={{ uri }}
        style={styles.locationPhoto}
        resizeMode="cover"
      />
    ))}
  </ScrollView>
)}
                      {loc.isAccommodation && (
                        <Text style={[styles.accommodationTag, { color: Colors.gold }]}>🏨 Cazare</Text>
                      )}
                    </View>
                    <View style={styles.locationActions}>
                      {!autoOptimize && (
                        <View style={styles.reorderBtns}>
                          <TouchableOpacity onPress={() => handleMoveUp(index)} disabled={index === 0} style={styles.reorderBtn}>
                            <Text style={[styles.reorderBtnText, index === 0 && styles.reorderBtnDisabled]}>↑</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleMoveDown(index)} disabled={index === sortedLocations.length - 1} style={styles.reorderBtn}>
                            <Text style={[styles.reorderBtnText, index === sortedLocations.length - 1 && styles.reorderBtnDisabled]}>↓</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      <TouchableOpacity onPress={() => handleDeleteLocation(loc)} style={styles.deleteBtn}>
                        <Text style={styles.deleteBtnText}>🗑</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.locationMeta}>
                    <TouchableOpacity
                      style={styles.stayBadge}
                      onPress={() => { setEditingStay(loc.id); setStayInput(String(loc.stayDuration)); }}
                    >
                      <Text style={styles.stayBadgeText}>⏱ {formatStayDuration(loc.stayDuration)}</Text>
                    </TouchableOpacity>

                    {loc.googleMapsUrl ? (
                      <TouchableOpacity
                        style={styles.mapsLinkBtn}
                        onPress={() => Linking.openURL(loc.googleMapsUrl)}
                      >
                        <Text style={styles.mapsLinkBtnText}>📎 Maps</Text>
                      </TouchableOpacity>
                    ) : null}

                    {loc.lat !== 0 && (
                      <Text style={styles.coordsText}>{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</Text>
                    )}
                  </View>

                  {editingStay === loc.id && (
                    <View style={styles.stayEditor}>
                      <TextInput
                        style={styles.stayEditorInput}
                        value={stayInput}
                        onChangeText={setStayInput}
                        keyboardType="numeric"
                        placeholder="Minute"
                        placeholderTextColor={Colors.textMuted}
                      />
                      <Text style={styles.stayEditorUnit}>min</Text>
                      <TouchableOpacity style={[styles.stayEditorSave, { backgroundColor: vacation.coverColor }]} onPress={() => handleSaveStay(loc.id)}>
                        <Text style={styles.stayEditorSaveText}>OK</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.stayEditorCancel} onPress={() => setEditingStay(null)}>
                        <Text style={styles.stayEditorCancelText}>Anulează</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Travel time between locations */}
              {index < sortedLocations.length - 1 &&
                sortedLocations[index].lat !== 0 &&
                sortedLocations[index + 1].lat !== 0 && (
                  <View style={styles.travelTimeBetween}>
                    <View style={styles.travelTimeLine} />
                    <View style={[styles.travelTimeBadge, { backgroundColor: Colors.card, borderColor: Colors.cardBorder }]}>
                      <Text style={styles.travelTimeText}>
                        {travelModeIcon} {estimateTravelTime(sortedLocations[index], sortedLocations[index + 1], day.travelMode)}
                      </Text>
                    </View>
                    <View style={styles.travelTimeLine} />
                  </View>
                )}
            </View>
          )}
        />
      ) : (
        /* TAB: Hartă — doar harta, full height */
        <View style={styles.mapFullContainer}>
          <MapComponent
            countryCode={vacation.countryCode}
            locations={sortedLocations}
            height={undefined} // va lua din flex: 1
            showRoute={sortedLocations.length >= 2}
            travelMode={day.travelMode}
            accommodationLat={vacation.accommodationLat}
            accommodationLng={vacation.accommodationLng}
            accommodationName={vacation.accommodationName}
          />
        </View>
      )}

      {/* Add Location Modal */}
      <Modal visible={addModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
              <Text style={styles.modalCancel}>Anulează</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Adaugă locație</Text>
            <TouchableOpacity onPress={handleAddLocation}>
              <Text style={[styles.modalSave, { color: vacation.coverColor }]}>Adaugă</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Caută locație</Text>
            <PlacesSearchInput
            onPlaceSelected={handlePlaceSelected}
            accentColor={vacation.coverColor}
            />

            <Text style={styles.fieldLabel}>Nume locație *</Text>
            <TextInput
              style={styles.input}
              placeholder="ex: Turnul Eiffel"
              placeholderTextColor={Colors.textMuted}
              value={nameInput}
              onChangeText={setNameInput}
            />

            <Text style={styles.fieldLabel}>Adresă</Text>
            <TextInput
              style={styles.input}
              placeholder="Adresa locației"
              placeholderTextColor={Colors.textMuted}
              value={addressInput}
              onChangeText={setAddressInput}
            />

            <View style={styles.coordsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Latitudine</Text>
                <TextInput
                  style={styles.input}
                  placeholder="48.8584"
                  placeholderTextColor={Colors.textMuted}
                  value={latInput}
                  onChangeText={setLatInput}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={{ width: Spacing.sm }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Longitudine</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2.2945"
                  placeholderTextColor={Colors.textMuted}
                  value={lngInput}
                  onChangeText={setLngInput}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Cazare toggle */}
            <View style={styles.accommodationRow}>
              <View>
                <Text style={styles.fieldLabel}>🏨 Aceasta este cazarea mea</Text>
                <Text style={styles.accommodationHint}>Pin galben pe hartă</Text>
              </View>
              <Switch
                value={isAccommodation}
                onValueChange={setIsAccommodation}
                trackColor={{ false: Colors.cardBorder, true: Colors.gold + '88' }}
                thumbColor={isAccommodation ? Colors.gold : Colors.textMuted}
              />
            </View>

            <Text style={styles.fieldLabel}>Timp petrecut (minute)</Text>
            <View style={styles.stayOptions}>
              {[30, 60, 90, 120, 180, 240].map(min => (
                <TouchableOpacity
                  key={min}
                  style={[styles.stayOption, stayDuration === String(min) && [styles.stayOptionActive, { borderColor: vacation.coverColor }]]}
                  onPress={() => setStayDuration(String(min))}
                >
                  <Text style={[styles.stayOptionText, stayDuration === String(min) && { color: vacation.coverColor }]}>
                    {formatStayDuration(min)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, { marginTop: Spacing.sm }]}
              placeholder="Sau introdu manual (minute)"
              placeholderTextColor={Colors.textMuted}
              value={stayDuration}
              onChangeText={setStayDuration}
              keyboardType="numeric"
            />

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  errorText: { color: Colors.text, textAlign: 'center', marginTop: 40, fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 2, gap: Spacing.sm },
  backBtn: { paddingRight: Spacing.xs },
  backBtnText: { color: Colors.textSecondary, fontSize: 22 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  headerSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  addBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full },
  addBtnText: { color: Colors.white, fontWeight: '600', fontSize: 13 },
  travelModeBar: { flexDirection: 'row', padding: Spacing.sm, gap: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, flexWrap: 'wrap', alignItems: 'center' },
  travelModeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.cardBorder },
  travelModeBtnActive: { borderWidth: 1 },
  travelModeIcon: { fontSize: 14 },
  travelModeLabel: { fontSize: 12, color: Colors.textSecondary },
  travelModeSep: { flex: 1 },
  optimizeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.cardBorder },
  optimizeBtnText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  optimizeNowBtn: { backgroundColor: Colors.gold + '22', paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.gold },
  optimizeNowBtnText: { fontSize: 12, color: Colors.gold, fontWeight: '600' },
  summaryBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, gap: Spacing.sm },
  summaryItem: { fontSize: 13, color: Colors.textSecondary },
  summaryDot: { color: Colors.textMuted },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: {},
  tabText: { fontSize: 14, color: Colors.textMuted, fontWeight: '500' },
  tabTextActive: { color: Colors.text, fontWeight: '700' },
  list: { padding: Spacing.md },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, paddingHorizontal: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm },
  emptyBtn: { marginTop: Spacing.lg, paddingHorizontal: 24, paddingVertical: 12, borderRadius: Radius.full },
  emptyBtnText: { color: Colors.white, fontWeight: '600', fontSize: 15 },
  locationCard: { flexDirection: 'row', marginBottom: 4 },
  locationCardLeft: { alignItems: 'center', width: 40 },
  locNumber: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  locNumberText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  connector: { width: 2, flex: 1, marginVertical: 2 },
  locationCardBody: { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, marginLeft: Spacing.sm, borderWidth: 1, borderColor: Colors.cardBorder },
  locationCardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  locationCardInfo: { flex: 1, marginRight: Spacing.sm },
  locationName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  locationAddress: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  accommodationTag: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  locationActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reorderBtns: { flexDirection: 'row', gap: 2 },
  reorderBtn: { padding: 4 },
  reorderBtnText: { color: Colors.textSecondary, fontSize: 16 },
  reorderBtnDisabled: { color: Colors.textMuted },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 16 },
  locationMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm, flexWrap: 'wrap' },
  stayBadge: { backgroundColor: Colors.surfaceLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  stayBadgeText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  mapsLinkBtn: { backgroundColor: Colors.surfaceLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  mapsLinkBtnText: { color: Colors.textSecondary, fontSize: 12 },
  coordsText: { fontSize: 11, color: Colors.textMuted },
  stayEditor: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  stayEditorInput: { backgroundColor: Colors.surface, borderRadius: Radius.sm, padding: 8, color: Colors.text, width: 70, textAlign: 'center', fontSize: 14, borderWidth: 1, borderColor: Colors.cardBorder },
  stayEditorUnit: { color: Colors.textSecondary, fontSize: 13 },
  stayEditorSave: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  stayEditorSaveText: { color: Colors.white, fontWeight: '600', fontSize: 13 },
  stayEditorCancel: { paddingHorizontal: 8 },
  stayEditorCancelText: { color: Colors.textMuted, fontSize: 13 },
  // Travel time between stops
  travelTimeBetween: { flexDirection: 'row', alignItems: 'center', marginLeft: 40, marginBottom: Spacing.sm, paddingLeft: Spacing.sm },
  travelTimeLine: { flex: 1, height: 1, backgroundColor: Colors.cardBorder },
  travelTimeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1, marginHorizontal: Spacing.sm },
  travelTimeText: { fontSize: 11, color: Colors.textSecondary },
  // Map full screen
  mapFullContainer: { flex: 1 },
  //Poze
  photosRow: {
  marginTop: 8,
  marginBottom: 4,
},
locationPhoto: {
  width: 120,
  height: 80,
  borderRadius: 8,
  marginRight: 6,
},
  // Modal
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  modalCancel: { fontSize: 16, color: Colors.textSecondary },
  modalSave: { fontSize: 16, fontWeight: '600' },
  modalBody: { flex: 1, padding: Spacing.md },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.cardBorder },
  urlRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  parseBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: Radius.md },
  parseBtnText: { color: Colors.white, fontWeight: '600', fontSize: 14 },
  urlHint: { fontSize: 12, color: Colors.textMuted, marginTop: 6, lineHeight: 18 },
  coordsRow: { flexDirection: 'row' },
  accommodationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md, padding: Spacing.md, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.cardBorder },
  accommodationHint: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  stayOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: 4 },
  stayOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.card },
  stayOptionActive: {},
  stayOptionText: { fontSize: 13, color: Colors.textSecondary },
});