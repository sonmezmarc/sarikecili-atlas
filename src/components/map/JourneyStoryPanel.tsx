'use client';

import { motion } from 'framer-motion';
import { useRouteAnimationStore } from '@/stores/routeAnimationStore';
import { useSceneStore } from '@/stores/sceneStore';

export default function JourneyStoryPanel() {
  const { activeWaypoint, travelerLngLat, continueFromStop } = useRouteAnimationStore();
  const { setRightPanelOpen } = useSceneStore();

  if (!activeWaypoint) return null;

  const handleContinue = () => {
    setRightPanelOpen(false);
    continueFromStop();
  };

  const imageUrl = activeWaypoint.image_url || '/images/konalga-placeholder.jpg';

  return (
    <div className="flex flex-col h-full">
      {/* Photo section */}
      <div className="relative w-full h-48 overflow-hidden shrink-0">
        <motion.img
          src={imageUrl}
          alt={activeWaypoint.label}
          className="w-full h-full object-cover"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="200"%3E%3Crect fill="%23e7e5e4" width="400" height="200"/%3E%3Ctext x="200" y="100" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="14" fill="%2378716c"%3EKonalga%3C/text%3E%3C/svg%3E';
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />
      </div>

      {/* Content section */}
      <div className="flex-1 px-5 pb-5 -mt-4 relative z-10 overflow-y-auto">
        {/* Title */}
        <h2 className="text-xl font-serif font-semibold text-stone-900 mb-1">
          {activeWaypoint.label}
        </h2>

        {/* Subtitle */}
        <p className="text-xs text-amber-600 font-medium tracking-wide uppercase mb-4">
          Konalga — Bahar Gocu
        </p>

        {/* Description */}
        <div className="prose prose-sm prose-stone max-w-none mb-4">
          <p className="text-sm text-stone-600 leading-relaxed">
            {activeWaypoint.description}
          </p>
        </div>

        {/* Location info */}
        {travelerLngLat && (
          <div className="flex items-center gap-2 text-[10px] text-stone-400 font-mono mb-6 px-3 py-2 rounded-md bg-stone-50 border border-stone-100">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-stone-400 shrink-0">
              <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1" />
              <circle cx="5" cy="5" r="1.5" fill="currentColor" />
            </svg>
            <span>{travelerLngLat[1].toFixed(5)}, {travelerLngLat[0].toFixed(5)}</span>
          </div>
        )}

        {/* Continue button (only for manual waypoints) */}
        {activeWaypoint.pause_ms === 0 && (
          <button
            onClick={handleContinue}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            Yolculuga Devam Et
          </button>
        )}
      </div>
    </div>
  );
}
