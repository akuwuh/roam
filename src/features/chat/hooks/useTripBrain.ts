/**
 * useTripBrain - Hook for AI-powered trip Q&A
 * PRD Section 5.3 - Chat / Trip Brain with RAG
 */

import { useState, useCallback, useEffect } from 'react';
import type { TripItem } from '../../../domain/models';
import type { ChatMessage } from '../../../types';
import {
  buildQASystemPrompt,
  buildReplanSystemPrompt,
  buildContextChunks,
  isModificationCommand,
  extractTargetFromCommand,
  summarizeDay,
} from '../../../domain/services';
import {
  getItemsAfter,
  findEarliestAvailableSlot,
  computeFreeBlocks,
} from '../../../domain/services';
import { getDurationMinutes } from '../../../domain/services';
import { useServices } from '../../../app/providers';
import { useNetwork } from '../../../app/providers';

export interface PendingAction {
  id: string;
  type: 'reschedule' | 'add' | 'remove';
  description: string;
  targetItem?: TripItem;
  newStartTime?: string;
  newEndTime?: string;
}

export interface KBStatus {
  itemCount: number;
  knowledgeCount: number;
  totalCount: number;
  isSynced: boolean;
}

export interface UseTripBrainResult {
  messages: ChatMessage[];
  isGenerating: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  isModelReady: boolean;
  error: string | null;
  kbStatus: KBStatus;
  pendingAction: PendingAction | null;
  ask: (question: string) => Promise<void>;
  clearChat: () => void;
  downloadModel: () => Promise<void>;
  applyPendingAction: () => Promise<void>;
  dismissPendingAction: () => void;
}

export function useTripBrain(tripId: string): UseTripBrainResult {
  const { cactusService, tripRepository, memoryStore, placeRepository } =
    useServices();
  const { isOnline } = useNetwork();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [kbStatus, setKBStatus] = useState<KBStatus>({
    itemCount: 0,
    knowledgeCount: 0,
    totalCount: 0,
    isSynced: false,
  });

  // Get model status
  const modelState = cactusService.getState();
  const isModelReady = modelState.isDownloaded && !modelState.isDownloading;

  // Load trip items for context
  const [tripItems, setTripItems] = useState<TripItem[]>([]);
  const [tripName, setTripName] = useState<string>();

  useEffect(() => {
    async function loadTripData() {
      const trip = await tripRepository.getTrip(tripId);
      setTripName(trip?.name);

      const items = await tripRepository.getAllTripItems(tripId);
      setTripItems(items);

      // Load KB status
      try {
        const status = await memoryStore.getKnowledgeBaseStatus(tripId);
        setKBStatus({
          ...status,
          isSynced: status.totalCount > 0,
        });
      } catch (err) {
        console.warn('Failed to get KB status:', err);
      }
    }
    loadTripData();
  }, [tripId, tripRepository, memoryStore]);

  const ask = useCallback(
    async (question: string): Promise<void> => {
      if (!question.trim() || !isModelReady) return;

      setError(null);

      // Add user message
      const userMessage: ChatMessage = { role: 'user', content: question };
      setMessages((prev) => [...prev, userMessage]);

      // Add empty assistant message for streaming
      const assistantMessage: ChatMessage = { role: 'assistant', content: '' };
      setMessages((prev) => [...prev, assistantMessage]);

      setIsGenerating(true);

      try {
        // Check if this is a modification command
        if (isModificationCommand(question)) {
          await handleModificationCommand(question);
        } else {
          await handleQuestion(question);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate response');
        // Remove empty assistant message on error
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsGenerating(false);
      }
    },
    [isModelReady, tripId, tripItems, tripName, cactusService, memoryStore]
  );

  const handleQuestion = async (question: string): Promise<void> => {
    // Step 1: Search memory store for relevant context
    const searchResults = await memoryStore.search(tripId, question, 5);

    // Step 2: Build context from memory results
    const context = buildContextChunks(searchResults);

    // Step 3: Build system prompt
    const systemPrompt = buildQASystemPrompt(question, context, tripName);

    // Step 4: Get completion from Cactus
    const conversationHistory: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10), // Include recent conversation
      { role: 'user', content: question },
    ];

    const result = await cactusService.complete(conversationHistory, {
      onToken: (token: string) => {
        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
            updated[lastIdx] = {
              ...updated[lastIdx],
              content: updated[lastIdx].content + token,
            };
          }
          return updated;
        });
      },
    });

    // If streaming didn't work, set full response
    if (result.response) {
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
          if (!updated[lastIdx].content) {
            updated[lastIdx] = { ...updated[lastIdx], content: result.response };
          }
        }
        return updated;
      });
    }
  };

  const handleModificationCommand = async (command: string): Promise<void> => {
    // Step 1: Find target item
    const targetItem = extractTargetFromCommand(command, tripItems);

    if (!targetItem) {
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = {
          ...updated[lastIdx],
          content: "I couldn't identify which activity you want to modify. Could you be more specific?",
        };
        return updated;
      });
      return;
    }

    // Step 2: Find available slot
    const duration = getDurationMinutes(
      targetItem.startDateTime,
      targetItem.endDateTime
    );
    const slot = findEarliestAvailableSlot(
      tripItems,
      targetItem.dayPlanId,
      duration
    );

    if (!slot) {
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = {
          ...updated[lastIdx],
          content: "I couldn't find a suitable time slot for that change. The schedule might be full.",
        };
        return updated;
      });
      return;
    }

    // Step 3: Get day items for context
    const dayItems = tripItems.filter(
      (i) => i.dayPlanId === targetItem.dayPlanId
    );
    const freeBlocks = computeFreeBlocks(dayItems);

    // Step 4: Build replan prompt and get confirmation
    const systemPrompt = buildReplanSystemPrompt(command, dayItems, [slot]);

    const result = await cactusService.complete(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: command },
      ],
      {
        onToken: (token: string) => {
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: updated[lastIdx].content + token,
              };
            }
            return updated;
          });
        },
      }
    );

    // Create a pending action for the user to approve
    setPendingAction({
      id: `action_${Date.now()}`,
      type: 'reschedule',
      description: `Move "${targetItem.title}" to ${slot.start} - ${slot.end}`,
      targetItem,
      newStartTime: slot.start,
      newEndTime: slot.end,
    });
  };

  const applyPendingAction = useCallback(async () => {
    if (!pendingAction || !pendingAction.targetItem) {
      return;
    }

    try {
      const { targetItem, newStartTime, newEndTime } = pendingAction;
      
      if (pendingAction.type === 'reschedule' && newStartTime && newEndTime) {
        // Update the item with new times
        const date = targetItem.startDateTime.split('T')[0];
        const updatedItem: TripItem = {
          ...targetItem,
          startDateTime: `${date}T${newStartTime}:00`,
          endDateTime: `${date}T${newEndTime}:00`,
        };

        await tripRepository.upsertTripItem(updatedItem);
        
        // Re-index in memory store
        try {
          await memoryStore.reindexItem(updatedItem);
        } catch (err) {
          console.warn('Failed to re-index item:', err);
        }

        // Reload items
        const items = await tripRepository.getAllTripItems(tripId);
        setTripItems(items);

        // Add confirmation message
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Done! I've moved "${targetItem.title}" to ${newStartTime} - ${newEndTime}.`,
          },
        ]);
      }

      setPendingAction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply change');
    }
  }, [pendingAction, tripId, tripRepository, memoryStore]);

  const dismissPendingAction = useCallback(() => {
    if (pendingAction) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Okay, I won\'t make that change. Is there anything else I can help with?',
        },
      ]);
      setPendingAction(null);
    }
  }, [pendingAction]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const downloadModel = useCallback(async () => {
    try {
      setError(null);
      await cactusService.download((progress) => {
        console.log(`Download progress: ${Math.round(progress * 100)}%`);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download model');
    }
  }, [cactusService]);

  return {
    messages,
    isGenerating,
    isDownloading: modelState.isDownloading,
    downloadProgress: modelState.downloadProgress,
    isModelReady,
    error,
    kbStatus,
    pendingAction,
    ask,
    clearChat,
    downloadModel,
    applyPendingAction,
    dismissPendingAction,
  };
}

