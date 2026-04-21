import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList, Vacation} from '../types';
import {useVacations} from '../context/VacationContext';
import {Colors, Spacing, Radius, VACATION_COLORS} from '../theme';
import {
  formatDate,
  getTotalDays,
  getTodayVacationDay,
} from '../utils/dateUtils';
import {COUNTRIES} from '../utils/countries';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({navigation}: Props) {
  const {vacations, loading, addVacation, deleteVacation} = useVacations();
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({
    name: '',
    country: '',
    countryCode: '',
    startDate: '',
    endDate: '',
    coverColor: VACATION_COLORS[0],
  });
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()),
  );

  const handleCreate = async () => {
    if (!form.name || !form.country || !form.startDate || !form.endDate) {
      Alert.alert('Lipsesc date', 'Completează toate câmpurile obligatorii.');
      return;
    }
    if (new Date(form.startDate) > new Date(form.endDate)) {
      Alert.alert(
        'Date invalide',
        'Data de început trebuie să fie înainte de cea de sfârșit.',
      );
      return;
    }
    const v = await addVacation({
      name: form.name,
      country: form.country,
      countryCode: form.countryCode,
      startDate: form.startDate,
      endDate: form.endDate,
      coverColor: form.coverColor,
    });
    setModalVisible(false);
    setForm({
      name: '',
      country: '',
      countryCode: '',
      startDate: '',
      endDate: '',
      coverColor: VACATION_COLORS[0],
    });
    navigation.navigate('VacationDetail', {vacationId: v.id});
  };

  const handleDelete = (v: Vacation) => {
    Alert.alert('Șterge vacanța', `Sigur vrei să ștergi "${v.name}"?`, [
      {text: 'Anulează', style: 'cancel'},
      {
        text: 'Șterge',
        style: 'destructive',
        onPress: () => deleteVacation(v.id),
      },
    ]);
  };

  const renderVacationCard = ({item}: {item: Vacation}) => {
    const totalDays = getTotalDays(item.startDate, item.endDate);
    const todayDay = getTodayVacationDay(item.startDate);
    const isActive = todayDay !== null && todayDay <= totalDays;
    const countryData = COUNTRIES.find(c => c.code === item.countryCode);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {borderLeftColor: item.coverColor, borderLeftWidth: 4},
        ]}
        onPress={() =>
          navigation.navigate('VacationDetail', {vacationId: item.id})
        }
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.8}>
        <View style={styles.cardTop}>
          <Text style={styles.cardFlag}>{countryData?.flag || '🌍'}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardCountry}>{item.country}</Text>
          </View>
          {isActive && (
            <View
              style={[styles.activeBadge, {backgroundColor: item.coverColor}]}>
              <Text style={styles.activeBadgeText}>ZI {todayDay}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.cardDates}>
            {formatDate(item.startDate)} → {formatDate(item.endDate)}
          </Text>
          <View style={styles.cardDaysBadge}>
            <Text style={styles.cardDaysText}>{totalDays} zile</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Vacanțele mele</Text>
          <Text style={styles.headerSub}>
            {vacations.length} vacanțe planificate
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ Nouă</Text>
        </TouchableOpacity>
      </View>

      {vacations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✈️</Text>
          <Text style={styles.emptyTitle}>Nicio vacanță planificată</Text>
          <Text style={styles.emptySub}>Apasă "+ Nouă" pentru a începe!</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => setModalVisible(true)}>
            <Text style={styles.emptyBtnText}>Creează prima vacanță</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vacations}
          keyExtractor={item => item.id}
          renderItem={renderVacationCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancel}>Anulează</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Vacanță nouă</Text>
            <TouchableOpacity onPress={handleCreate}>
              <Text style={[styles.modalCancel, {color: Colors.accent}]}>
                Creează
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Numele vacanței *</Text>
            <TextInput
              style={styles.input}
              placeholder="ex: Vara în Italia"
              placeholderTextColor={Colors.textMuted}
              value={form.name}
              onChangeText={v => setForm(f => ({...f, name: v}))}
            />

            <Text style={styles.fieldLabel}>Țara *</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowCountryPicker(!showCountryPicker)}>
              <Text
                style={
                  form.country ? styles.inputText : styles.inputPlaceholder
                }>
                {form.country
                  ? `${
                      COUNTRIES.find(c => c.code === form.countryCode)?.flag
                    } ${form.country}`
                  : 'Selectează țara...'}
              </Text>
            </TouchableOpacity>

            {showCountryPicker && (
              <View style={styles.countryPicker}>
                <TextInput
                  style={styles.countrySearch}
                  placeholder="Caută țara..."
                  placeholderTextColor={Colors.textMuted}
                  value={countrySearch}
                  onChangeText={setCountrySearch}
                />
                <ScrollView style={{maxHeight: 200}}>
                  {filteredCountries.map(c => (
                    <TouchableOpacity
                      key={c.code}
                      style={styles.countryItem}
                      onPress={() => {
                        setForm(f => ({
                          ...f,
                          country: c.name,
                          countryCode: c.code,
                        }));
                        setShowCountryPicker(false);
                        setCountrySearch('');
                      }}>
                      <Text style={styles.countryItemText}>
                        {c.flag} {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <Text style={styles.fieldLabel}>
              Data de început * (YYYY-MM-DD)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="2025-07-01"
              placeholderTextColor={Colors.textMuted}
              value={form.startDate}
              onChangeText={v => setForm(f => ({...f, startDate: v}))}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.fieldLabel}>
              Data de sfârșit * (YYYY-MM-DD)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="2025-07-14"
              placeholderTextColor={Colors.textMuted}
              value={form.endDate}
              onChangeText={v => setForm(f => ({...f, endDate: v}))}
              keyboardType="numbers-and-punctuation"
            />

            {form.startDate &&
              form.endDate &&
              new Date(form.startDate) <= new Date(form.endDate) && (
                <Text style={styles.daysPreview}>
                  ✅ {getTotalDays(form.startDate, form.endDate)} zile de
                  vacanță
                </Text>
              )}

            <Text style={styles.fieldLabel}>Culoare</Text>
            <View style={styles.colorPicker}>
              {VACATION_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorDot,
                    {backgroundColor: color},
                    form.coverColor === color && styles.colorDotSelected,
                  ]}
                  onPress={() => setForm(f => ({...f, coverColor: color}))}
                />
              ))}
            </View>

            <View style={{height: 40}} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  headerTitle: {fontSize: 24, fontWeight: '700', color: Colors.text},
  headerSub: {fontSize: 13, color: Colors.textMuted, marginTop: 2},
  addBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  addBtnText: {color: Colors.white, fontWeight: '600', fontSize: 14},
  list: {padding: Spacing.md, gap: Spacing.sm},
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardFlag: {fontSize: 36, marginRight: Spacing.sm},
  cardInfo: {flex: 1},
  cardName: {fontSize: 18, fontWeight: '700', color: Colors.text},
  cardCountry: {fontSize: 13, color: Colors.textSecondary, marginTop: 2},
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  activeBadgeText: {color: Colors.white, fontSize: 11, fontWeight: '700'},
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDates: {fontSize: 13, color: Colors.textSecondary},
  cardDaysBadge: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  cardDaysText: {color: Colors.textSecondary, fontSize: 12, fontWeight: '600'},
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyIcon: {fontSize: 64, marginBottom: Spacing.md},
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  emptyBtn: {
    backgroundColor: Colors.accent,
    marginTop: Spacing.lg,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.full,
  },
  emptyBtnText: {color: Colors.white, fontWeight: '600', fontSize: 16},
  modal: {flex: 1, backgroundColor: Colors.background},
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  modalTitle: {fontSize: 17, fontWeight: '700', color: Colors.text},
  modalCancel: {fontSize: 16, color: Colors.textSecondary},
  modalBody: {flex: 1, padding: Spacing.md},
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  inputText: {color: Colors.text, fontSize: 16},
  inputPlaceholder: {color: Colors.textMuted, fontSize: 16},
  countryPicker: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginTop: 4,
  },
  countrySearch: {
    padding: Spacing.sm,
    color: Colors.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
    fontSize: 15,
  },
  countryItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  countryItemText: {color: Colors.text, fontSize: 15},
  daysPreview: {
    color: Colors.success,
    fontSize: 14,
    marginTop: Spacing.sm,
    fontWeight: '600',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: 4,
  },
  colorDot: {width: 36, height: 36, borderRadius: 18},
  colorDotSelected: {borderWidth: 3, borderColor: Colors.white},
});
