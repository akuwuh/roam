/**
 * Global type definitions
 */

// Navigation types
export type RootStackParamList = {
  TripList: undefined;
  TripCreate: undefined;
  TripTabs: { tripId: string };
  Timeline: { tripId: string };
  Chat: { tripId: string };
  Planner: { tripId: string; dayPlanId?: string };
  TripSettings: { tripId: string };
  AddItem: { tripId: string; dayPlanId: string };
};

// Tab navigation within a trip
export type TripTabsParamList = {
  Timeline: { tripId: string };
  Chat: { tripId: string };
  Settings: { tripId: string };
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

