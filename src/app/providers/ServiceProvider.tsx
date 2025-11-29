/**
 * Service Provider - Dependency injection for services
 * PRD Section 6.1 - Allows test mocks
 */

import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { useCactusLM } from 'cactus-react-native';
import {
  TripRepository,
  PlaceRepository,
  MemoryRepository,
  asyncStorageAdapter,
} from '../../infrastructure/storage';
import { CactusServiceImpl, type CactusService } from '../../infrastructure/cactus';
import { MemoryStore } from '../../infrastructure/memory';
import { CloudPlannerApi } from '../../infrastructure/network';

export interface Services {
  tripRepository: TripRepository;
  placeRepository: PlaceRepository;
  memoryRepository: MemoryRepository;
  cactusService: CactusService;
  memoryStore: MemoryStore;
  cloudPlannerApi: CloudPlannerApi;
}

const ServiceContext = createContext<Services | null>(null);

export function useServices(): Services {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServices must be used within a ServiceProvider');
  }
  return context;
}

interface ServiceProviderProps {
  children: React.ReactNode;
}

// Create a singleton CactusLM instance outside of React
let cactusInstance: any = null;

export function ServiceProvider({ children }: ServiceProviderProps) {
  // Use Gemma 3 1B - Google's model with excellent instruction following
  const cactusLM = useCactusLM({
    model: 'gemma3-1b',
    contextSize: 4096,
  });

  // Only log once when instance changes
  useEffect(() => {
    console.log('🤖 Cactus LM hook ready:', {
      isDownloaded: cactusLM.isDownloaded,
      isGenerating: cactusLM.isGenerating,
    });
  }, [cactusLM.isDownloaded]);
  
  // List available models
  useEffect(() => {
    const listModels = async () => {
      try {
        console.log('📋 Fetching available models from Cactus...');
        const { CactusLM } = require('cactus-react-native');
        const tempLM = new CactusLM();
        const models = await tempLM.getModels();
        
        console.log('📋 Available models:');
        models.forEach((model: any, idx: number) => {
          console.log(`  ${idx + 1}. ${model.slug} (${model.sizeMb}MB) - ${model.name}`);
        });
        
        // Cleanup
        await tempLM.destroy();
      } catch (err) {
        console.error('❌ Could not fetch models:', err);
      }
    };
    
    listModels();
  }, []);

  // Auto-download model on first load
  useEffect(() => {
    const autoDownloadModel = async () => {
      if (!cactusLM.isDownloaded && !cactusLM.isDownloading) {
        console.log('Auto-downloading Cactus model...');
        try {
          await cactusLM.download({
            onProgress: (progress: number) => {
              console.log(`Model download progress: ${Math.round(progress * 100)}%`);
            },
          });
          console.log('Cactus model downloaded successfully');
        } catch (err) {
          console.error('Failed to auto-download model:', err);
        }
      }
    };

    autoDownloadModel();
  }, [cactusLM]);

  // Initialize model after download (loads into memory for inference)
  useEffect(() => {
    const initModel = async () => {
      console.log('🔧 Model Status Check:', {
        isDownloaded: cactusLM.isDownloaded,
        isDownloading: cactusLM.isDownloading,
        isInitializing: cactusLM.isInitializing,
        hasInit: !!cactusLM.init,
        hasEmbed: !!cactusLM.embed,
        hasComplete: !!cactusLM.complete,
      });

      if (cactusLM.isDownloaded && !cactusLM.isInitializing && cactusLM.init) {
        console.log('🚀 Initializing Cactus model...');
        try {
          await cactusLM.init();
          console.log('✅ Cactus model initialized - ready for inference!');
          console.log('📊 Model info:', {
            modelName: cactusLM.modelName || 'Unknown',
            contextSize: cactusLM.contextSize || 'Unknown',
          });
        } catch (err) {
          console.error('❌ Failed to initialize model:', err);
        }
      }
    };

    initModel();
  }, [cactusLM.isDownloaded, cactusLM.isInitializing]);

  // Create services with memoization
  const services = useMemo<Services>(() => {
    // Storage repositories
    const tripRepository = new TripRepository(asyncStorageAdapter);
    const placeRepository = new PlaceRepository(asyncStorageAdapter);
    const memoryRepository = new MemoryRepository(asyncStorageAdapter);

    // Cactus service
    const cactusService = new CactusServiceImpl(cactusLM);

    // Memory store (depends on memory repository and cactus service)
    const memoryStore = new MemoryStore(memoryRepository, cactusService);

    // Cloud planner
    const cloudPlannerApi = new CloudPlannerApi();

    return {
      tripRepository,
      placeRepository,
      memoryRepository,
      cactusService,
      memoryStore,
      cloudPlannerApi,
    };
  }, [cactusLM]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      services.cactusService.destroy();
    };
  }, [services]);

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
}

