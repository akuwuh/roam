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

export function ServiceProvider({ children }: ServiceProviderProps) {
  // Initialize Cactus LM
  const cactusLM = useCactusLM({
    contextSize: 2048,
  });

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
      if (cactusLM.isDownloaded && !cactusLM.isInitializing && cactusLM.init) {
        console.log('Initializing Cactus model...');
        try {
          await cactusLM.init();
          console.log('Cactus model initialized - ready for inference!');
        } catch (err) {
          console.error('Failed to initialize model:', err);
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

