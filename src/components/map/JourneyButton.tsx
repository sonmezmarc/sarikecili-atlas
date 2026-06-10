'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouteAnimationStore, type JourneyDirection } from '@/stores/routeAnimationStore';
import { useSceneStore } from '@/stores/sceneStore';
import type { AtlasNode, RouteProperties } from '@/lib/types/nodes';

interface JourneyButtonProps {
  nodes: AtlasNode[];
}

const phaseLabels: Record<string, string> = {
  intro: 'Hazirlanıyor...',
  traveling: 'Yolda...',
  paused_at_stop: 'Konalga',
  outro: 'Son...',
};

export default function JourneyButton({ nodes }: JourneyButtonProps) {
  const {
    isPlaying,
    isPaused,
    phase,
    progress,
    direction,
    startJourney,
    stopJourney,
    pauseJourney,
    resumeJourney,
    continueFromStop,
  } = useRouteAnimationStore();

  const { setRightPanelOpen } = useSceneStore();
  const [selectedDirection, setSelectedDirection] = useState<JourneyDirection>('forward');

  // Find route nodes with journey enabled
  const journeyRoutes = nodes.filter((n) => {
    if (n.type !== 'route') return false;
    const props = n.properties as unknown as RouteProperties;
    return props.journey?.enabled && props.geojson_data;
  });

  if (journeyRoutes.length === 0) return null;

  const handleStart = () => {
    const route = journeyRoutes[0]; // First journey-enabled route
    startJourney(route.id, selectedDirection);
  };

  // Idle state — show "Gocu Izle" button with direction toggle
  if (!isPlaying) {
    return (
      <motion.div
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        {/* Direction toggle */}
        <button
          onClick={() => setSelectedDirection(selectedDirection === 'forward' ? 'backward' : 'forward')}
          className="px-3 py-3 rounded-full text-xs font-medium text-white/80 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-colors"
          title={selectedDirection === 'forward' ? 'Ileri yön' : 'Geri yön'}
        >
          {selectedDirection === 'forward' ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M12 7H2M6 3L2 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Main button */}
        <button
          onClick={handleStart}
          className="relative px-8 py-3 rounded-full text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          }}
        >
          {/* Pulse ring animation */}
          <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }} />
          <span className="relative z-10">Gocu Izle</span>
        </button>
      </motion.div>
    );
  }

  // Playing state — control bar
  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30"
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/90 backdrop-blur-sm shadow-xl border border-stone-200/60">
          {/* Direction indicator */}
          <span className="text-[10px] text-stone-400">
            {direction === 'forward' ? '\u2192' : '\u2190'}
          </span>

          {/* Progress bar */}
          <div className="w-32 h-0.5 bg-stone-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #f59e0b, #d97706)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.1, ease: 'linear' }}
            />
          </div>

          {/* Phase label */}
          <span className="text-xs text-stone-500 min-w-[90px] text-center">
            {phaseLabels[phase] || ''}
          </span>

          {/* Devam Et button at every stop */}
          {phase === 'paused_at_stop' ? (
            <button
              onClick={() => {
                setRightPanelOpen(false);
                continueFromStop();
              }}
              className="px-4 py-1.5 rounded-full text-xs font-medium text-white transition-transform hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              Devam Et
            </button>
          ) : (
            <button
              onClick={() => (isPaused ? resumeJourney() : pauseJourney())}
              className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors"
              disabled={phase === 'intro' || phase === 'outro'}
            >
              <motion.svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="text-stone-700"
                animate={{ rotate: isPaused ? 0 : 0 }}
              >
                {isPaused ? (
                  // Play icon
                  <path d="M3 1.5L12 7L3 12.5V1.5Z" fill="currentColor" />
                ) : (
                  // Pause icon
                  <>
                    <rect x="2" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
                    <rect x="8.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" />
                  </>
                )}
              </motion.svg>
            </button>
          )}

          {/* Stop button */}
          <button
            onClick={stopJourney}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors text-stone-500"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
