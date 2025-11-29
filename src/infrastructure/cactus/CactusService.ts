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
}

export interface CactusServiceState {
  isDownloaded: boolean;
  isDownloading: boolean;
  isInitializing: boolean;
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
      isInitializing: this.cactusLM.isInitializing ?? false,
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
    // Cactus SDK expects { text: string } object per docs
    const result = await this.cactusLM.embed({ text });
    return result.embedding ?? result;
  }

  async complete(
    messages: ChatMessage[],
    options?: CactusCompletionOptions
  ): Promise<CompletionResult> {
    // Build completion params per Cactus SDK docs
    const completionParams: any = {
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    // Add optional parameters only if defined
    if (options?.mode) {
      completionParams.mode = options.mode;
    }
    if (options?.onToken) {
      completionParams.onToken = options.onToken;
    }

    const result = await this.cactusLM.complete(completionParams);

    return {
      response: result?.response ?? this.cactusLM.completion ?? '',
      totalTokens: result?.totalTokens,
      tokensPerSecond: result?.tokensPerSecond,
    };
  }
}

