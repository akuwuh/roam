/**
 * Memory Repository - CRUD operations for MemoryChunk entities
 * PRD Phase 1 - Infrastructure Layer
 */

import type { MemoryChunk } from '../../../domain/models';
import type { StorageService } from '../StorageService';

const KEYS = {
  MEMORY_CHUNKS: '@roam_memory_chunks',
};

export class MemoryRepository {
  constructor(private storage: StorageService) {}

  async getChunks(tripId: string): Promise<MemoryChunk[]> {
    const allChunks = await this.storage.get<MemoryChunk[]>(KEYS.MEMORY_CHUNKS);
    return (allChunks ?? []).filter((c) => c.tripId === tripId);
  }

  async getChunk(id: string): Promise<MemoryChunk | null> {
    const allChunks = await this.storage.get<MemoryChunk[]>(KEYS.MEMORY_CHUNKS);
    return (allChunks ?? []).find((c) => c.id === id) ?? null;
  }

  async getChunkBySource(sourceId: string): Promise<MemoryChunk | null> {
    const allChunks = await this.storage.get<MemoryChunk[]>(KEYS.MEMORY_CHUNKS);
    return (allChunks ?? []).find((c) => c.sourceId === sourceId) ?? null;
  }

  async saveChunk(chunk: MemoryChunk): Promise<MemoryChunk> {
    const allChunks = await this.storage.get<MemoryChunk[]>(KEYS.MEMORY_CHUNKS) ?? [];
    const index = allChunks.findIndex((c) => c.id === chunk.id);

    if (index >= 0) {
      allChunks[index] = chunk;
    } else {
      allChunks.push(chunk);
    }

    await this.storage.set(KEYS.MEMORY_CHUNKS, allChunks);
    return chunk;
  }

  async saveChunks(chunks: MemoryChunk[]): Promise<void> {
    const allChunks = await this.storage.get<MemoryChunk[]>(KEYS.MEMORY_CHUNKS) ?? [];

    for (const chunk of chunks) {
      const index = allChunks.findIndex((c) => c.id === chunk.id);
      if (index >= 0) {
        allChunks[index] = chunk;
      } else {
        allChunks.push(chunk);
      }
    }

    await this.storage.set(KEYS.MEMORY_CHUNKS, allChunks);
  }

  async upsertBySource(chunk: MemoryChunk): Promise<MemoryChunk> {
    const allChunks = await this.storage.get<MemoryChunk[]>(KEYS.MEMORY_CHUNKS) ?? [];
    const index = allChunks.findIndex((c) => c.sourceId === chunk.sourceId);

    if (index >= 0) {
      allChunks[index] = { ...chunk, id: allChunks[index].id };
    } else {
      allChunks.push(chunk);
    }

    await this.storage.set(KEYS.MEMORY_CHUNKS, allChunks);
    return chunk;
  }

  async deleteChunk(id: string): Promise<void> {
    const allChunks = await this.storage.get<MemoryChunk[]>(KEYS.MEMORY_CHUNKS) ?? [];
    const filtered = allChunks.filter((c) => c.id !== id);
    await this.storage.set(KEYS.MEMORY_CHUNKS, filtered);
  }

  async deleteChunkBySource(sourceId: string): Promise<void> {
    const allChunks = await this.storage.get<MemoryChunk[]>(KEYS.MEMORY_CHUNKS) ?? [];
    const filtered = allChunks.filter((c) => c.sourceId !== sourceId);
    await this.storage.set(KEYS.MEMORY_CHUNKS, filtered);
  }

  async deleteChunksForTrip(tripId: string): Promise<void> {
    const allChunks = await this.storage.get<MemoryChunk[]>(KEYS.MEMORY_CHUNKS) ?? [];
    const filtered = allChunks.filter((c) => c.tripId !== tripId);
    await this.storage.set(KEYS.MEMORY_CHUNKS, filtered);
  }
}

