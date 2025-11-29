/**
 * Canonicalization functions for converting TripItems to searchable text
 * PRD Phase 1, Section 4.1 - Memory chunks
 */

import type { TripItem, DayPlan, Place } from '../../domain/models';

/**
 * Convert a TripItem to a canonical sentence for embedding
 * Examples from PRD:
 * - "Flight from Toronto (YYZ) to Tokyo (HND) on 2025-12-01 departing 10:35 and arriving 15:20"
 * - "Visit Senso-ji Temple on 2025-12-02 from 10:00 to 12:00 in Asakusa area"
 */
export function canonicalizeTripItem(
  item: TripItem,
  place?: Place
): string {
  const startDate = new Date(item.startDateTime);
  const endDate = new Date(item.endDateTime);
  
  const dateStr = startDate.toISOString().split('T')[0];
  const startTime = formatTime(startDate);
  const endTime = formatTime(endDate);

  switch (item.type) {
    case 'flight':
      return canonicalizeFlight(item, dateStr, startTime, endTime);
    case 'lodging':
      return canonicalizeLodging(item, dateStr, place);
    case 'activity':
      return canonicalizeActivity(item, dateStr, startTime, endTime, place);
    case 'transport':
      return canonicalizeTransport(item, dateStr, startTime, endTime);
    default:
      return `${item.title} on ${dateStr} from ${startTime} to ${endTime}`;
  }
}

function canonicalizeFlight(
  item: TripItem,
  date: string,
  startTime: string,
  endTime: string
): string {
  const meta = item.metadata as {
    fromCity?: string;
    fromCode?: string;
    toCity?: string;
    toCode?: string;
  } | undefined;

  if (meta?.fromCode && meta?.toCode) {
    const from = meta.fromCity
      ? `${meta.fromCity} (${meta.fromCode})`
      : meta.fromCode;
    const to = meta.toCity ? `${meta.toCity} (${meta.toCode})` : meta.toCode;
    return `Flight from ${from} to ${to} on ${date} departing ${startTime} and arriving ${endTime}`;
  }

  return `${item.title} on ${date} departing ${startTime} and arriving ${endTime}`;
}

function canonicalizeLodging(
  item: TripItem,
  date: string,
  place?: Place
): string {
  const location = place ? ` in ${place.city}` : '';
  const area =
    place && place.areaTags.length > 0
      ? ` (${place.areaTags[0]} area)`
      : '';

  return `Stay at ${item.title}${location}${area} on ${date}`;
}

function canonicalizeActivity(
  item: TripItem,
  date: string,
  startTime: string,
  endTime: string,
  place?: Place
): string {
  const area =
    place && place.areaTags.length > 0
      ? ` in ${place.areaTags[0]} area`
      : '';

  return `${item.title} on ${date} from ${startTime} to ${endTime}${area}`;
}

function canonicalizeTransport(
  item: TripItem,
  date: string,
  startTime: string,
  endTime: string
): string {
  return `${item.title} on ${date} from ${startTime} to ${endTime}`;
}

/**
 * Canonicalize a day summary
 */
export function canonicalizeDaySummary(
  dayPlan: DayPlan,
  items: TripItem[]
): string {
  const activities = items
    .filter((i) => i.type === 'activity')
    .map((i) => i.title)
    .join(', ');

  if (activities) {
    return `Day ${dayPlan.dayNumber} (${dayPlan.date}): ${activities}`;
  }

  return `Day ${dayPlan.dayNumber} on ${dayPlan.date}`;
}

/**
 * Format time as HH:mm
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

