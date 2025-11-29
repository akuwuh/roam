/**
 * Memory and embedding domain models
 * PRD Phase 1, Section 4.1 - Memory chunks for RAG
 */

export type MemorySourceType = 'item' | 'day_summary' | 'knowledge';

export interface MemoryChunk {
  id: string;
  tripId: string;
  sourceId: string; // TripItem or DayPlan ID
  sourceType: MemorySourceType;
  text: string; // Canonical sentence
  embedding: number[]; // Vector from Cactus embed()
  createdAt: number;
}

export type LogisticsRelation =
  | 'BEFORE'
  | 'AFTER'
  | 'WITHIN_DAY'
  | 'NEAR'
  | 'SAME_AREA';

export interface LogisticsEdge {
  fromId: string;
  toId: string;
  relation: LogisticsRelation;
}

export interface LogisticsGraph {
  edges: LogisticsEdge[];
  nodeIds: Set<string>;
}

// Factory functions
export function createMemoryChunk(params: {
  tripId: string;
  sourceId: string;
  sourceType: MemorySourceType;
  text: string;
  embedding: number[];
}): MemoryChunk {
  return {
    id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    tripId: params.tripId,
    sourceId: params.sourceId,
    sourceType: params.sourceType,
    text: params.text,
    embedding: params.embedding,
    createdAt: Date.now(),
  };
}

export function createLogisticsEdge(
  fromId: string,
  toId: string,
  relation: LogisticsRelation
): LogisticsEdge {
  return { fromId, toId, relation };
}

export function createEmptyGraph(): LogisticsGraph {
  return {
    edges: [],
    nodeIds: new Set(),
  };
}

