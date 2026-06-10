'use client';

import { useTimeStore } from '@/stores/timeStore';
import { SEASONS } from '@/lib/constants';
import type { Season } from '@/lib/types/nodes';

const SEASON_COLORS: Record<Season, string> = {
  all: '#94a3b8',
  winter: '#60a5fa',
  spring_migration: '#4ade80',
  summer: '#fbbf24',
  autumn_migration: '#f97316',
};

export default function TimeNavigator() {
  const { activeSeason, setActiveSeason } = useTimeStore();

  return (
    <div className="fixed top-4 right-4 z-30 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3">
      <p className="text-[10px] text-stone-400 uppercase tracking-wider text-center mb-2 font-medium">
        Mevsim
      </p>
      <div className="flex gap-1">
        {SEASONS.map((s) => {
          const isActive = activeSeason === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveSeason(s.key)}
              title={`${s.label}${s.months ? ` (${s.months})` : ''}`}
              className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? 'ring-2 ring-offset-1 scale-110'
                  : 'opacity-60 hover:opacity-100 hover:scale-105'
              }`}
              style={{
                backgroundColor: isActive ? SEASON_COLORS[s.key] : `${SEASON_COLORS[s.key]}40`,
                outlineColor: isActive ? SEASON_COLORS[s.key] : undefined,
                outline: isActive ? `2px solid ${SEASON_COLORS[s.key]}` : undefined,
                outlineOffset: '2px',
              }}
            >
              <span className="text-xs font-bold text-white drop-shadow-sm">
                {s.key === 'all'
                  ? '∞'
                  : s.key === 'winter'
                  ? 'K'
                  : s.key === 'spring_migration'
                  ? 'BG'
                  : s.key === 'summer'
                  ? 'Y'
                  : 'GG'}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-stone-500 text-center mt-1.5 font-medium">
        {SEASONS.find((s) => s.key === activeSeason)?.label}
      </p>
    </div>
  );
}
