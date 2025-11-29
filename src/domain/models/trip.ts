/**
 * Core trip domain models
 * PRD Phase 1, Section 4.1
 */

export interface Trip {
  id: string;
  name: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  homeAirport?: string;
  createdAt: number;
  updatedAt: number;
}

export interface DayPlan {
  id: string;
  tripId: string;
  date: string; // ISO date
  dayNumber: number;
}

export type TripItemType = 'flight' | 'lodging' | 'activity' | 'transport';

export interface TripItem {
  id: string;
  tripId: string;
  dayPlanId: string;
  type: TripItemType;
  title: string;
  startDateTime: string; // ISO datetime
  endDateTime: string; // ISO datetime
  placeId?: string;
  metadata?: Record<string, unknown>;
}

export interface Place {
  id: string;
  name: string;
  city: string;
  areaTags: string[];
  nearPlaceIds: string[]; // For "near" suggestions
}

// Factory functions for creating entities
export function createTrip(params: {
  name: string;
  startDate: string;
  endDate: string;
  homeAirport?: string;
}): Trip {
  const now = Date.now();
  return {
    id: `trip_${now}`,
    name: params.name,
    startDate: params.startDate,
    endDate: params.endDate,
    homeAirport: params.homeAirport,
    createdAt: now,
    updatedAt: now,
  };
}

export function createDayPlan(params: {
  tripId: string;
  date: string;
  dayNumber: number;
}): DayPlan {
  return {
    id: `day_${Date.now()}_${params.dayNumber}`,
    tripId: params.tripId,
    date: params.date,
    dayNumber: params.dayNumber,
  };
}

export function createTripItem(params: {
  tripId: string;
  dayPlanId: string;
  type: TripItemType;
  title: string;
  startDateTime: string;
  endDateTime: string;
  placeId?: string;
  metadata?: Record<string, unknown>;
}): TripItem {
  return {
    id: `item_${Date.now()}`,
    ...params,
  };
}

export function createPlace(params: {
  name: string;
  city: string;
  areaTags?: string[];
  nearPlaceIds?: string[];
}): Place {
  return {
    id: `place_${Date.now()}`,
    name: params.name,
    city: params.city,
    areaTags: params.areaTags ?? [],
    nearPlaceIds: params.nearPlaceIds ?? [],
  };
}

