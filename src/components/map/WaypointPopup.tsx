'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouteAnimationStore } from '@/stores/routeAnimationStore';
import { useMapStore } from '@/stores/mapStore';
import { useEffect, useState } from 'react';

export default function WaypointPopup() {
  const { phase, activeWaypoint, travelerLngLat } = useRouteAnimationStore();
  const mapInstance = useMapStore((s) => s.mapInstance);
  const [screenPos, setScreenPos] = useState<{ x: number; y: number } | null>(null);

  const showPopup = phase === 'paused_at_stop' && activeWaypoint?.show_popup && travelerLngLat;

  // Project LngLat to screen coordinates
  useEffect(() => {
    if (!showPopup || !mapInstance || !travelerLngLat) {
      setScreenPos(null);
      return;
    }

    const updatePosition = () => {
      const point = mapInstance.project(travelerLngLat);
      setScreenPos({ x: point.x, y: point.y });
    };

    updatePosition();
    mapInstance.on('move', updatePosition);
    return () => {
      mapInstance.off('move', updatePosition);
    };
  }, [showPopup, mapInstance, travelerLngLat]);

  return (
    <AnimatePresence>
      {showPopup && screenPos && activeWaypoint && (
        <motion.div
          className="fixed z-30 pointer-events-none"
          style={{
            left: screenPos.x,
            top: screenPos.y - 60,
            transform: 'translate(-50%, -100%)',
          }}
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        >
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/90 backdrop-blur-sm shadow-lg border border-stone-200/60">
            {/* Waypoint icon */}
            <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <circle cx="5" cy="5" r="3" fill="white" />
              </svg>
            </div>
            <span className="text-xs font-medium text-stone-800 whitespace-nowrap">
              {activeWaypoint.label}
            </span>
          </div>
          {/* Arrow pointing down */}
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-white/90 rotate-45 -mt-1 border-r border-b border-stone-200/60" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
