import AsyncStorage from '@react-native-async-storage/async-storage';
import {Vacation} from '../types';

const VACATIONS_KEY = '@vacation_planner_vacations';

export const StorageUtils = {
  async getAllVacations(): Promise<Vacation[]> {
    try {
      const json = await AsyncStorage.getItem(VACATIONS_KEY);
      return json ? JSON.parse(json) : [];
    } catch {
      return [];
    }
  },

  async saveVacation(vacation: Vacation): Promise<void> {
    try {
      const all = await StorageUtils.getAllVacations();
      const idx = all.findIndex(v => v.id === vacation.id);
      if (idx >= 0) {
        all[idx] = vacation;
      } else {
        all.push(vacation);
      }
      await AsyncStorage.setItem(VACATIONS_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('Error saving vacation:', e);
    }
  },

  async deleteVacation(id: string): Promise<void> {
    try {
      const all = await StorageUtils.getAllVacations();
      const filtered = all.filter(v => v.id !== id);
      await AsyncStorage.setItem(VACATIONS_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Error deleting vacation:', e);
    }
  },

  async getVacation(id: string): Promise<Vacation | null> {
    const all = await StorageUtils.getAllVacations();
    return all.find(v => v.id === id) ?? null;
  },
};
