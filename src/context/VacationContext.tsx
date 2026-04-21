import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {Vacation, DayPlan, Location} from '../types';
import {StorageUtils} from '../utils/storage';
import {generateDays} from '../utils/dateUtils';
import {optimizeRoute} from '../utils/maps';

interface VacationContextType {
  vacations: Vacation[];
  loading: boolean;
  addVacation: (
    vacation: Omit<Vacation, 'id' | 'days' | 'createdAt'>,
  ) => Promise<Vacation>;
  updateVacation: (vacation: Vacation) => Promise<void>;
  deleteVacation: (id: string) => Promise<void>;
  getVacation: (id: string) => Vacation | undefined;
  addLocation: (
    vacationId: string,
    dayId: string,
    location: Omit<Location, 'id' | 'order'>,
  ) => Promise<void>;
  updateLocation: (
    vacationId: string,
    dayId: string,
    location: Location,
  ) => Promise<void>;
  deleteLocation: (
    vacationId: string,
    dayId: string,
    locationId: string,
  ) => Promise<void>;
  reorderLocations: (
    vacationId: string,
    dayId: string,
    newOrder: Location[],
  ) => Promise<void>;
  autoOptimizeDay: (vacationId: string, dayId: string) => Promise<void>;
  setTravelMode: (
    vacationId: string,
    dayId: string,
    mode: DayPlan['travelMode'],
  ) => Promise<void>;
  refreshVacations: () => Promise<void>;
}

const VacationContext = createContext<VacationContextType | null>(null);

export function VacationProvider({children}: {children: React.ReactNode}) {
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshVacations = useCallback(async () => {
    const all = await StorageUtils.getAllVacations();
    setVacations(all);
  }, []);

  useEffect(() => {
    refreshVacations().finally(() => setLoading(false));
  }, [refreshVacations]);

  const addVacation = async (
    data: Omit<Vacation, 'id' | 'days' | 'createdAt'>,
  ): Promise<Vacation> => {
    const vacation: Vacation = {
      ...data,
      id: `vacation_${Date.now()}`,
      days: generateDays(data.startDate, data.endDate),
      createdAt: new Date().toISOString(),
    };
    await StorageUtils.saveVacation(vacation);
    await refreshVacations();
    return vacation;
  };

  const updateVacation = async (vacation: Vacation) => {
    await StorageUtils.saveVacation(vacation);
    await refreshVacations();
  };

  const deleteVacation = async (id: string) => {
    await StorageUtils.deleteVacation(id);
    await refreshVacations();
  };

  const getVacation = (id: string) => vacations.find(v => v.id === id);

  const updateDayInVacation = async (
    vacationId: string,
    dayId: string,
    updater: (day: DayPlan) => DayPlan,
  ) => {
    const vacation = vacations.find(v => v.id === vacationId);
    if (!vacation) return;
    const updated: Vacation = {
      ...vacation,
      days: vacation.days.map(d => (d.id === dayId ? updater(d) : d)),
    };
    await StorageUtils.saveVacation(updated);
    await refreshVacations();
  };

  const addLocation = async (
    vacationId: string,
    dayId: string,
    locData: Omit<Location, 'id' | 'order'>,
  ) => {
    await updateDayInVacation(vacationId, dayId, day => {
      const location: Location = {
        ...locData,
        id: `loc_${Date.now()}`,
        order: day.locations.length,
      };
      return {...day, locations: [...day.locations, location]};
    });
  };

  const updateLocation = async (
    vacationId: string,
    dayId: string,
    location: Location,
  ) => {
    await updateDayInVacation(vacationId, dayId, day => ({
      ...day,
      locations: day.locations.map(l => (l.id === location.id ? location : l)),
    }));
  };

  const deleteLocation = async (
    vacationId: string,
    dayId: string,
    locationId: string,
  ) => {
    await updateDayInVacation(vacationId, dayId, day => ({
      ...day,
      locations: day.locations
        .filter(l => l.id !== locationId)
        .map((l, i) => ({...l, order: i})),
    }));
  };

  const reorderLocations = async (
    vacationId: string,
    dayId: string,
    newOrder: Location[],
  ) => {
    await updateDayInVacation(vacationId, dayId, day => ({
      ...day,
      locations: newOrder.map((l, i) => ({...l, order: i})),
    }));
  };

  const autoOptimizeDay = async (vacationId: string, dayId: string) => {
    await updateDayInVacation(vacationId, dayId, day => {
      if (day.locations.length < 2) return day;
      const orderedIds = optimizeRoute(day.locations);
      const locationMap = new Map(day.locations.map(l => [l.id, l]));
      const reordered = orderedIds
        .map((id, i) => {
          const loc = locationMap.get(id);
          return loc ? {...loc, order: i} : null;
        })
        .filter((l): l is Location => l !== null); // ← fix: guard împotriva undefined
      return {...day, locations: reordered};
    });
  };

  const setTravelMode = async (
    vacationId: string,
    dayId: string,
    mode: DayPlan['travelMode'],
  ) => {
    await updateDayInVacation(vacationId, dayId, day => ({
      ...day,
      travelMode: mode,
    }));
  };

  return (
    <VacationContext.Provider
      value={{
        vacations,
        loading,
        addVacation,
        updateVacation,
        deleteVacation,
        getVacation,
        addLocation,
        updateLocation,
        deleteLocation,
        reorderLocations,
        autoOptimizeDay,
        setTravelMode,
        refreshVacations,
      }}>
      {children}
    </VacationContext.Provider>
  );
}

export function useVacations() {
  const ctx = useContext(VacationContext);
  if (!ctx)
    throw new Error('useVacations must be used within VacationProvider');
  return ctx;
}
