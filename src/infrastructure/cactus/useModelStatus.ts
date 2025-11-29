/**
 * Hook for tracking Cactus model download status
 * PRD Phase 3 - Show model download progress in UI
 */

import { useState, useCallback, useEffect } from 'react';
import { useCactusLM } from 'cactus-react-native';

export interface ModelStatus {
  isDownloaded: boolean;
  isDownloading: boolean;
  isInitializing: boolean;
  downloadProgress: number;
  isReady: boolean;
  error: string | null;
}

export interface UseModelStatusResult extends ModelStatus {
  downloadModel: () => Promise<void>;
}

export function useModelStatus(): UseModelStatusResult {
  const [error, setError] = useState<string | null>(null);

  const cactusLM = useCactusLM({
    model: 'lfm2-700m', // Best balance: speed + quality + tool calling (467MB)
    contextSize: 1024,  // Reduced for faster inference
  });

  // Model is ready when downloaded AND not initializing
  const isReady = cactusLM.isDownloaded && !cactusLM.isDownloading && !cactusLM.isInitializing;

  const downloadModel = useCallback(async () => {
    try {
      setError(null);
      await cactusLM.download({
        onProgress: (progress: number) => {
          console.log(`Download progress: ${Math.round(progress * 100)}%`);
        },
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to download model';
      setError(errorMessage);
      console.error('Download error:', err);
    }
  }, [cactusLM]);

  useEffect(() => {
    if (cactusLM.error) {
      setError(cactusLM.error);
    }
  }, [cactusLM.error]);

  return {
    isDownloaded: cactusLM.isDownloaded ?? false,
    isDownloading: cactusLM.isDownloading ?? false,
    isInitializing: cactusLM.isInitializing ?? false,
    downloadProgress: cactusLM.downloadProgress ?? 0,
    isReady,
    error,
    downloadModel,
  };
}

