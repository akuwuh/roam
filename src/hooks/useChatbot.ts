import { useState, useCallback, useEffect } from 'react';
import { useCactusLM, type Message } from 'cactus-react-native';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const useChatbot = (itinerary?: any) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize Cactus LM with optimized settings for mobile
  const cactusLM = useCactusLM({
    contextSize: 2048, // Reduced from default for better mobile performance
  });

  // Check if model is ready
  const isModelReady = cactusLM.isDownloaded && !cactusLM.isDownloading;

  // Download the model
  const downloadModel = useCallback(async () => {
    try {
      setError(null);
      await cactusLM.download({
        onProgress: (progress) => {
          console.log(`Download progress: ${Math.round(progress * 100)}%`);
        },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download model';
      setError(errorMessage);
      console.error('Download error:', err);
    }
  }, [cactusLM]);

  // Send a message to the AI
  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) return;

    setError(null);

    // Add user message to chat
    const userChatMessage: ChatMessage = {
      role: 'user',
      content: userMessage.trim(),
    };
    
    setMessages(prev => [...prev, userChatMessage]);

    // Add empty assistant message for streaming
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Build system prompt with itinerary context
      let systemPrompt = 'You are a helpful travel assistant. ';
      
      if (itinerary) {
        systemPrompt += `The user is planning a trip to ${itinerary.destination}. `;
        systemPrompt += `Here is their itinerary:\n\n`;
        itinerary.days.forEach((day: any) => {
          systemPrompt += `Day ${day.day}:\n`;
          day.activities.forEach((activity: any) => {
            systemPrompt += `- ${activity.time}: ${activity.name}`;
            if (activity.description) {
              systemPrompt += ` (${activity.description})`;
            }
            systemPrompt += '\n';
          });
          systemPrompt += '\n';
        });
        systemPrompt += 'Help the user with questions about this itinerary. You can suggest changes, provide tips, or answer questions.';
      } else {
        systemPrompt += 'Help the user plan their travels and answer travel-related questions.';
      }

      // Build conversation history for context
      // Limit history to last 10 messages to manage memory usage
      const recentMessages = messages.slice(-10);
      
      const conversationHistory: Message[] = [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...recentMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content: userMessage.trim(),
        },
      ];

      // Generate completion with streaming (with optimized settings)
      const result = await cactusLM.complete({
        messages: conversationHistory,
        onToken: (token: string) => {
          // Update the last message (assistant) with new tokens
          setMessages(prev => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
              newMessages[lastIndex] = {
                ...newMessages[lastIndex],
                content: newMessages[lastIndex].content + token,
              };
            }
            return newMessages;
          });
        },
      });

      // If streaming didn't work, use the full response
      if (result.response) {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
            // Only update if content is empty (streaming didn't work)
            if (!newMessages[lastIndex].content) {
              newMessages[lastIndex] = {
                ...newMessages[lastIndex],
                content: result.response,
              };
            }
          }
          return newMessages;
        });
      }

      console.log(`Generated ${result.totalTokens} tokens at ${result.tokensPerSecond?.toFixed(1)} tok/s`);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate response';
      setError(errorMessage);
      console.error('Generation error:', err);
      
      // Remove the empty assistant message on error
      setMessages(prev => prev.slice(0, -1));
    }
  }, [cactusLM, messages, itinerary]);

  // Clear chat history
  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  // Auto-check if model is downloaded on mount
  useEffect(() => {
    if (cactusLM.error) {
      setError(cactusLM.error);
    }
  }, [cactusLM.error]);

  // Performance Tip 3: Clean up resources when done
  // Destroy the model context when component unmounts to free memory
  useEffect(() => {
    return () => {
      // Clean up model resources on unmount
      if (cactusLM.destroy) {
        console.log('Cleaning up Cactus LM resources...');
        cactusLM.destroy();
      }
    };
  }, [cactusLM]);

  return {
    messages,
    isGenerating: cactusLM.isGenerating,
    isDownloading: cactusLM.isDownloading,
    downloadProgress: cactusLM.downloadProgress,
    isModelReady,
    error,
    sendMessage,
    clearChat,
    downloadModel,
  };
};

