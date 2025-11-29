/**
 * Memory Store - Vector storage and similarity search
 * PRD Phase 1, Section 4.1 - Memory Master track
 */

import type { MemoryChunk, TripItem, Place } from '../../domain/models';
import { createMemoryChunk } from '../../domain/models';
import type { MemoryRepository } from '../storage/repositories/MemoryRepository';
import type { CactusService } from '../cactus/CactusService';
import { cosineSimilarity, findTopK } from './cosineSimilarity';
import { canonicalizeTripItem } from './canonicalize';

export interface MemorySearchResult {
  chunk: MemoryChunk;
  similarity: number;
}

export class MemoryStore {
  constructor(
    private memoryRepository: MemoryRepository,
    private cactusService: CactusService
  ) {}

  /**
   * Index a trip item into the memory store
   * Creates embedding and stores as MemoryChunk
   */
  async indexItem(item: TripItem, place?: Place): Promise<MemoryChunk> {
    const text = canonicalizeTripItem(item, place);
    const embedding = await this.cactusService.embed(text);

    const chunk = createMemoryChunk({
      tripId: item.tripId,
      sourceId: item.id,
      sourceType: 'item',
      text,
      embedding,
    });

    await this.memoryRepository.upsertBySource(chunk);
    return chunk;
  }

  /**
   * Index multiple items at once
   */
  async indexItems(
    items: TripItem[],
    getPlace?: (placeId: string) => Promise<Place | null>
  ): Promise<MemoryChunk[]> {
    const chunks: MemoryChunk[] = [];

    for (const item of items) {
      const place = item.placeId && getPlace
        ? await getPlace(item.placeId)
        : undefined;
      const chunk = await this.indexItem(item, place ?? undefined);
      chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Search for similar memory chunks
   * PRD Section 7.1 - Semantic search for Q&A
   */
  async search(
    tripId: string,
    query: string,
    topK: number = 5
  ): Promise<MemorySearchResult[]> {
    // Embed the query
    const queryEmbedding = await this.cactusService.embed(query);

    // Get all chunks for this trip
    const chunks = await this.memoryRepository.getChunks(tripId);

    if (chunks.length === 0) {
      return [];
    }

    // Find top-k similar chunks
    const results = findTopK(queryEmbedding, chunks, topK);

    return results.map(({ item, similarity }) => ({
      chunk: item,
      similarity,
    }));
  }

  /**
   * Search using a pre-computed embedding
   */
  async searchByEmbedding(
    tripId: string,
    queryEmbedding: number[],
    topK: number = 5
  ): Promise<MemorySearchResult[]> {
    const chunks = await this.memoryRepository.getChunks(tripId);

    if (chunks.length === 0) {
      return [];
    }

    const results = findTopK(queryEmbedding, chunks, topK);

    return results.map(({ item, similarity }) => ({
      chunk: item,
      similarity,
    }));
  }

  /**
   * Remove a memory chunk by source ID
   */
  async removeBySource(sourceId: string): Promise<void> {
    await this.memoryRepository.deleteChunkBySource(sourceId);
  }

  /**
   * Remove all memory chunks for a trip
   */
  async removeTrip(tripId: string): Promise<void> {
    await this.memoryRepository.deleteChunksForTrip(tripId);
  }

  /**
   * Re-index an item (used after modifications)
   */
  async reindexItem(item: TripItem, place?: Place): Promise<MemoryChunk> {
    return this.indexItem(item, place);
  }

  /**
   * Index knowledge context for a trip
   * Used when cloud planner generates contextual information
   */
  async indexKnowledge(
    tripId: string,
    knowledgeTexts: string[]
  ): Promise<MemoryChunk[]> {
    const chunks: MemoryChunk[] = [];

    for (let i = 0; i < knowledgeTexts.length; i++) {
      const text = knowledgeTexts[i];
      if (!text.trim()) continue;

      try {
        const embedding = await this.cactusService.embed(text);
        const chunk = createMemoryChunk({
          tripId,
          sourceId: `knowledge_${Date.now()}_${i}`,
          sourceType: 'knowledge',
          text,
          embedding,
        });

        await this.memoryRepository.upsertBySource(chunk);
        chunks.push(chunk);
      } catch (err) {
        console.warn('Failed to index knowledge chunk:', err);
      }
    }

    return chunks;
  }

  /**
   * Get knowledge base status for a trip
   */
  async getKnowledgeBaseStatus(tripId: string): Promise<{
    itemCount: number;
    knowledgeCount: number;
    totalCount: number;
  }> {
    const chunks = await this.memoryRepository.getChunks(tripId);
    const itemCount = chunks.filter(c => c.sourceType === 'item').length;
    const knowledgeCount = chunks.filter(c => c.sourceType === 'knowledge').length;
    
    return {
      itemCount,
      knowledgeCount,
      totalCount: chunks.length,
    };
  }
}

