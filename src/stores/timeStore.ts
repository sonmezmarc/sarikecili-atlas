import { create } from 'zustand';
import type { Season } from '@/lib/types/nodes';

interface TimeState {
  activeSeason: Season;
  setActiveSeason: (season: Season) => void;
}

export const useTimeStore = create<TimeState>((set) => ({
  activeSeason: 'all',
  setActiveSeason: (season) => set({ activeSeason: season }),
}));
