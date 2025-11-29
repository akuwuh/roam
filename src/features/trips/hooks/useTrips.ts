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

export interface UseTripsResult {
  trips: Trip[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createNewTrip: (params: {
    name: string;
    startDate: string;
    endDate: string;
    homeAirport?: string;
  }) => Promise<Trip>;
  deleteTrip: (tripId: string) => Promise<void>;
}

export function useTrips(): UseTripsResult {
  const { tripRepository, memoryStore } = useServices();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrips = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loaded = await tripRepository.getTrips();
      setTrips(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trips');
    } finally {
      setIsLoading(false);
    }
  }, [tripRepository]);

  // Reload trips when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadTrips();
    }, [loadTrips])
  );

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

