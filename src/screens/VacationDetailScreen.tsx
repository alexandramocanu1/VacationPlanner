import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../types';
import {Colors, Spacing, Radius} from '../theme';
import {
  formatDate,
  getTodayVacationDay,
  getTotalDays,
} from '../utils/dateUtils';
import {useVacations} from '../context/VacationContext';
import {COUNTRIES} from '../utils/countries';
import MapComponent from '../components/MapComponent';
type Props = NativeStackScreenProps<RootStackParamList, 'VacationDetail'>;

export default function VacationDetailScreen({route, navigation}: Props) {
  const {vacationId} = route.params;
  const {getVacation} = useVacations();
  const vacation = getVacation(vacationId);
  const [activeTab, setActiveTab] = useState<'zile' | 'harta'>('zile');

  if (!vacation) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Vacanța nu a fost găsită.</Text>
      </SafeAreaView>
    );
  }

  const totalDays = getTotalDays(vacation.startDate, vacation.endDate);
  const todayDay = getTodayVacationDay(vacation.startDate);
  const countryData = COUNTRIES.find(c => c.code === vacation.countryCode);
  const allLocations = vacation.days.flatMap(d =>
    d.locations.filter(l => l.lat !== 0 && l.lng !== 0),
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <View style={[styles.header, {borderBottomColor: vacation.coverColor}]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Înapoi</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerFlag}>{countryData?.flag || '🌍'}</Text>
          <View>
            <Text style={styles.headerTitle}>{vacation.name}</Text>
            <Text style={styles.headerSub}>
              {formatDate(vacation.startDate)} → {formatDate(vacation.endDate)}{' '}
              · {totalDays} zile
            </Text>
          </View>
        </View>
        {todayDay && todayDay <= totalDays && (
          <View
            style={[styles.todayBadge, {backgroundColor: vacation.coverColor}]}>
            <Text style={styles.todayBadgeText}>Azi: Zi {todayDay}</Text>
          </View>
        )}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'zile' && [
              styles.tabActive,
              {borderBottomColor: vacation.coverColor},
            ],
          ]}
          onPress={() => setActiveTab('zile')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'zile' && styles.tabTextActive,
            ]}>
            📅 Zile
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'harta' && [
              styles.tabActive,
              {borderBottomColor: vacation.coverColor},
            ],
          ]}
          onPress={() => setActiveTab('harta')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'harta' && styles.tabTextActive,
            ]}>
            🗺️ Hartă
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'zile' ? (
        <FlatList
          data={vacation.days}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({item: day}) => {
            const isToday = todayDay === day.dayNumber;
            const locCount = day.locations.length;
            return (
              <TouchableOpacity
                style={[
                  styles.dayCard,
                  isToday && {borderColor: vacation.coverColor, borderWidth: 2},
                ]}
                onPress={() =>
                  navigation.navigate('DayDetail', {vacationId, dayId: day.id})
                }
                activeOpacity={0.8}>
                <View
                  style={[
                    styles.dayNumber,
                    {
                      backgroundColor: isToday
                        ? vacation.coverColor
                        : Colors.surfaceLight,
                    },
                  ]}>
                  <Text style={styles.dayNumberText}>{day.dayNumber}</Text>
                </View>
                <View style={styles.dayInfo}>
                  <View style={styles.dayInfoRow}>
                    <Text style={styles.dayTitle}>Ziua {day.dayNumber}</Text>
                    {isToday && (
                      <Text
                        style={[styles.todayTag, {color: vacation.coverColor}]}>
                        AZI
                      </Text>
                    )}
                  </View>
                  <Text style={styles.dayDate}>
                    {formatDate(day.date, 'long')}
                  </Text>
                  <Text style={styles.dayLocations}>
                    {locCount === 0
                      ? '+ Adaugă locații'
                      : `${locCount} locații planificate`}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <View style={styles.mapFullContainer}>
          <MapComponent
            countryCode={vacation.countryCode}
            countryName={vacation.country}
            locations={allLocations}
            height={undefined}
            showRoute={false}
            accommodationLat={vacation.accommodationLat}
            accommodationLng={vacation.accommodationLng}
            accommodationName={vacation.accommodationName}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  errorText: {
    color: Colors.text,
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 2,
    gap: Spacing.sm,
  },
  backBtn: {paddingRight: Spacing.sm},
  backBtnText: {color: Colors.textSecondary, fontSize: 15},
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerFlag: {fontSize: 32},
  headerTitle: {fontSize: 18, fontWeight: '700', color: Colors.text},
  headerSub: {fontSize: 12, color: Colors.textMuted, marginTop: 2},
  todayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  todayBadgeText: {color: Colors.white, fontSize: 11, fontWeight: '700'},
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {},
  tabText: {fontSize: 15, color: Colors.textMuted, fontWeight: '500'},
  tabTextActive: {color: Colors.text, fontWeight: '700'},
  list: {padding: Spacing.md, gap: Spacing.sm},
  dayCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dayNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayNumberText: {color: Colors.white, fontWeight: '700', fontSize: 18},
  dayInfo: {flex: 1},
  dayInfoRow: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm},
  dayTitle: {fontSize: 16, fontWeight: '700', color: Colors.text},
  todayTag: {fontSize: 11, fontWeight: '800', letterSpacing: 1},
  dayDate: {fontSize: 13, color: Colors.textSecondary, marginTop: 2},
  dayLocations: {fontSize: 12, color: Colors.textMuted, marginTop: 3},
  chevron: {fontSize: 24, color: Colors.textMuted},
  mapFullContainer: {flex: 1},
});