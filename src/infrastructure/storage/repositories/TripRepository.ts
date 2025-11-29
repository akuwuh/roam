/**
 * Trip Repository - CRUD operations for Trip, DayPlan, TripItem
 * PRD Phase 1 - Infrastructure Layer
 */

import type { Trip, DayPlan, TripItem } from '../../../domain/models';
import type { StorageService } from '../StorageService';

const KEYS = {
  TRIPS: '@roam_trips',
  DAY_PLANS: '@roam_day_plans',
  TRIP_ITEMS: '@roam_trip_items',
};

export class TripRepository {
  constructor(private storage: StorageService) {}

  // === Trip operations ===
  async getTrips(): Promise<Trip[]> {
    const trips = await this.storage.get<Trip[]>(KEYS.TRIPS);
    return trips ?? [];
  }

  async getTrip(id: string): Promise<Trip | null> {
    const trips = await this.getTrips();
    return trips.find((t) => t.id === id) ?? null;
  }

  async saveTrip(trip: Trip): Promise<Trip> {
    const trips = await this.getTrips();
    const index = trips.findIndex((t) => t.id === trip.id);

    if (index >= 0) {
      trips[index] = { ...trip, updatedAt: Date.now() };
    } else {
      trips.unshift(trip);
    }

    await this.storage.set(KEYS.TRIPS, trips);
    return trip;
  }

  async deleteTrip(id: string): Promise<void> {
    const trips = await this.getTrips();
    const filtered = trips.filter((t) => t.id !== id);
    await this.storage.set(KEYS.TRIPS, filtered);

    // Also delete related day plans and items
    await this.deleteDayPlansForTrip(id);
    await this.deleteItemsForTrip(id);
  }

  // === DayPlan operations ===
  async getDayPlans(tripId: string): Promise<DayPlan[]> {
    const allPlans = await this.storage.get<DayPlan[]>(KEYS.DAY_PLANS);
    const plans = (allPlans ?? []).filter((p) => p.tripId === tripId);
    return plans.sort((a, b) => a.dayNumber - b.dayNumber);
  }

  async getDayPlan(id: string): Promise<DayPlan | null> {
    const allPlans = await this.storage.get<DayPlan[]>(KEYS.DAY_PLANS);
    return (allPlans ?? []).find((p) => p.id === id) ?? null;
  }

  async saveDayPlan(dayPlan: DayPlan): Promise<DayPlan> {
    const allPlans = await this.storage.get<DayPlan[]>(KEYS.DAY_PLANS) ?? [];
    const index = allPlans.findIndex((p) => p.id === dayPlan.id);

    if (index >= 0) {
      allPlans[index] = dayPlan;
    } else {
      allPlans.push(dayPlan);
    }

    await this.storage.set(KEYS.DAY_PLANS, allPlans);
    return dayPlan;
  }

  async saveDayPlans(dayPlans: DayPlan[]): Promise<void> {
    const allPlans = await this.storage.get<DayPlan[]>(KEYS.DAY_PLANS) ?? [];
    
    for (const dayPlan of dayPlans) {
      const index = allPlans.findIndex((p) => p.id === dayPlan.id);
      if (index >= 0) {
        allPlans[index] = dayPlan;
      } else {
        allPlans.push(dayPlan);
      }
    }

    await this.storage.set(KEYS.DAY_PLANS, allPlans);
  }

  private async deleteDayPlansForTrip(tripId: string): Promise<void> {
    const allPlans = await this.storage.get<DayPlan[]>(KEYS.DAY_PLANS) ?? [];
    const filtered = allPlans.filter((p) => p.tripId !== tripId);
    await this.storage.set(KEYS.DAY_PLANS, filtered);
  }

  // === TripItem operations ===
  async getTripItems(dayPlanId: string): Promise<TripItem[]> {
    const allItems = await this.storage.get<TripItem[]>(KEYS.TRIP_ITEMS);
    const items = (allItems ?? []).filter((i) => i.dayPlanId === dayPlanId);
    return items.sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
    );
  }

  async getAllTripItems(tripId: string): Promise<TripItem[]> {
    const allItems = await this.storage.get<TripItem[]>(KEYS.TRIP_ITEMS);
    const items = (allItems ?? []).filter((i) => i.tripId === tripId);
    return items.sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
    );
  }

  async getTripItem(id: string): Promise<TripItem | null> {
    const allItems = await this.storage.get<TripItem[]>(KEYS.TRIP_ITEMS);
    return (allItems ?? []).find((i) => i.id === id) ?? null;
  }

  async upsertTripItem(item: TripItem): Promise<TripItem> {
    const allItems = await this.storage.get<TripItem[]>(KEYS.TRIP_ITEMS) ?? [];
    const index = allItems.findIndex((i) => i.id === item.id);

    if (index >= 0) {
      allItems[index] = item;
    } else {
      allItems.push(item);
    }

    await this.storage.set(KEYS.TRIP_ITEMS, allItems);
    return item;
  }

  async upsertTripItems(items: TripItem[]): Promise<void> {
    const allItems = await this.storage.get<TripItem[]>(KEYS.TRIP_ITEMS) ?? [];

    for (const item of items) {
      const index = allItems.findIndex((i) => i.id === item.id);
      if (index >= 0) {
        allItems[index] = item;
      } else {
        allItems.push(item);
      }
    }

    await this.storage.set(KEYS.TRIP_ITEMS, allItems);
  }

  async deleteTripItem(id: string): Promise<void> {
    const allItems = await this.storage.get<TripItem[]>(KEYS.TRIP_ITEMS) ?? [];
    const filtered = allItems.filter((i) => i.id !== id);
    await this.storage.set(KEYS.TRIP_ITEMS, filtered);
  }

  private async deleteItemsForTrip(tripId: string): Promise<void> {
    const allItems = await this.storage.get<TripItem[]>(KEYS.TRIP_ITEMS) ?? [];
    const filtered = allItems.filter((i) => i.tripId !== tripId);
    await this.storage.set(KEYS.TRIP_ITEMS, filtered);
  }
}

