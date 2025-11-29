/**
 * Place Repository - CRUD operations for Place entities
 * PRD Phase 1 - Infrastructure Layer
 */

import type { Place } from '../../../domain/models';
import type { StorageService } from '../StorageService';

const KEYS = {
  PLACES: '@roam_places',
};

export class PlaceRepository {
  constructor(private storage: StorageService) {}

  async getPlaces(): Promise<Place[]> {
    const places = await this.storage.get<Place[]>(KEYS.PLACES);
    return places ?? [];
  }

  async getPlace(id: string): Promise<Place | null> {
    const places = await this.getPlaces();
    return places.find((p) => p.id === id) ?? null;
  }

  async getPlacesByCity(city: string): Promise<Place[]> {
    const places = await this.getPlaces();
    return places.filter(
      (p) => p.city.toLowerCase() === city.toLowerCase()
    );
  }

  async getPlacesByArea(areaTag: string): Promise<Place[]> {
    const places = await this.getPlaces();
    return places.filter((p) =>
      p.areaTags.some((tag) => tag.toLowerCase() === areaTag.toLowerCase())
    );
  }

  async getNearbyPlaces(placeId: string): Promise<Place[]> {
    const place = await this.getPlace(placeId);
    if (!place) return [];

    const places = await this.getPlaces();
    return places.filter((p) => place.nearPlaceIds.includes(p.id));
  }

  async savePlace(place: Place): Promise<Place> {
    const places = await this.getPlaces();
    const index = places.findIndex((p) => p.id === place.id);

    if (index >= 0) {
      places[index] = place;
    } else {
      places.push(place);
    }

    await this.storage.set(KEYS.PLACES, places);
    return place;
  }

  async savePlaces(newPlaces: Place[]): Promise<void> {
    const places = await this.getPlaces();

    for (const place of newPlaces) {
      const index = places.findIndex((p) => p.id === place.id);
      if (index >= 0) {
        places[index] = place;
      } else {
        places.push(place);
      }
    }

    await this.storage.set(KEYS.PLACES, places);
  }

  async deletePlace(id: string): Promise<void> {
    const places = await this.getPlaces();
    const filtered = places.filter((p) => p.id !== id);
    await this.storage.set(KEYS.PLACES, filtered);
  }
}

