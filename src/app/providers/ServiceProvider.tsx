/**
 * Service Provider - Dependency injection for services
 * PRD Section 6.1 - Allows test mocks
 */

import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
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
  // Initialize Cactus LM with LFM 2 700M - optimal balance for mobile:
  // - 467MB download (fast to download)
  // - Fast inference speed
  // - Tool calling support for schedule modifications
  // - Good reasoning for trip Q&A
  // - Lower context = faster + less memory
  const cactusLM = useCactusLM({
    model: 'lfm2-700m', // Best balance: speed + quality + tool calling
    contextSize: 1024,  // Reduced for faster inference on mobile
  });

  // Auto-download and initialize model on first launch
  useEffect(() => {
    async function setupModel() {
      if (!cactusLM.isDownloaded && !cactusLM.isDownloading) {
        console.log('Auto-downloading AI model...');
        await cactusLM.download({
          onProgress: (p: number) => console.log(`Model download: ${Math.round(p * 100)}%`),
        });
      }
    }
    setupModel();
  }, [cactusLM.isDownloaded, cactusLM.isDownloading]);

  // Initialize model after download completes
  useEffect(() => {
    async function initModel() {
      if (cactusLM.isDownloaded && !cactusLM.isInitializing && cactusLM.init) {
        console.log('Initializing AI model...');
        try {
          await cactusLM.init();
          console.log('AI model initialized successfully');
        } catch (err) {
          console.error('Failed to initialize model:', err);
        }
      }
    }
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

