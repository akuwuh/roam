import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Activity {
  time: string;
  name: string;
  description?: string;
}

export interface Day {
  day: number;
  activities: Activity[];
}

export interface Itinerary {
  id: string;
  destination: string;
  days: Day[];
  date: string;
  createdAt: number;
}

const STORAGE_KEY = '@travel_itineraries';

export async function saveItinerary(data: Omit<Itinerary, 'id' | 'createdAt'>): Promise<Itinerary> {
  try {
    const itinerary: Itinerary = {
      ...data,
      id: Date.now().toString(),
      createdAt: Date.now(),
    };

    const existing = await loadItineraries();
    const updated = [itinerary, ...existing];
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return itinerary;
  } catch (error) {
    console.error('Failed to save itinerary:', error);
    throw error;
  }
}

export async function loadItineraries(): Promise<Itinerary[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load itineraries:', error);
    return [];
  }
}

export async function loadItinerary(id: string): Promise<Itinerary | null> {
  try {
    const itineraries = await loadItineraries();
    return itineraries.find(i => i.id === id) || null;
  } catch (error) {
    console.error('Failed to load itinerary:', error);
    return null;
  }
}

export async function deleteItinerary(id: string): Promise<void> {
  try {
    const itineraries = await loadItineraries();
    const updated = itineraries.filter(i => i.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to delete itinerary:', error);
    throw error;
  }
}

