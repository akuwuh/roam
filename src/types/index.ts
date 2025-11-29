/**
 * Global type definitions
 */

// Root stack navigation (wraps tabs + trip screens)
export type RootStackParamList = {
  MainTabs: undefined;
  TripDetail: { tripId: string };
  Chat: { tripId: string };
  TripSettings: { tripId: string };
};

// Global bottom tabs
export type RootTabsParamList = {
  Home: undefined;
  Trips: undefined;
  Explore: undefined;
  Profile: undefined;
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

