/**
 * Cloud Planner API - External itinerary generation via OpenRouter
 * PRD Phase 4, Section 4.2 - Hybrid Day Planner
 * 
 * Note: This sends only non-PII data (city, date, interests)
 */

import Constants from 'expo-constants';
import type { TripItem } from '../../domain/models';
import { createTripItem } from '../../domain/models';
import type { PlannerRequest, TimeRange } from '../../types';

// OpenRouter API configuration
const OPENROUTER_API_KEY = Constants.expoConfig?.extra?.openRouterApiKey || '';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Default model - can be changed to any model on OpenRouter
const DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';

export interface CloudPlannerResponse {
  items: TripItem[];
  success: boolean;
  error?: string;
}

export class CloudPlannerApi {
  private model: string;

  constructor(model: string = DEFAULT_MODEL) {
    this.model = model;
  }

  /**
   * Generate an itinerary using cloud AI via OpenRouter
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
        success: false,
        error: 'OpenRouter API key not configured. Add OPENROUTER_API_KEY to your .env file.',
      };
    }

    const prompt = this.buildPrompt(request);

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://roam.app', // Required by OpenRouter
          'X-Title': 'Roam Travel Planner', // Optional, shows in OpenRouter dashboard
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a travel planning assistant. Always respond with valid JSON arrays only, no markdown or explanations.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenRouter API error:', errorData);
        return {
          items: [],
          success: false,
          error: `API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`,
        };
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (!text) {
        return {
          items: [],
          success: false,
          error: 'Invalid response format from API',
        };
      }

      const items = this.parseResponse(text, tripId, dayPlanId, request.date);

      return {
        items,
        success: true,
      };
    } catch (error) {
      console.error('Cloud planner error:', error);
      return {
        items: [],
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
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

    return `Create a day itinerary for ${request.city} on ${request.date}.
Available time: ${timeRangeStr || 'full day'}.
${interestsStr}

Respond with ONLY a JSON array, no markdown or explanation.
Each item must have: title, type (activity|transport|lodging), startTime (HH:mm), endTime (HH:mm), description.

Example format:
[
  {"title": "Visit Temple", "type": "activity", "startTime": "09:00", "endTime": "11:00", "description": "Explore the historic temple grounds"},
  {"title": "Lunch at Local Restaurant", "type": "activity", "startTime": "12:00", "endTime": "13:30", "description": "Try local cuisine"}
]

Generate 4-6 activities with realistic times. Include brief descriptions.`;
  }

  /**
   * Parse the API response into TripItem objects
   */
  private parseResponse(
    text: string,
    tripId: string,
    dayPlanId: string,
    date: string
  ): TripItem[] {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch =
        text.match(/```json\n([\s\S]*?)\n```/) ||
        text.match(/```\n([\s\S]*?)\n```/) ||
        text.match(/\[[\s\S]*\]/);

      if (!jsonMatch) {
        console.error('Failed to parse JSON from response:', text);
        return [];
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonText);

      if (!Array.isArray(parsed)) {
        console.error('Response is not an array:', parsed);
        return [];
      }

      return parsed.map((item: any, index: number) => {
        const startDateTime = this.buildDateTime(date, item.startTime);
        const endDateTime = this.buildDateTime(date, item.endTime);

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
    } catch (error) {
      console.error('Failed to parse cloud planner response:', error);
      return [];
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
