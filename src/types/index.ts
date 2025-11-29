/**
 * Global type definitions
 */

// Navigation types
export type RootStackParamList = {
  TripList: undefined;
  TripCreate: undefined;
  TripDetails: { tripId: string };
  Timeline: { tripId: string };
  Chat: { tripId: string };
  Planner: { tripId: string; dayPlanId?: string };
};

// Chat message types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Network status
export type NetworkStatus = 'online' | 'offline' | 'unknown';

// Completion result from Cactus
export interface CompletionResult {
  response: string;
  totalTokens?: number;
  tokensPerSecond?: number;
}

// Planner request types
export interface PlannerRequest {
  city: string;
  date: string;
  timeRanges: TimeRange[];
  interests: string[];
}

export interface TimeRange {
  start: string; // HH:mm format
  end: string;
}

// Search result types
export interface MemorySearchResult {
  chunk: import('../domain/models').MemoryChunk;
  similarity: number;
}

