'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useSceneStore } from '@/stores/sceneStore';
import { useRouteAnimationStore } from '@/stores/routeAnimationStore';
import JourneyStoryPanel from '@/components/map/JourneyStoryPanel';

export default function RightPanel() {
  const { rightPanelOpen, rightPanelWidth, setRightPanelOpen, navigationStack } =
    useSceneStore();
  const journeyPhase = useRouteAnimationStore((s) => s.phase);
  const isJourneyStop = journeyPhase === 'paused_at_stop';

  return (
    <AnimatePresence>
      {rightPanelOpen && (
        <motion.aside
          initial={{ x: rightPanelWidth, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: rightPanelWidth, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 bottom-0 bg-white/95 backdrop-blur-sm shadow-2xl z-40 flex flex-col overflow-hidden"
          style={{ width: rightPanelWidth }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
            <div className="flex-1 min-w-0">
              {isJourneyStop ? (
                <p className="text-sm font-medium text-amber-700 truncate">
                  Goc Yolculugu
                </p>
              ) : (
                navigationStack.length > 0 && (
                  <p className="text-sm font-medium text-stone-800 truncate">
                    {navigationStack[navigationStack.length - 1].label}
                  </p>
                )
              )}
            </div>
            <button
              onClick={() => setRightPanelOpen(false)}
              className="ml-3 p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
              aria-label="Paneli kapat"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto">
            {isJourneyStop ? (
              <JourneyStoryPanel />
            ) : (
              <div className="px-5 py-4">
                <div className="text-sm text-stone-400 italic">
                  Kesfetmek icin haritada bir nokta secin
                </div>
              </div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
