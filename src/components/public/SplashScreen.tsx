'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSceneStore } from '@/stores/sceneStore';
import { SPLASH_DISPLAY_MS, SPLASH_DISSOLVE_MS } from '@/lib/constants';

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const { splashDone, setSplashDone } = useSceneStore();

  useEffect(() => {
    if (splashDone) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setVisible(false);
    }, SPLASH_DISPLAY_MS);

    return () => clearTimeout(timer);
  }, [splashDone]);

  const handleAnimationComplete = () => {
    if (!visible) {
      setSplashDone(true);
    }
  };

  return (
    <AnimatePresence onExitComplete={handleAnimationComplete}>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-stone-900"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: SPLASH_DISSOLVE_MS / 1000, ease: 'easeInOut' }}
        >
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: 'url(/splash/placeholder.jpg)',
              filter: 'brightness(0.6)',
            }}
          />

          {/* Title overlay */}
          <motion.div
            className="relative z-10 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
          >
            <h1 className="text-5xl md:text-7xl font-light tracking-widest text-white mb-4">
              SARIKEÇİLİ
            </h1>
            <div className="w-24 h-[1px] bg-white/60 mx-auto mb-4" />
            <p className="text-lg md:text-xl text-white/80 font-light tracking-[0.3em] uppercase">
              Dijital Kültürel Harita
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
