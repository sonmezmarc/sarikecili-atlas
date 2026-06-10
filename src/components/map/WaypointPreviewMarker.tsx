'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapStore } from '@/stores/mapStore';
import { useRouteAnimationStore } from '@/stores/routeAnimationStore';

const PREVIEW_SOURCE = 'waypoint-preview';
const PREVIEW_LAYER = 'waypoint-preview-dot';
const PREVIEW_PULSE_LAYER = 'waypoint-preview-pulse';

export default function WaypointPreviewMarker() {
  const mapInstance = useMapStore((s) => s.mapInstance);
  const previewLngLat = useRouteAnimationStore((s) => s.previewWaypointLngLat);
  const previewId = useRouteAnimationStore((s) => s.previewWaypointId);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!mapInstance) return;

    if (!previewLngLat || !previewId) {
      // Remove marker layers if they exist
      [PREVIEW_PULSE_LAYER, PREVIEW_LAYER].forEach((id) => {
        if (mapInstance.getLayer(id)) mapInstance.removeLayer(id);
      });
      if (mapInstance.getSource(PREVIEW_SOURCE)) {
        mapInstance.removeSource(PREVIEW_SOURCE);
      }
      cancelAnimationFrame(animFrameRef.current);
      return;
    }

    // Create source if needed
    if (!mapInstance.getSource(PREVIEW_SOURCE)) {
      mapInstance.addSource(PREVIEW_SOURCE, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: previewLngLat },
            properties: {},
          }],
        },
      });
    } else {
      const source = mapInstance.getSource(PREVIEW_SOURCE) as mapboxgl.GeoJSONSource;
      source.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: previewLngLat },
          properties: {},
        }],
      });
    }

    // Add pulse layer
    if (!mapInstance.getLayer(PREVIEW_PULSE_LAYER)) {
      mapInstance.addLayer({
        id: PREVIEW_PULSE_LAYER,
        type: 'circle',
        source: PREVIEW_SOURCE,
        paint: {
          'circle-radius': 16,
          'circle-color': '#f59e0b',
          'circle-opacity': 0.3,
        },
      });
    }

    // Add dot layer
    if (!mapInstance.getLayer(PREVIEW_LAYER)) {
      mapInstance.addLayer({
        id: PREVIEW_LAYER,
        type: 'circle',
        source: PREVIEW_SOURCE,
        paint: {
          'circle-radius': 8,
          'circle-color': '#f59e0b',
          'circle-opacity': 1,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
    }

    // Animate pulse
    startTimeRef.current = performance.now();
    const animatePulse = (timestamp: number) => {
      if (!mapInstance.getLayer(PREVIEW_PULSE_LAYER)) return;
      const elapsed = (timestamp - startTimeRef.current) / 1000;
      const scale = 1 + 0.5 * Math.sin(elapsed * 3);
      mapInstance.setPaintProperty(PREVIEW_PULSE_LAYER, 'circle-radius', 12 + scale * 8);
      mapInstance.setPaintProperty(PREVIEW_PULSE_LAYER, 'circle-opacity', 0.15 + 0.15 * Math.sin(elapsed * 3));
      animFrameRef.current = requestAnimationFrame(animatePulse);
    };
    animFrameRef.current = requestAnimationFrame(animatePulse);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [mapInstance, previewLngLat, previewId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (mapInstance) {
        [PREVIEW_PULSE_LAYER, PREVIEW_LAYER].forEach((id) => {
          if (mapInstance.getLayer(id)) mapInstance.removeLayer(id);
        });
        if (mapInstance.getSource(PREVIEW_SOURCE)) {
          mapInstance.removeSource(PREVIEW_SOURCE);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
