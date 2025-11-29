/**
 * Cloud Planner API - External itinerary generation
 * PRD Phase 4, Section 4.2 - Hybrid Day Planner
 * 
 * Note: This sends only non-PII data (city, date, interests)
 */

import Constants from 'expo-constants';
import type { TripItem } from '../../domain/models';
import { createTripItem } from '../../domain/models';
import type { PlannerRequest, TimeRange } from '../../types';

// Using OpenRouter API for cloud planning
const OPENROUTER_API_KEY = Constants.expoConfig?.extra?.openRouterApiKey || '';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.0-flash-exp:free'; // Using free Gemini model via OpenRouter

export interface CloudPlannerResponse {
  items: TripItem[];
  knowledgeContext: string[];
  success: boolean;
  error?: string;
}

export interface MultiDayPlannerResponse {
  itemsByDay: Map<string, TripItem[]>; // dayPlanId -> items
  knowledgeContext: string[];
  success: boolean;
  error?: string;
}

export class CloudPlannerApi {
  /**
   * Generate itineraries for multiple days in a single API call
   * This ensures variety across days as the AI plans the entire trip at once
   */
  async generateMultiDayItinerary(
    tripId: string,
    city: string,
    days: Array<{ dayPlanId: string; date: string; dayNumber: number }>
  ): Promise<MultiDayPlannerResponse> {
    if (!OPENROUTER_API_KEY) {
      return {
        itemsByDay: new Map(),
        knowledgeContext: [],
        success: false,
        error: 'Cloud planner API key not configured',
      };
    }

    const prompt = this.buildMultiDayPrompt(city, days);

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://roam.app',
          'X-Title': 'Roam Travel Planner',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Multi-day planner API error:', errorText);
        return {
          itemsByDay: new Map(),
          knowledgeContext: [],
          success: false,
          error: `API request failed: ${response.status}`,
        };
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (!text) {
        return {
          itemsByDay: new Map(),
          knowledgeContext: [],
          success: false,
          error: 'Invalid response format from API',
        };
      }

      console.log('Multi-day planner raw response (length:', text.length, ')');

      const { itemsByDay, knowledge } = this.parseMultiDayResponse(text, tripId, days);
      
      console.log(`Parsed items for ${itemsByDay.size} days from multi-day planner`);

      // Fetch knowledge context once for the entire trip
      const additionalKnowledge = await this.fetchKnowledgeContext(city);

      return {
        itemsByDay,
        knowledgeContext: [...knowledge, ...additionalKnowledge],
        success: true,
      };
    } catch (error) {
      console.error('Multi-day planner error:', error);
      return {
        itemsByDay: new Map(),
        knowledgeContext: [],
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Generate an itinerary using cloud AI
   * PRD 4.2: Only sends city, date, time ranges, interests (no PII)
   */
  async generateItinerary(
    request: PlannerRequest,
    tripId: string,
    dayPlanId: string,
    skipKnowledgeFetch: boolean = false
  ): Promise<CloudPlannerResponse> {
    if (!OPENROUTER_API_KEY) {
      return {
        items: [],
        knowledgeContext: [],
        success: false,
        error: 'Cloud planner API key not configured',
      };
    }

    const prompt = this.buildPrompt(request);

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://roam.app',
          'X-Title': 'Roam Travel Planner',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.9, // Higher temperature for more variety
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloud planner API error:', errorText);
        return {
          items: [],
          knowledgeContext: [],
          success: false,
          error: `API request failed: ${response.status}`,
        };
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (!text) {
        return {
          items: [],
          knowledgeContext: [],
          success: false,
          error: 'Invalid response format from API',
        };
      }

      console.log('Cloud planner raw response (length:', text.length, ')');
      console.log('First 500 chars:', text.substring(0, 500));

      const { items, knowledge } = this.parseResponse(text, tripId, dayPlanId, request.date);
      
      console.log(`Parsed ${items.length} items from cloud planner`);

      // Fetch additional knowledge context (only if not skipped - save on parallel calls)
      const additionalKnowledge = skipKnowledgeFetch 
        ? [] 
        : await this.fetchKnowledgeContext(request.city);

      return {
        items,
        knowledgeContext: [...knowledge, ...additionalKnowledge],
        success: true,
      };
    } catch (error) {
      console.error('Cloud planner error:', error);
      return {
        items: [],
        knowledgeContext: [],
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Fetch additional knowledge context about the destination
   */
  private async fetchKnowledgeContext(city: string): Promise<string[]> {
    if (!OPENROUTER_API_KEY) return [];

    const knowledgePrompt = `Provide 5-7 brief, useful travel tips and local knowledge about ${city}.
Format each tip as a single sentence. Include:
- Best times to visit attractions
- Local customs or etiquette
- Transportation tips
- Food recommendations
- Safety tips
- Money-saving suggestions

Respond with ONLY a JSON array of strings, no markdown.
Example: ["Tip 1", "Tip 2", "Tip 3"]`;

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://roam.app',
          'X-Title': 'Roam Travel Planner',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: knowledgePrompt }],
        }),
      });

      if (!response.ok) return [];

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (!text) return [];

      // Parse JSON array
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) return [];

      return parsed.filter((item: unknown) => typeof item === 'string');
    } catch (error) {
      console.warn('Failed to fetch knowledge context:', error);
      return [];
    }
  }

  /**
   * Build the prompt for itinerary generation
   * Implements system prompt design requirements
   */
  private buildPrompt(request: PlannerRequest): string {
    const timeRangeStr = request.timeRanges
      .map((r) => `${r.start} to ${r.end}`)
      .join(', ');

    // Extract day context from interests if present
    const dayContext = request.interests.find(i => i.includes('Day '));
    const dateContext = request.interests.find(i => i.includes('Date: '));
    const otherInterests = request.interests.filter(i => !i.includes('Day ') && !i.includes('Date: '));
    
    const interestsStr = otherInterests.length > 0
      ? `Additional interests: ${otherInterests.join(', ')}.`
      : '';

    // Parse day number to suggest different types of activities
    const dayMatch = dayContext?.match(/Day (\d+) out of (\d+)/);
    const currentDay = dayMatch ? parseInt(dayMatch[1]) : 1;
    const totalDays = dayMatch ? parseInt(dayMatch[2]) : 1;
    
    let dayGuidance = '';
    if (totalDays > 1) {
      if (currentDay === 1) {
        dayGuidance = '\nSince this is the FIRST day, focus on iconic must-see landmarks and getting oriented to the city.';
      } else if (currentDay === totalDays) {
        dayGuidance = '\nSince this is the LAST day, focus on final experiences, shopping for souvenirs, or revisiting favorite spots.';
      } else if (currentDay === 2) {
        dayGuidance = '\nSince this is the SECOND day, focus on deep cultural experiences, local neighborhoods, and authentic food.';
      } else {
        dayGuidance = `\nSince this is day ${currentDay}, explore different aspects like nature, hidden gems, or specialized interests.`;
      }
    }

    return `Create a day itinerary for ${request.city} on ${request.date}.
Available time: ${timeRangeStr || '09:00 to 21:00 (full day)'}.
${interestsStr}${dayGuidance}

CRITICAL REQUIREMENTS FOR VARIETY:
1. Generate exactly 3-4 key activities for this specific day
2. If this is a multi-day trip (${totalDays} days total), ensure this day ${currentDay} has COMPLETELY DIFFERENT activities from other days
3. Vary the types: mix landmarks, food, culture, nature, entertainment, shopping, etc.
4. Choose different neighborhoods or areas of the city
5. Make sure times are realistic and activities don't overlap
6. Include at least one meal (lunch or dinner)

Respond with ONLY a JSON array, no markdown, code blocks, or explanation.

Format:
[
  {"title": "Visit Historic Temple", "type": "activity", "startTime": "09:30", "endTime": "11:30", "description": "Explore ancient temple grounds and architecture"},
  {"title": "Lunch at Local Market", "type": "activity", "startTime": "12:00", "endTime": "13:30", "description": "Try authentic local cuisine"},
  {"title": "Museum Tour", "type": "activity", "startTime": "14:00", "endTime": "16:00", "description": "Learn about local history and culture"},
  {"title": "Dinner & Sunset Views", "type": "activity", "startTime": "18:00", "endTime": "20:00", "description": "Enjoy dinner with scenic city views"}
]`;
  }

  /**
   * Parse the API response into TripItem objects and extract knowledge
   */
  private parseResponse(
    text: string,
    tripId: string,
    dayPlanId: string,
    date: string
  ): { items: TripItem[]; knowledge: string[] } {
    try {
      // Clean up the text
      let jsonText = text.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      
      // Try to find JSON array in the text
      const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        jsonText = arrayMatch[0];
      }

      console.log('Attempting to parse JSON (length:', jsonText.length, ')');
      console.log('JSON preview:', jsonText.substring(0, 200));

      const parsed = JSON.parse(jsonText);

      if (!Array.isArray(parsed)) {
        console.error('Response is not an array:', parsed);
        return { items: [], knowledge: [] };
      }

      const knowledge: string[] = [];
      
      const items = parsed.map((item: any, index: number) => {
        const startDateTime = this.buildDateTime(date, item.startTime);
        const endDateTime = this.buildDateTime(date, item.endTime);

        // Extract description as knowledge
        if (item.description) {
          knowledge.push(`${item.title}: ${item.description}`);
        }

        return createTripItem({
          tripId,
          dayPlanId,
          type: this.normalizeType(item.type),
          title: item.title || `Activity ${index + 1}`,
          startDateTime,
          endDateTime,
          metadata: {
            description: item.description,
            generatedByCloud: true,
          },
        });
      });

      return { items, knowledge };
    } catch (error) {
      console.error('Failed to parse cloud planner response:', error);
      return { items: [], knowledge: [] };
    }
  }

  private buildDateTime(date: string, time: string): string {
    // Ensure time is in HH:mm format
    const normalizedTime = time.includes(':') ? time : `${time}:00`;
    return `${date}T${normalizedTime}:00`;
  }

  private normalizeType(type: string): 'activity' | 'transport' | 'lodging' | 'flight' {
    const normalized = type?.toLowerCase();
    if (normalized === 'transport') return 'transport';
    if (normalized === 'lodging') return 'lodging';
    if (normalized === 'flight') return 'flight';
    return 'activity';
  }

  /**
   * Build prompt for multi-day itinerary generation
   */
  private buildMultiDayPrompt(
    city: string,
    days: Array<{ dayPlanId: string; date: string; dayNumber: number }>
  ): string {
    const daysList = days.map(d => `Day ${d.dayNumber} (${d.date})`).join(', ');
    
    return `Create a ${days.length}-day itinerary for ${city}.
Days: ${daysList}

CRITICAL REQUIREMENTS:
1. Generate 3-4 unique activities for EACH day
2. Ensure NO REPETITION - each day must have completely different activities
3. Vary by: type (cultural, food, nature, shopping, entertainment), location/neighborhood, and time of day
4. Include at least one meal per day (lunch or dinner)
5. Make sure times are realistic (09:00-21:00) and don't overlap
6. Plan the trip holistically so days complement each other

Respond with a JSON object where each key is "day_1", "day_2", etc., and each value is an array of activities.

Format:
{
  "day_1": [
    {"title": "Activity name", "type": "activity", "startTime": "09:30", "endTime": "11:30", "description": "Description"}
  ],
  "day_2": [
    {"title": "Different activity", "type": "activity", "startTime": "10:00", "endTime": "12:00", "description": "Description"}
  ]
}

IMPORTANT: Generate ${days.length} days of VARIED activities. No markdown, no code blocks.`;
  }

  /**
   * Parse multi-day response into items organized by day
   */
  private parseMultiDayResponse(
    text: string,
    tripId: string,
    days: Array<{ dayPlanId: string; date: string; dayNumber: number }>
  ): { itemsByDay: Map<string, TripItem[]>; knowledge: string[] } {
    try {
      // Clean up the text
      let jsonText = text.trim();
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      
      // Try to find JSON object in the text
      const objectMatch = jsonText.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonText = objectMatch[0];
      }

      console.log('Attempting to parse multi-day JSON (length:', jsonText.length, ')');

      const parsed = JSON.parse(jsonText);
      const itemsByDay = new Map<string, TripItem[]>();
      const knowledge: string[] = [];

      // Map day_1, day_2, etc. to dayPlanIds
      days.forEach((day, index) => {
        const dayKey = `day_${day.dayNumber}`;
        const dayActivities = parsed[dayKey] || [];

        if (!Array.isArray(dayActivities)) {
          console.warn(`Day ${day.dayNumber} activities is not an array:`, dayActivities);
          itemsByDay.set(day.dayPlanId, []);
          return;
        }

        const items = dayActivities.map((item: any, itemIndex: number) => {
          const startDateTime = this.buildDateTime(day.date, item.startTime);
          const endDateTime = this.buildDateTime(day.date, item.endTime);

          if (item.description) {
            knowledge.push(`${item.title}: ${item.description}`);
          }

          return createTripItem({
            tripId,
            dayPlanId: day.dayPlanId,
            type: this.normalizeType(item.type),
            title: item.title || `Activity ${itemIndex + 1}`,
            startDateTime,
            endDateTime,
            metadata: {
              description: item.description,
              generatedByCloud: true,
            },
          });
        });

        itemsByDay.set(day.dayPlanId, items);
        console.log(`Parsed ${items.length} items for day ${day.dayNumber}`);
      });

      return { itemsByDay, knowledge };
    } catch (error) {
      console.error('Failed to parse multi-day response:', error);
      return { itemsByDay: new Map(), knowledge: [] };
    }
  }
}

export const cloudPlannerApi = new CloudPlannerApi();

