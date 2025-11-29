/**
 * Storage service interface for dependency injection
 * PRD Phase 1 - Infrastructure Layer
 */

export interface StorageService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

