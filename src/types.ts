export interface Location {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  googleMapsUrl: string;
  stayDuration: number;
  photoUrl?: string;
  photos?: string[];
  placeId?: string;
  order: number;
  isAccommodation?: boolean;
}

export interface DayPlan {
  id: string;
  date: string;
  dayNumber: number;
  locations: Location[];
  travelMode: 'walking' | 'driving' | 'transit';
  totalDistance?: number;
  totalDuration?: number;
  notes?: string;
}

export interface Vacation {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  startDate: string;
  endDate: string;
  days: DayPlan[];
  coverColor: string;
  createdAt: string;
  accommodationLat?: number; // coordonate cazare
  accommodationLng?: number;
  accommodationName?: string;
}

export type TravelMode = 'walking' | 'driving' | 'transit';

export type RootStackParamList = {
  Home: undefined;
  VacationDetail: { vacationId: string };
  DayDetail: { vacationId: string; dayId: string };
  AddVacation: undefined;
};