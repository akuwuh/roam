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

// Using Gemini API for cloud planning
const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || '';
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

export interface CloudPlannerResponse {
  items: TripItem[];
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
    if (!GEMINI_API_KEY) {
      return {
        items: [],
        success: false,
        error: 'Cloud planner API key not configured',
      };
    }

    const prompt = this.buildPrompt(request);

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloud planner API error:', errorText);
        return {
          items: [],
          success: false,
          error: `API request failed: ${response.status}`,
        };
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

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

IMPORTANT: Respond with ONLY a JSON array, no markdown or explanation.
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

