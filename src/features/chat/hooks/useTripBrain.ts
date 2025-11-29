/**
 * useTripBrain - Hook for AI-powered trip Q&A
 * PRD Section 5.3 - Chat / Trip Brain with RAG
 */

import { useState, useCallback, useEffect } from 'react';
import { useCactusLM } from 'cactus-react-native';
import type { TripItem } from '../../../domain/models';
import type { ChatMessage } from '../../../types';
import {
  buildQASystemPrompt,
  buildReplanSystemPrompt,
  buildContextChunks,
  isModificationCommand,
  extractTargetFromCommand,
  summarizeDay,
  formatTime,
} from '../../../domain/services';
import {
  getItemsAfter,
  findEarliestAvailableSlot,
  computeFreeBlocks,
} from '../../../domain/services';
import { getDurationMinutes } from '../../../domain/services';
import { useServices } from '../../../app/providers';
import { useNetwork } from '../../../app/providers';

/**
 * Build fallback context when semantic search is unavailable
 */
function buildFallbackContext(items: TripItem[], tripName?: string): string {
  if (items.length === 0) {
    return `No activities have been added to ${tripName || 'this trip'} yet.`;
  }

  // Group by day
  const itemsByDay = items.reduce((acc, item) => {
    const day = item.dayPlanId;
    if (!acc[day]) acc[day] = [];
    acc[day].push(item);
    return acc;
  }, {} as Record<string, TripItem[]>);

  let context = tripName ? `Trip: ${tripName}\n\n` : '';
  context += 'ITINERARY:\n';

  Object.entries(itemsByDay).forEach(([dayId, dayItems]) => {
    const sorted = [...dayItems].sort(
      (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
    );
    
    context += `\nDay ${dayId}:\n`;
    sorted.forEach(item => {
      const start = formatTime(item.startDateTime);
      const end = formatTime(item.endDateTime);
      context += `- ${start}-${end}: ${item.title}`;
      if (item.description) {
        context += ` (${item.description})`;
      }
      context += '\n';
    });
  });

  return context;
}

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
  const { tripRepository, memoryStore, placeRepository } = useServices();
  const { isOnline } = useNetwork();
  
  // Use Cactus hook DIRECTLY in this component (not through service)
  const cactusLM = useCactusLM({
    model: 'gemma3-1b',
    contextSize: 4096,
  });
  
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

  // Get model status directly from hook
  const isModelReady = cactusLM.isDownloaded && !cactusLM.isDownloading;
  
  // Log model status on every render for debugging
  useEffect(() => {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🤖 CACTUS LOCAL LLM STATUS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  📦 Model: gemma3-1b`);
    console.log(`  💾 Downloaded: ${cactusLM.isDownloaded ? '✅ YES (cached)' : '❌ NO'}`);
    console.log(`  📥 Downloading: ${cactusLM.isDownloading ? '🔄 IN PROGRESS' : '⏸️ NO'}`);
    console.log(`  📊 Download Progress: ${Math.round(cactusLM.downloadProgress * 100)}%`);
    console.log(`  🚀 Model Ready: ${isModelReady ? '✅ READY TO USE' : '⏳ NOT READY'}`);
    console.log('═══════════════════════════════════════════════════════');
  }, [cactusLM.isDownloaded, cactusLM.isDownloading, cactusLM.downloadProgress, isModelReady]);
  
  // Auto-download if needed
  useEffect(() => {
    if (!cactusLM.isDownloaded && !cactusLM.isDownloading) {
      console.log('');
      console.log('🔽 ════════════════════════════════════════════════════');
      console.log('🔽 STARTING MODEL DOWNLOAD');
      console.log('🔽 Model: gemma3-1b (Local LLM from Cactus)');
      console.log('🔽 This may take a few minutes on first launch...');
      console.log('🔽 ════════════════════════════════════════════════════');
      console.log('');
      cactusLM.download({
        onProgress: (progress: number) => {
          const pct = Math.round(progress * 100);
          if (pct % 10 === 0) { // Log every 10%
            console.log(`📥 Download Progress: ${pct}% ${'█'.repeat(pct / 5)}${'░'.repeat(20 - pct / 5)}`);
          }
        },
      });
    } else if (cactusLM.isDownloaded) {
      console.log('');
      console.log('✅ ════════════════════════════════════════════════════');
      console.log('✅ MODEL ALREADY CACHED - LOADING FROM DEVICE');
      console.log('✅ Model: gemma3-1b');
      console.log('✅ No download needed - using cached model');
      console.log('✅ ════════════════════════════════════════════════════');
      console.log('');
    }
  }, [cactusLM.isDownloaded, cactusLM.isDownloading]);

  // Load trip items for context
  const [tripItems, setTripItems] = useState<TripItem[]>([]);
  const [tripName, setTripName] = useState<string>();

  useEffect(() => {
    async function loadTripData() {
      const trip = await tripRepository.getTrip(tripId);
      setTripName(trip?.name);

      const items = await tripRepository.getAllTripItems(tripId);
      setTripItems(items);

      // Update KB status based on trip items (no embeddings needed)
      setKBStatus({
        itemCount: items.length,
        knowledgeCount: 0,
        totalCount: items.length,
        isSynced: items.length > 0,
      });
    }
    loadTripData();
  }, [tripId, tripRepository]);

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
    [isModelReady, tripId, tripItems, tripName, cactusLM, memoryStore]
  );

  const handleQuestion = async (question: string): Promise<void> => {
    console.log('🔍 Chat Debug - Starting handleQuestion');
    
    
    // Build context directly from trip items (bypass embeddings)
    // For most trips, this is simpler and more reliable than semantic search
    const context = buildFallbackContext(tripItems, tripName);

    console.log('🔍 Chat Debug:');
    console.log('  - Trip items count:', tripItems.length);
    console.log('  - Trip name:', tripName);
    console.log('  - Context length:', context.length);
    console.log('  - Context preview:', context.substring(0, 200));

    // Build system prompt with full itinerary context
    const systemPrompt = buildQASystemPrompt(question, context, tripName);
    
    console.log('  - System prompt length:', systemPrompt.length);
    console.log('  - System prompt preview:', systemPrompt.substring(0, 300));

    // Include itinerary context with clear instructions and guardrails for brevity
    const itineraryContext = context.length > 0 
      ? `You are a concise travel assistant. Keep responses SHORT (2-3 sentences max).

ITINERARY:
${context}

RULES:
- Be brief and direct
- Use bullet points for lists
- No lengthy explanations
- Answer only what was asked

Question: ${question}`
      : question;
    
    const conversationHistory: ChatMessage[] = [
      { role: 'user', content: itineraryContext },
    ];

    console.log('📨 Sending to LLM:');
    console.log('  - Total messages:', conversationHistory.length);
    console.log('  - Context included:', context.length > 0);
    console.log('  - Message preview:', itineraryContext.substring(0, 150));

    // Use the hook DIRECTLY - not through service wrapper
    console.log('');
    console.log('🧠 ════════════════════════════════════════════════════');
    console.log('🧠 INVOKING LOCAL LLM (gemma3-1b via Cactus)');
    console.log('🧠 ════════════════════════════════════════════════════');
    console.log('🧠 Running inference on-device...');
    console.log('🧠 Max tokens: 256 | Temperature: 0.7');
    console.log('');
    
    const startTime = Date.now();
    const result = await cactusLM.complete({
      messages: conversationHistory.map(m => ({
        role: m.role,
        content: m.content,
      })),
      options: {
        maxTokens: 256,
        temperature: 0.7,
        stopSequences: ['<end_of_turn>', '\n\n---', 'Ronny', 'rappie'], // Stop at end tokens
      },
      onToken: (token: string) => {
        // Skip special tokens
        if (token.includes('<end_of_turn>') || token.includes('<start_of_turn>')) {
          return;
        }
        
        // Stream tokens to UI in real-time
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
    
    const endTime = Date.now();
    const inferenceTime = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('');
    console.log('✅ ════════════════════════════════════════════════════');
    console.log('✅ LOCAL LLM INFERENCE COMPLETE');
    console.log('✅ ════════════════════════════════════════════════════');
    console.log(`✅ Success: ${result.success ? 'YES' : 'NO'}`);
    console.log(`✅ Response length: ${result.response?.length || 0} chars`);
    console.log(`✅ Total tokens: ${result.totalTokens || 'N/A'}`);
    console.log(`✅ Inference time: ${inferenceTime}s`);
    console.log('✅ ════════════════════════════════════════════════════');
    console.log('');
    
    // Clean up final response - remove any remaining garbage
    console.log('🧹 Generation complete, cleaning up...');
    
    setMessages((prev) => {
      const updated = [...prev];
      const lastIdx = updated.length - 1;
      if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
        let content = updated[lastIdx].content;
        // Clean up Gemma's tokens and hallucinated names
        content = content
          .replace(/<end_of_turn>/g, '')
          .replace(/<start_of_turn>/g, '')
          .replace(/model\n/g, '')
          .split(/(?:Christophe|Alain|Jules)/)[0]
          .trim();
        
        // If streaming didn't work, use the result
        if (!content && result.response) {
          content = result.response
            .replace(/<end_of_turn>/g, '')
            .replace(/<start_of_turn>/g, '')
            .split(/(?:Christophe|Alain|Jules)/)[0]
            .trim();
        }
        
        updated[lastIdx] = { ...updated[lastIdx], content };
      }
      return updated;
    });
    
    console.log('✅ Response complete!');

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

    const result = await cactusLM.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: command },
      ],
      options: {
        maxTokens: 256,
        temperature: 0.7,
      },
    });
    
    // Update message with response
    setMessages((prev) => {
      const updated = [...prev];
      const lastIdx = updated.length - 1;
      if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
        updated[lastIdx] = { ...updated[lastIdx], content: result.response };
      }
      return updated;
    });

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
        
        // NOTE: Skipping embedding indexing - using direct context for chat now

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
      console.log('');
      console.log('📥 ════════════════════════════════════════════════════');
      console.log('📥 MANUAL MODEL DOWNLOAD TRIGGERED');
      console.log('📥 Model: gemma3-1b (Cactus Local LLM)');
      console.log('📥 ════════════════════════════════════════════════════');
      console.log('');
      
      await cactusLM.download({
        onProgress: (progress: number) => {
          const pct = Math.round(progress * 100);
          console.log(`📥 Downloading: ${pct}% ${'█'.repeat(pct / 5)}${'░'.repeat(20 - pct / 5)}`);
        },
      });
      
      console.log('');
      console.log('✅ ════════════════════════════════════════════════════');
      console.log('✅ MODEL DOWNLOAD COMPLETE!');
      console.log('✅ gemma3-1b is now cached on device');
      console.log('✅ ════════════════════════════════════════════════════');
      console.log('');
    } catch (err) {
      console.error('❌ MODEL DOWNLOAD FAILED:', err);
      setError(err instanceof Error ? err.message : 'Failed to download model');
    }
  }, [cactusLM]);

  return {
    messages,
    isGenerating,
    isDownloading: cactusLM.isDownloading,
    downloadProgress: cactusLM.downloadProgress,
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

