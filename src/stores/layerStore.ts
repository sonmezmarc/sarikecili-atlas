import { create } from 'zustand';
import type { Layer } from '@/lib/types/layers';

interface LayerState {
  layers: Layer[];
  visibilityMap: Record<string, boolean>;

  setLayers: (layers: Layer[]) => void;
  toggleLayer: (layerId: string) => void;
  setLayerVisibility: (layerId: string, visible: boolean) => void;
  isLayerVisible: (layerId: string) => boolean;
}

export const useLayerStore = create<LayerState>((set, get) => ({
  layers: [],
  visibilityMap: {},

  setLayers: (layers) => {
    const visibilityMap: Record<string, boolean> = {};
    layers.forEach((l) => {
      visibilityMap[l.id] = l.visibility_default;
    });
    set({ layers, visibilityMap });
  },

  toggleLayer: (layerId) =>
    set((state) => ({
      visibilityMap: {
        ...state.visibilityMap,
        [layerId]: !state.visibilityMap[layerId],
      },
    })),

  setLayerVisibility: (layerId, visible) =>
    set((state) => ({
      visibilityMap: { ...state.visibilityMap, [layerId]: visible },
    })),

  isLayerVisible: (layerId) => get().visibilityMap[layerId] ?? true,
}));
