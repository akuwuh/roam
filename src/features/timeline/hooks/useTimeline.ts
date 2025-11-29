/**
 * useTimeline - Hook for trip timeline management
 * PRD Section 5.2 - Timeline View
 */

import { useState, useCallback, useEffect } from 'react';
import type { Trip, DayPlan, TripItem } from '../../../domain/models';
import { createTripItem, createDayPlan } from '../../../domain/models';
import { useServices } from '../../../app/providers';

export interface TimelineDay {
  dayPlan: DayPlan;
  items: TripItem[];
}

export interface UseTimelineResult {
  trip: Trip | null;
  days: TimelineDay[];
  allItems: TripItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addDay: () => Promise<DayPlan>;
  addItem: (params: {
    dayPlanId: string;
    type: TripItem['type'];
    title: string;
    startDateTime: string;
    endDateTime: string;
    placeId?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<TripItem>;
  updateItem: (item: TripItem) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
}

export function useTimeline(tripId: string): UseTimelineResult {
  const { tripRepository, placeRepository, memoryStore } = useServices();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<TimelineDay[]>([]);
  const [allItems, setAllItems] = useState<TripItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTimeline = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load trip
      const loadedTrip = await tripRepository.getTrip(tripId);
      if (!loadedTrip) {
        setError('Trip not found');
        return;
      }
      setTrip(loadedTrip);

      // Load day plans
      const dayPlans = await tripRepository.getDayPlans(tripId);

      // Load items for each day
      const timelineDays: TimelineDay[] = await Promise.all(
        dayPlans.map(async (dayPlan) => {
          const items = await tripRepository.getTripItems(dayPlan.id);
          return { dayPlan, items };
        })
      );

      setDays(timelineDays);

      // Flatten all items for convenience
      const items = timelineDays.flatMap((d) => d.items);
      setAllItems(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timeline');
    } finally {
      setIsLoading(false);
    }
  }, [tripId, tripRepository]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const addItem = useCallback(
    async (params: {
      dayPlanId: string;
      type: TripItem['type'];
      title: string;
      startDateTime: string;
      endDateTime: string;
      placeId?: string;
      metadata?: Record<string, unknown>;
    }): Promise<TripItem> => {
      const item = createTripItem({
        tripId,
        ...params,
      });

      await tripRepository.upsertTripItem(item);

      // Index in memory store for RAG
      try {
        const place = params.placeId
          ? await placeRepository.getPlace(params.placeId)
          : undefined;
        await memoryStore.indexItem(item, place ?? undefined);
      } catch (err) {
        console.warn('Failed to index item in memory store:', err);
      }

      await loadTimeline();
      return item;
    },
    [tripId, tripRepository, placeRepository, memoryStore, loadTimeline]
  );

  const updateItem = useCallback(
    async (item: TripItem): Promise<void> => {
      await tripRepository.upsertTripItem(item);

      // Re-index in memory store
      try {
        const place = item.placeId
          ? await placeRepository.getPlace(item.placeId)
          : undefined;
        await memoryStore.reindexItem(item, place ?? undefined);
      } catch (err) {
        console.warn('Failed to re-index item in memory store:', err);
      }

      await loadTimeline();
    },
    [tripRepository, placeRepository, memoryStore, loadTimeline]
  );

  const deleteItem = useCallback(
    async (itemId: string): Promise<void> => {
      await tripRepository.deleteTripItem(itemId);

      // Remove from memory store
      try {
        await memoryStore.removeBySource(itemId);
      } catch (err) {
        console.warn('Failed to remove item from memory store:', err);
      }

      await loadTimeline();
    },
    [tripRepository, memoryStore, loadTimeline]
  );

  const addDay = useCallback(async (): Promise<DayPlan> => {
    if (!trip) {
      throw new Error('Trip not loaded');
    }

    // Calculate new day number and date
    const currentDayCount = days.length;
    const newDayNumber = currentDayCount + 1;
    
    // Get the date for the new day
    const lastDay = days[days.length - 1];
    let newDate: string;
    
    if (lastDay) {
      // Add one day to the last day's date
      const lastDate = new Date(lastDay.dayPlan.date);
      lastDate.setDate(lastDate.getDate() + 1);
      newDate = lastDate.toISOString().split('T')[0];
    } else {
      // Use start date if no days exist
      newDate = trip.startDate;
    }

    // Create the new day plan
    const newDayPlan = createDayPlan({
      tripId: trip.id,
      date: newDate,
      dayNumber: newDayNumber,
    });

    await tripRepository.saveDayPlan(newDayPlan);

    // Update trip end date if needed
    if (newDate > trip.endDate) {
      const updatedTrip: Trip = {
        ...trip,
        endDate: newDate,
        updatedAt: Date.now(),
      };
      await tripRepository.saveTrip(updatedTrip);
    }

    await loadTimeline();
    return newDayPlan;
  }, [trip, days, tripRepository, loadTimeline]);

  return {
    trip,
    days,
    allItems,
    isLoading,
    error,
    refresh: loadTimeline,
    addDay,
    addItem,
    updateItem,
    deleteItem,
  };
}

