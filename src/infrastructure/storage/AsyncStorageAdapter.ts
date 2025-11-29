/**
 * AsyncStorage implementation of StorageService
 * PRD Phase 1 - Infrastructure Layer
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StorageService } from './StorageService';

export class AsyncStorageAdapter implements StorageService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Failed to get ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to set ${key}:`, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
      throw error;
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      return await AsyncStorage.getAllKeys() as string[];
    } catch (error) {
      console.error('Failed to get all keys:', error);
      return [];
    }
  }
}

// Singleton instance for convenience
export const asyncStorageAdapter = new AsyncStorageAdapter();

