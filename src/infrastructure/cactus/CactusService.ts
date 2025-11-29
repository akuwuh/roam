/**
 * Cactus SDK Service Interface
 * PRD Phase 1 - Infrastructure Layer
 * Wraps the Cactus SDK for dependency injection and testability
 */

import type { ChatMessage, CompletionResult } from '../../types';

export interface CactusCompletionOptions {
  mode?: 'local' | 'hybrid';
  onToken?: (token: string) => void;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
}

export interface CactusServiceState {
  isDownloaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  isGenerating: boolean;
  error: string | null;
}

export interface CactusService {
  // State
  getState(): CactusServiceState;

  // Model management
  download(onProgress?: (progress: number) => void): Promise<void>;
  destroy(): void;

  // AI operations
  embed(text: string): Promise<number[]>;
  complete(
    messages: ChatMessage[],
    options?: CactusCompletionOptions
  ): Promise<CompletionResult>;
}

/**
 * Implementation using the actual Cactus SDK
 * This is injected at runtime; tests can mock this interface
 */
export class CactusServiceImpl implements CactusService {
  private cactusLM: any; // The useCactusLM hook result

  constructor(cactusLM: any) {
    this.cactusLM = cactusLM;
  }

  getState(): CactusServiceState {
    return {
      isDownloaded: this.cactusLM.isDownloaded ?? false,
      isDownloading: this.cactusLM.isDownloading ?? false,
      downloadProgress: this.cactusLM.downloadProgress ?? 0,
      isGenerating: this.cactusLM.isGenerating ?? false,
      error: this.cactusLM.error ?? null,
    };
  }

  async download(onProgress?: (progress: number) => void): Promise<void> {
    await this.cactusLM.download({
      onProgress: onProgress
        ? (progress: number) => onProgress(progress)
        : undefined,
    });
  }

  destroy(): void {
    if (this.cactusLM.destroy) {
      this.cactusLM.destroy();
    }
  }

  async embed(text: string): Promise<number[]> {
    if (!this.cactusLM.embed) {
      throw new Error('Embed function not available on Cactus LM');
    }
    
    try {
      // According to Cactus docs: embed expects { text: string }
      const result = await this.cactusLM.embed({ text });
      const embedding = result.embedding ?? result;
      
      // Validate embedding
      if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Cactus embed returned invalid embedding');
      }
      
      return embedding;
    } catch (err) {
      // Log detailed error for debugging
      console.error('Cactus embed failed:', err);
      throw new Error(`Embedding failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async complete(
    messages: ChatMessage[],
    options?: CactusCompletionOptions
  ): Promise<CompletionResult> {
    console.log('💬 LLM Complete called:', {
      messageCount: messages.length,
      mode: options?.mode ?? 'local',
      maxTokens: options?.maxTokens,
      lastMessage: messages[messages.length - 1]?.content?.substring(0, 50),
    });

    // Per Cactus docs: options is a NESTED object
    // https://cactuscompute.com/docs/react-native
    const completeParams: any = {
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      options: {
        maxTokens: options?.maxTokens ?? 512,
        temperature: options?.temperature ?? 0.7,
        topP: options?.topP ?? 0.9,
      },
      mode: options?.mode ?? 'local',
    };
    
    // Add onToken at top level (not in options)
    if (options?.onToken) {
      completeParams.onToken = options.onToken;
    }

    console.log('🎯 Complete params (per docs):', {
      messageCount: completeParams.messages.length,
      options: completeParams.options,
      mode: completeParams.mode,
      hasOnToken: !!completeParams.onToken,
    });

    const result = await this.cactusLM.complete(completeParams);

    // Clean up response - remove thinking tags, special tokens, and extra whitespace
    let cleanedResponse = result.response ?? '';
    cleanedResponse = cleanedResponse
      .replace(/<think>[\s\S]*?<\/think>/g, '') // Remove <think>...</think> blocks
      .replace(/<think>/g, '') // Remove standalone <think> tags
      .replace(/<\/think>/g, '') // Remove standalone </think> tags
      .replace(/<\|im_start\|>/g, '') // Remove Qwen chat template tokens
      .replace(/<\|im_end\|>/g, '')
      .replace(/<\|endoftext\|>/g, '')
      .trim();

    console.log('💬 LLM Response:', {
      rawLength: result.response?.length ?? 0,
      cleanedLength: cleanedResponse.length,
      responsePreview: cleanedResponse.substring(0, 100),
      totalTokens: result.totalTokens,
      tokensPerSecond: result.tokensPerSecond,
    });

    return {
      response: cleanedResponse,
      totalTokens: result.totalTokens,
      tokensPerSecond: result.tokensPerSecond,
    };
  }
}

