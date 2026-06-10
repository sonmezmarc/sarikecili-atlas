'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSceneStore } from '@/stores/sceneStore';

export default function DiscoverOverlay() {
  const { discoverOpen, setDiscoverOpen } = useSceneStore();

  const handleClose = useCallback(() => {
    setDiscoverOpen(false);
  }, [setDiscoverOpen]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && discoverOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [discoverOpen, handleClose]);

  return (
    <AnimatePresence>
      {discoverOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleClose}
          />

          {/* Content */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-8 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="relative bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto pointer-events-auto"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Close hint */}
              <div className="absolute top-4 right-4">
                <button
                  onClick={handleClose}
                  className="text-stone-400 hover:text-stone-700 text-sm flex items-center gap-1 transition-colors"
                >
                  <span>ESC</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-10 md:p-14">
                <h2 className="text-3xl md:text-4xl font-light text-stone-800 tracking-wide mb-2">
                  Göç &amp; Sarıkeçililer
                </h2>
                <div className="w-16 h-[2px] bg-amber-600 mb-8" />

                <div className="prose prose-stone prose-lg max-w-none">
                  <p>
                    Sarıkeçili Yörükleri, Anadolu&apos;daki son göçer topluluklarından biridir.
                    Yüzyıllardır iklim, mera ve gelenek tarafından belirlenen bir ritimle
                    Toroslar ile Akdeniz kıyısı arasında göç etmektedirler.
                  </p>
                  <p>
                    Bu dijital kültürel harita onların dünyasını haritalandırmaktadır — soğuk
                    ayların geçirildiği kışlaklar, sürülerin yayla çayırlarında otladığı
                    yaylalar ve bunları birbirine bağlayan kadim yollar. Coğrafyanın ötesinde,
                    kültürlerini tanımlayan somut ve somut olmayan mirası belgelemektedir:
                    karaçadır, göç ritüelleri, iklim ile yaşam biçimi arasındaki ilişki.
                  </p>
                  <p>
                    Özgürce keşfedin. Yerleşim yerlerine tıklayın, göç rotalarını takip edin,
                    yaşam alanlarının 3B taramalarına girin ve bu coğrafyaya gömülü hikayeleri
                    keşfedin.
                  </p>
                </div>

                <div className="mt-10 flex items-center gap-4">
                  <button
                    onClick={handleClose}
                    className="px-6 py-3 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium tracking-wider uppercase rounded transition-colors"
                  >
                    Keşfe Başla
                  </button>
                  <span className="text-xs text-stone-400">
                    veya kapatmak için ESC tuşuna basın
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
