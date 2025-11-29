/**
 * useTrips - Hook for trip list management
 * PRD Section 5.1 - Trip List Screen
 */

import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { Trip, DayPlan } from '../../../domain/models';
import { createTrip, createDayPlan } from '../../../domain/models';
import { getDateRange } from '../../../domain/services';
import { useServices } from '../../../app/providers';
import type { CactusService } from '../../../infrastructure/cactus';

export interface TripWithStats extends Trip {
  dayCount: number;
  activityCount: number;
}

export interface UseTripsResult {
  trips: TripWithStats[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createNewTrip: (params: {
    name: string;
    startDate: string;
    endDate: string;
    homeAirport?: string;
    destination?: string;
  }) => Promise<Trip>;
  deleteTrip: (tripId: string) => Promise<void>;
}

/**
 * Uses AI to extract a destination from the trip name.
 * Falls back to undefined if the model is not ready or extraction fails.
 */
async function extractDestinationWithAI(
  tripName: string,
  cactusService: CactusService
): Promise<string | undefined> {
  try {
    const state = cactusService.getState();
    if (!state.isDownloaded || state.isGenerating) {
      console.log('🌍 Cactus not ready for destination extraction, skipping');
      return undefined;
    }

    console.log('🌍 Extracting destination from trip name:', tripName);

    const result = await cactusService.complete(
      [
        {
          role: 'system',
          content: `You are a travel assistant that extracts destination names from trip titles. 
Reply with ONLY the destination/location name, nothing else. 
If you cannot identify a destination, reply with exactly "NONE".
Examples:
- "Tokyo Adventure" → Tokyo
- "Trip to Paris" → Paris  
- "New York 2025" → New York
- "Family Vacation Hawaii" → Hawaii
- "Summer Trip" → NONE
- "My Birthday" → NONE`,
        },
        {
          role: 'user',
          content: `Extract the destination from: "${tripName}"`,
        },
      ],
      {
        maxTokens: 50,
        temperature: 0.1, // Low temperature for deterministic output
      }
    );

    const destination = result.response.trim();
    console.log('🌍 AI extracted destination:', destination);

    // Check if the AI couldn't identify a destination
    if (!destination || destination.toUpperCase() === 'NONE' || destination.length < 2) {
      return undefined;
    }

    return destination;
  } catch (error) {
    console.error('🌍 Failed to extract destination with AI:', error);
    return undefined;
  }
}

export function useTrips(): UseTripsResult {
  const { tripRepository, memoryStore, cactusService } = useServices();
  const [trips, setTrips] = useState<TripWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrips = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      setError(null);
      const loaded = await tripRepository.getTrips();
      
      // Load stats for each trip
      const tripsWithStats: TripWithStats[] = await Promise.all(
        loaded.map(async (trip) => {
          const dayPlans = await tripRepository.getDayPlans(trip.id);
          const items = await tripRepository.getAllTripItems(trip.id);
          return {
            ...trip,
            dayCount: dayPlans.length,
            activityCount: items.length,
          };
        })
      );
      
      setTrips(tripsWithStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trips');
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [tripRepository]);

  // Reload trips when screen is focused
  useFocusEffect(
    useCallback(() => {
      // Pass true for silent refresh to avoid flickering
      loadTrips(true);
    }, [loadTrips])
  );

  // Initial load
  useEffect(() => {
    loadTrips(false);
  }, []);

  const createNewTrip = useCallback(
    async (params: {
      name: string;
      startDate: string;
      endDate: string;
      homeAirport?: string;
    }): Promise<Trip> => {
      const trip = createTrip(params);
      await tripRepository.saveTrip(trip);

      // Create day plans for each day of the trip
      const dates = getDateRange(params.startDate, params.endDate);
      const dayPlans: DayPlan[] = dates.map((date, index) =>
        createDayPlan({
          tripId: trip.id,
          date,
          dayNumber: index + 1,
        })
      );
      await tripRepository.saveDayPlans(dayPlans);

      // Refresh the list
      await loadTrips();

      return trip;
    },
    [tripRepository, loadTrips]
  );

  const deleteTrip = useCallback(
    async (tripId: string): Promise<void> => {
      await tripRepository.deleteTrip(tripId);
      await memoryStore.removeTrip(tripId);
      await loadTrips();
    },
    [tripRepository, memoryStore, loadTrips]
  );

  return {
    trips,
    isLoading,
    error,
    refresh: loadTrips,
    createNewTrip,
    deleteTrip,
  };
}

