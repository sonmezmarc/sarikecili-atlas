'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSceneStore } from '@/stores/sceneStore';
import { createClient } from '@/lib/supabase/client';
import SplashScreen from '@/components/public/SplashScreen';
import MapStage from '@/components/map/MapStage';
import LeftPanel from '@/components/public/LeftPanel';
import RightPanel from '@/components/public/RightPanel';
import Breadcrumb from '@/components/public/Breadcrumb';
import DiscoverOverlay from '@/components/public/DiscoverOverlay';
import TimeNavigator from '@/components/map/TimeNavigator';
import RouteAnimator from '@/components/map/RouteAnimator';
import JourneyButton from '@/components/map/JourneyButton';
import WaypointPopup from '@/components/map/WaypointPopup';
import WaypointPreviewMarker from '@/components/map/WaypointPreviewMarker';
import type { AtlasNode } from '@/lib/types/nodes';

export default function HomePage() {
  const { splashDone } = useSceneStore();
  const [nodes, setNodes] = useState<AtlasNode[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('nodes')
      .select('*')
      .in('type', ['anchor', 'route', 'annotation'])
      .then(({ data }) => {
        if (data) setNodes(data);
      });
  }, []);

  return (
    <main className="relative w-full h-screen overflow-hidden bg-stone-900">
      {/* Splash Screen */}
      <SplashScreen />

      {/* Map + UI — appears after splash */}
      {splashDone && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1], // custom ease-out
          }}
        >
          {/* Map (center) */}
          <MapStage nodes={nodes} />

          {/* Route Animation Engine */}
          <RouteAnimator nodes={nodes} />

          {/* Waypoint Popup Overlay */}
          <WaypointPopup />

          {/* Waypoint Preview Marker (editor) */}
          <WaypointPreviewMarker />

          {/* Journey Control Button */}
          <JourneyButton nodes={nodes} />

          {/* Left Panel */}
          <LeftPanel />

          {/* Right Panel */}
          <RightPanel />

          {/* Breadcrumb */}
          <Breadcrumb />

          {/* Time Navigator */}
          <TimeNavigator />

          {/* Discover Overlay */}
          <DiscoverOverlay />
        </motion.div>
      )}
    </main>
  );
}
