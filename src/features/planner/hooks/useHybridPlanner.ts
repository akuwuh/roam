/**
 * useHybridPlanner - Hook for hybrid cloud/local itinerary generation
 * PRD Section 5.4 - Hybrid Day Planner
 */

import { useState, useCallback } from 'react';
import type { TripItem, DayPlan } from '../../../domain/models';
import type { PlannerRequest, TimeRange } from '../../../types';
import { useServices } from '../../../app/providers';
import { useNetwork } from '../../../app/providers';

export interface UseHybridPlannerResult {
  isGenerating: boolean;
  error: string | null;
  generatePlan: (params: {
    tripId: string;
    dayPlanId: string;
    city: string;
    date: string;
    timeRanges?: TimeRange[];
    interests?: string[];
  }) => Promise<TripItem[]>;
  replanLocal: (params: {
    tripId: string;
    dayPlanId: string;
    instruction: string;
  }) => Promise<string>;
}

export function useHybridPlanner(): UseHybridPlannerResult {
  const { cloudPlannerApi, tripRepository, memoryStore, cactusService, placeRepository } =
    useServices();
  const { isOnline } = useNetwork();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate a plan using the hybrid router
   * PRD 4.2: Online -> cloud planner, Offline -> local re-planner
   */
  const generatePlan = useCallback(
    async (params: {
      tripId: string;
      dayPlanId: string;
      city: string;
      date: string;
      timeRanges?: TimeRange[];
      interests?: string[];
    }): Promise<TripItem[]> => {
      setIsGenerating(true);
      setError(null);

      try {
        // Check if we should use cloud planner
        const existingItems = await tripRepository.getTripItems(params.dayPlanId);
        const isNewPlan = existingItems.length === 0;

        if (isOnline && isNewPlan) {
          // Use cloud planner for new plans when online
          return await generateCloudPlan(params);
        } else {
          // Use local re-planner for modifications or offline
          const instruction = buildLocalPlanInstruction(params);
          await replanLocal({
            tripId: params.tripId,
            dayPlanId: params.dayPlanId,
            instruction,
          });
          // Return updated items
          return await tripRepository.getTripItems(params.dayPlanId);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate plan';
        setError(errorMessage);
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [isOnline, tripRepository, cloudPlannerApi, memoryStore, cactusService]
  );

  const generateCloudPlan = async (params: {
    tripId: string;
    dayPlanId: string;
    city: string;
    date: string;
    timeRanges?: TimeRange[];
    interests?: string[];
  }): Promise<TripItem[]> => {
    const request: PlannerRequest = {
      city: params.city,
      date: params.date,
      timeRanges: params.timeRanges ?? [{ start: '09:00', end: '21:00' }],
      interests: params.interests ?? [],
    };

    const response = await cloudPlannerApi.generateItinerary(
      request,
      params.tripId,
      params.dayPlanId
    );

    if (!response.success) {
      throw new Error(response.error ?? 'Failed to generate cloud plan');
    }

    // Save items to repository
    await tripRepository.upsertTripItems(response.items);
    console.log(`Saved ${response.items.length} items to repository for day ${params.dayPlanId}`);

    // Index items in memory store for RAG (only if model is downloaded)
    const modelState = cactusService.getState();
    if (modelState.isDownloaded) {
      for (const item of response.items) {
        try {
          const place = item.placeId
            ? await placeRepository.getPlace(item.placeId)
            : undefined;
          await memoryStore.indexItem(item, place ?? undefined);
        } catch (err) {
          console.warn('Failed to index item:', err);
        }
      }
    } else {
      console.log('Skipping item indexing - Cactus model not downloaded');
    }

    // Auto-index knowledge context for offline RAG (only if model is downloaded)
    if (modelState.isDownloaded && response.knowledgeContext && response.knowledgeContext.length > 0) {
      try {
        await memoryStore.indexKnowledge(params.tripId, response.knowledgeContext);
        console.log(`Indexed ${response.knowledgeContext.length} knowledge chunks for trip ${params.tripId}`);
      } catch (err) {
        console.warn('Failed to index knowledge context:', err);
      }
    } else if (!modelState.isDownloaded && response.knowledgeContext && response.knowledgeContext.length > 0) {
      console.log(`Received ${response.knowledgeContext.length} knowledge chunks but skipping indexing - model not downloaded`);
    }

    return response.items;
  };

  /**
   * Local re-planning using Cactus
   * PRD 4.2: For minor edits or offline use
   */
  const replanLocal = useCallback(
    async (params: {
      tripId: string;
      dayPlanId: string;
      instruction: string;
    }): Promise<string> => {
      setIsGenerating(true);
      setError(null);

      try {
        const modelState = cactusService.getState();
        if (!modelState.isDownloaded) {
          throw new Error('AI model not downloaded. Please download the model first.');
        }

        // Get current items
        const items = await tripRepository.getTripItems(params.dayPlanId);

        // Build context
        const itemsContext = items
          .map(
            (item) =>
              `- ${item.title}: ${new Date(item.startDateTime).toLocaleTimeString()} to ${new Date(item.endDateTime).toLocaleTimeString()}`
          )
          .join('\n');

        const systemPrompt = `You are a travel planning assistant. Help adjust the following schedule based on the user's request.

CURRENT SCHEDULE:
${itemsContext}

USER REQUEST: ${params.instruction}

Provide a brief response explaining the change. Be specific about times.`;

        const result = await cactusService.complete([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: params.instruction },
        ]);

        return result.response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to replan';
        setError(errorMessage);
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [cactusService, tripRepository]
  );

  return {
    isGenerating,
    error,
    generatePlan,
    replanLocal,
  };
}

function buildLocalPlanInstruction(params: {
  city: string;
  date: string;
  timeRanges?: TimeRange[];
  interests?: string[];
}): string {
  const timeStr = params.timeRanges
    ?.map((r) => `${r.start} to ${r.end}`)
    .join(', ') ?? 'full day';
  
  const interestsStr = params.interests?.join(', ') ?? 'general sightseeing';

  return `Create a day plan for ${params.city} on ${params.date} during ${timeStr}. Focus on: ${interestsStr}.`;
}

