import { create } from 'zustand';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '@/lib/constants';
import type { BasemapKey } from '@/lib/mapStyles';
import type { Season } from '@/lib/types/nodes';

interface MapState {
  // Camera
  center: [number, number]; // [lng, lat]
  zoom: number;
  bearing: number;
  pitch: number;

  // Basemap
  basemap: BasemapKey;

  // Season filter
  activeSeason: Season;

  // Map instance ref (set after initialization)
  mapInstance: mapboxgl.Map | null;

  // Actions
  setCenter: (center: [number, number]) => void;
  setZoom: (zoom: number) => void;
  setView: (center: [number, number], zoom: number) => void;
  setBasemap: (basemap: BasemapKey) => void;
  setActiveSeason: (season: Season) => void;
  setMapInstance: (map: mapboxgl.Map | null) => void;
  resetView: () => void;
}

export const useMapStore = create<MapState>((set) => ({
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  bearing: 0,
  pitch: 0,
  basemap: 'outdoors',
  activeSeason: 'all',
  mapInstance: null,

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setView: (center, zoom) => set({ center, zoom }),
  setBasemap: (basemap) => set({ basemap }),
  setActiveSeason: (season) => set({ activeSeason: season }),
  setMapInstance: (map) => set({ mapInstance: map }),
  resetView: () => set({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, bearing: 0, pitch: 0 }),
}));
