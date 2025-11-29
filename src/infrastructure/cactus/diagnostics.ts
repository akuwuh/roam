/**
 * Cactus Diagnostics - Helper to diagnose embedding issues
 */

import type { CactusService } from './CactusService';

export interface DiagnosticResult {
  modelDownloaded: boolean;
  modelInitialized: boolean;
  embeddingWorks: boolean;
  completionWorks: boolean;
  error: string | null;
}

export async function runCactusDiagnostics(
  cactusService: CactusService
): Promise<DiagnosticResult> {
  const result: DiagnosticResult = {
    modelDownloaded: false,
    modelInitialized: false,
    embeddingWorks: false,
    completionWorks: false,
    error: null,
  };

  try {
    // Check model state
    const state = cactusService.getState();
    result.modelDownloaded = state.isDownloaded;
    result.modelInitialized = state.isDownloaded && !state.isDownloading;

    // Test embedding
    if (result.modelInitialized) {
      try {
        const testEmbedding = await cactusService.embed('test');
        result.embeddingWorks = testEmbedding && testEmbedding.length > 0;
        console.log('✅ Embedding test passed:', testEmbedding.length, 'dimensions');
      } catch (err) {
        result.embeddingWorks = false;
        console.error('❌ Embedding test failed:', err);
        result.error = `Embedding: ${err instanceof Error ? err.message : 'Unknown error'}`;
      }

      // Test completion
      try {
        const testCompletion = await cactusService.complete([
          { role: 'user', content: 'Say hello' },
        ], { maxTokens: 10 });
        result.completionWorks = testCompletion && testCompletion.response.length > 0;
        console.log('✅ Completion test passed:', testCompletion.response);
      } catch (err) {
        result.completionWorks = false;
        console.error('❌ Completion test failed:', err);
        if (!result.error) {
          result.error = `Completion: ${err instanceof Error ? err.message : 'Unknown error'}`;
        }
      }
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : 'Unknown diagnostic error';
  }

  return result;
}

