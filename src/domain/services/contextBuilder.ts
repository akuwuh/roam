/**
 * Context Builder - Constructs prompts for AI interactions
 * PRD Phase 2, Section 4.3 - RAG prompt construction
 * 
 * NOTE: System prompts should be carefully designed per the plan's
 * "System Prompt Design Requirements" section. Each prompt must:
 * - Include explicit output format instructions
 * - Set boundaries for context-only answers
 * - Handle edge cases gracefully
 */

import type { MemoryChunk, TripItem } from '../models';
import type { MemorySearchResult } from '../../infrastructure/memory';
import { formatTime, formatDate } from './timeUtils';

/**
 * Build context from memory search results and graph data
 */
export function buildContextChunks(
  memoryResults: MemorySearchResult[],
  additionalContext?: string[]
): string {
  const memoryContext = memoryResults
    .map((result) => `- ${result.chunk.text}`)
    .join('\n');

  const additionalStr = additionalContext?.length
    ? '\n\nAdditional context:\n' + additionalContext.join('\n')
    : '';

  return memoryContext + additionalStr;
}

/**
 * Build system prompt for Q&A interactions
 * PRD Section 7.1-7.2 - Trip Brain Q&A
 * 
 * IMPORTANT: Instructs model to answer ONLY from provided context
 */
export function buildQASystemPrompt(
  question: string,
  context: string,
  tripName?: string
): string {
  const tripContext = tripName ? ` for the trip "${tripName}"` : '';

  return `You are a helpful travel assistant${tripContext}. Answer the user's question using ONLY the information provided below.

CONTEXT:
${context}

RULES:
1. Answer based ONLY on the context provided above
2. If the answer is not in the context, say: "I don't have that information in your itinerary. Would you like to add it?"
3. Be concise and helpful
4. For time-related questions, be specific with dates and times
5. Do not make up or assume information not in the context

USER QUESTION: ${question}`;
}

/**
 * Build system prompt for schedule modifications
 * PRD Section 7.3 - "Move [Activity] to the morning"
 */
export function buildReplanSystemPrompt(
  command: string,
  dayEvents: TripItem[],
  availableSlots: Array<{ start: string; end: string }>
): string {
  const eventsContext = dayEvents
    .map(
      (item) =>
        `- ${item.title}: ${formatTime(item.startDateTime)} to ${formatTime(item.endDateTime)}`
    )
    .join('\n');

  const slotsContext = availableSlots
    .map((slot) => `- ${formatTime(slot.start)} to ${formatTime(slot.end)}`)
    .join('\n');

  return `You are helping to adjust a travel schedule.

CURRENT SCHEDULE:
${eventsContext}

AVAILABLE TIME SLOTS:
${slotsContext}

USER REQUEST: ${command}

Respond with a brief confirmation of what was changed. Be specific about the new times.
If the request cannot be accommodated, explain why and suggest alternatives.`;
}

/**
 * Build system prompt for free time queries
 * PRD Section 7.4 - "Do I have free time between X and Y?"
 */
export function buildFreeTimeSystemPrompt(
  question: string,
  freeBlocks: Array<{ start: Date; end: Date }>,
  nearbyActivities: TripItem[]
): string {
  const freeTimeContext =
    freeBlocks.length > 0
      ? freeBlocks
          .map(
            (block) =>
              `- ${block.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} to ${block.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
          )
          .join('\n')
      : 'No free time blocks available.';

  const activitiesContext =
    nearbyActivities.length > 0
      ? nearbyActivities.map((a) => `- ${a.title}`).join('\n')
      : 'No nearby activities found.';

  return `You are helping plan free time during a trip.

FREE TIME BLOCKS:
${freeTimeContext}

NEARBY ACTIVITIES YOU COULD DO:
${activitiesContext}

USER QUESTION: ${question}

If there is free time that matches the request, confirm it and suggest what they could do.
If there is no matching free time, explain the schedule conflict and suggest alternatives.`;
}

/**
 * Build a summarized context for a single day
 */
export function summarizeDay(items: TripItem[]): string {
  if (items.length === 0) {
    return 'No activities scheduled for this day.';
  }

  const sorted = [...items].sort(
    (a, b) =>
      new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
  );

  return sorted
    .map(
      (item) =>
        `${formatTime(item.startDateTime)}-${formatTime(item.endDateTime)}: ${item.title}`
    )
    .join('\n');
}

/**
 * Detect if a user message is a modification command
 */
export function isModificationCommand(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const modificationKeywords = [
    'move',
    'change',
    'reschedule',
    'shift',
    'swap',
    'cancel',
    'remove',
    'delete',
    'add',
    'update',
    'modify',
  ];

  return modificationKeywords.some((keyword) => lowerMessage.includes(keyword));
}

/**
 * Extract the target activity from a modification command
 */
export function extractTargetFromCommand(
  command: string,
  items: TripItem[]
): TripItem | null {
  const lowerCommand = command.toLowerCase();

  // Try to match item titles
  for (const item of items) {
    if (lowerCommand.includes(item.title.toLowerCase())) {
      return item;
    }
  }

  // Try common patterns
  const patterns = [
    /move\s+(?:my\s+)?(.+?)\s+to/i,
    /change\s+(?:my\s+)?(.+?)\s+to/i,
    /reschedule\s+(?:my\s+)?(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match) {
      const target = match[1].toLowerCase().trim();
      for (const item of items) {
        if (item.title.toLowerCase().includes(target)) {
          return item;
        }
      }
    }
  }

  return null;
}

