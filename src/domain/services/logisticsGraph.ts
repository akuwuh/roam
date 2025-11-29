/**
 * Logistics Graph Service - Temporal and spatial reasoning
 * PRD Phase 2, Section 4.1 - Logistics graph for Trip Brain
 * 
 * All functions are pure (no side effects, testable in isolation)
 */

import type {
  TripItem,
  Place,
  LogisticsGraph,
  LogisticsEdge,
} from '../models';
import { createLogisticsEdge, createEmptyGraph } from '../models';

/**
 * Build a logistics graph from trip items and places
 * Derives temporal (BEFORE/AFTER) and spatial (NEAR/SAME_AREA) relationships
 */
export function buildLogisticsGraph(
  items: TripItem[],
  places: Place[]
): LogisticsGraph {
  const graph = createEmptyGraph();
  const placeMap = new Map(places.map((p) => [p.id, p]));

  // Add all items as nodes
  items.forEach((item) => graph.nodeIds.add(item.id));

  // Sort items by start time
  const sortedItems = [...items].sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
  );

  // Build temporal relationships
  for (let i = 0; i < sortedItems.length - 1; i++) {
    const current = sortedItems[i];
    const next = sortedItems[i + 1];

    // BEFORE/AFTER edges
    graph.edges.push(createLogisticsEdge(current.id, next.id, 'BEFORE'));
    graph.edges.push(createLogisticsEdge(next.id, current.id, 'AFTER'));

    // WITHIN_DAY edges for items on the same day
    if (isSameDay(current.startDateTime, next.startDateTime)) {
      graph.edges.push(createLogisticsEdge(current.id, next.id, 'WITHIN_DAY'));
      graph.edges.push(createLogisticsEdge(next.id, current.id, 'WITHIN_DAY'));
    }
  }

  // Build spatial relationships
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const itemA = items[i];
      const itemB = items[j];

      if (!itemA.placeId || !itemB.placeId) continue;

      const placeA = placeMap.get(itemA.placeId);
      const placeB = placeMap.get(itemB.placeId);

      if (!placeA || !placeB) continue;

      // NEAR edges
      if (placeA.nearPlaceIds.includes(placeB.id)) {
        graph.edges.push(createLogisticsEdge(itemA.id, itemB.id, 'NEAR'));
        graph.edges.push(createLogisticsEdge(itemB.id, itemA.id, 'NEAR'));
      }

      // SAME_AREA edges
      const sharedAreas = placeA.areaTags.filter((tag) =>
        placeB.areaTags.includes(tag)
      );
      if (sharedAreas.length > 0) {
        graph.edges.push(createLogisticsEdge(itemA.id, itemB.id, 'SAME_AREA'));
        graph.edges.push(createLogisticsEdge(itemB.id, itemA.id, 'SAME_AREA'));
      }
    }
  }

  return graph;
}

/**
 * Get items that occur after a specific timestamp
 * PRD Section 7.1 - "What can I do after [Event]?"
 */
export function getItemsAfter(
  items: TripItem[],
  dayPlanId: string,
  afterTime: string
): TripItem[] {
  const afterDate = new Date(afterTime);

  return items
    .filter((item) => {
      if (item.dayPlanId !== dayPlanId) return false;
      return new Date(item.startDateTime) > afterDate;
    })
    .sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() -
        new Date(b.startDateTime).getTime()
    );
}

/**
 * Get items that occur before a specific timestamp
 */
export function getItemsBefore(
  items: TripItem[],
  dayPlanId: string,
  beforeTime: string
): TripItem[] {
  const beforeDate = new Date(beforeTime);

  return items
    .filter((item) => {
      if (item.dayPlanId !== dayPlanId) return false;
      return new Date(item.endDateTime) < beforeDate;
    })
    .sort(
      (a, b) =>
        new Date(b.startDateTime).getTime() -
        new Date(a.startDateTime).getTime()
    );
}

/**
 * Find the earliest available time slot that can fit a given duration
 * PRD Section 7.3 - Moving activities
 */
export function findEarliestAvailableSlot(
  items: TripItem[],
  dayPlanId: string,
  durationMinutes: number,
  preferMorning: boolean = true
): { start: string; end: string } | null {
  const dayItems = items
    .filter((item) => item.dayPlanId === dayPlanId)
    .sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() -
        new Date(b.startDateTime).getTime()
    );

  if (dayItems.length === 0) {
    return null;
  }

  // Get the day from first item
  const dayDate = new Date(dayItems[0].startDateTime).toISOString().split('T')[0];

  // Define day boundaries
  const dayStart = new Date(`${dayDate}T08:00:00`);
  const dayEnd = new Date(`${dayDate}T22:00:00`);

  const freeBlocks = computeFreeBlocks(dayItems, dayStart, dayEnd);

  // Find first block that fits the duration
  for (const block of freeBlocks) {
    const blockDuration =
      (block.end.getTime() - block.start.getTime()) / (1000 * 60);

    if (blockDuration >= durationMinutes) {
      const slotEnd = new Date(
        block.start.getTime() + durationMinutes * 60 * 1000
      );
      return {
        start: block.start.toISOString(),
        end: slotEnd.toISOString(),
      };
    }
  }

  return null;
}

/**
 * Compute free time blocks between occupied intervals
 * PRD Section 7.4 - "Do I have free time between X and Y?"
 */
export function computeFreeBlocks(
  items: TripItem[],
  dayStart?: Date,
  dayEnd?: Date
): Array<{ start: Date; end: Date }> {
  if (items.length === 0) {
    if (dayStart && dayEnd) {
      return [{ start: dayStart, end: dayEnd }];
    }
    return [];
  }

  const sortedItems = [...items].sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
  );

  const freeBlocks: Array<{ start: Date; end: Date }> = [];

  // Use provided boundaries or infer from items
  const effectiveStart =
    dayStart ?? new Date(sortedItems[0].startDateTime);
  const effectiveEnd =
    dayEnd ??
    new Date(sortedItems[sortedItems.length - 1].endDateTime);

  let currentTime = effectiveStart;

  for (const item of sortedItems) {
    const itemStart = new Date(item.startDateTime);
    const itemEnd = new Date(item.endDateTime);

    // If there's a gap before this item, add it as free time
    if (itemStart > currentTime) {
      freeBlocks.push({
        start: new Date(currentTime),
        end: new Date(itemStart),
      });
    }

    // Move current time past this item
    if (itemEnd > currentTime) {
      currentTime = itemEnd;
    }
  }

  // Add any remaining time at the end of the day
  if (currentTime < effectiveEnd) {
    freeBlocks.push({
      start: new Date(currentTime),
      end: new Date(effectiveEnd),
    });
  }

  return freeBlocks;
}

/**
 * Get related items from the logistics graph
 */
export function getRelatedItems(
  graph: LogisticsGraph,
  itemId: string,
  relation: LogisticsEdge['relation']
): string[] {
  return graph.edges
    .filter((edge) => edge.fromId === itemId && edge.relation === relation)
    .map((edge) => edge.toId);
}

// Helper functions
function isSameDay(dateA: string, dateB: string): boolean {
  return (
    new Date(dateA).toISOString().split('T')[0] ===
    new Date(dateB).toISOString().split('T')[0]
  );
}

