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

export class CloudPlannerApi {
  /**
   * Generate an itinerary using cloud AI
   * PRD 4.2: Only sends city, date, time ranges, interests (no PII)
   */
  async generateItinerary(
    request: PlannerRequest,
    tripId: string,
    dayPlanId: string
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

      console.log('Cloud planner raw response:', text);

      const { items, knowledge } = this.parseResponse(text, tripId, dayPlanId, request.date);
      
      console.log(`Parsed ${items.length} items from cloud planner`);

      // Fetch additional knowledge context
      const additionalKnowledge = await this.fetchKnowledgeContext(request.city);

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

    const interestsStr =
      request.interests.length > 0
        ? `Focus on: ${request.interests.join(', ')}.`
        : '';

    return `Create a comprehensive day itinerary for ${request.city} on ${request.date}.
Available time: ${timeRangeStr || '09:00 to 21:00 (full day)'}.
${interestsStr}

CRITICAL REQUIREMENTS:
1. Generate AT LEAST 6-8 activities to fill the entire day
2. Include breakfast, lunch, and dinner
3. Add transportation between major locations
4. Include varied activities (sightseeing, dining, cultural experiences)
5. Make sure times are realistic and activities don't overlap

Respond with ONLY a JSON array, no markdown, code blocks, or explanation.

Format:
[
  {"title": "Breakfast at Local Café", "type": "activity", "startTime": "08:00", "endTime": "09:00", "description": "Start the day with traditional breakfast"},
  {"title": "Visit Historic Temple", "type": "activity", "startTime": "09:30", "endTime": "11:30", "description": "Explore ancient temple grounds and architecture"},
  {"title": "Lunch at Market", "type": "activity", "startTime": "12:00", "endTime": "13:30", "description": "Try authentic local cuisine at the central market"},
  {"title": "Museum Tour", "type": "activity", "startTime": "14:00", "endTime": "16:00", "description": "Learn about local history and culture"},
  {"title": "Evening Walk", "type": "activity", "startTime": "16:30", "endTime": "18:00", "description": "Stroll through scenic gardens"},
  {"title": "Dinner & Entertainment", "type": "activity", "startTime": "18:30", "endTime": "20:30", "description": "Enjoy dinner with traditional live music"}
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
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch =
        text.match(/```json\n([\s\S]*?)\n```/) ||
        text.match(/```\n([\s\S]*?)\n```/) ||
        text.match(/\[[\s\S]*\]/);

      if (!jsonMatch) {
        console.error('Failed to parse JSON from response:', text);
        return { items: [], knowledge: [] };
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
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
}

export const cloudPlannerApi = new CloudPlannerApi();

