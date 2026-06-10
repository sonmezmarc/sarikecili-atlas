'use client';

import { useRef, useEffect, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapStore } from '@/stores/mapStore';
import { BASEMAP_STYLES } from '@/lib/mapStyles';
import MapNodeLayers from '@/components/map/MapNodeLayers';
import type { AtlasNode } from '@/lib/types/nodes';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapStageProps {
  nodes?: AtlasNode[];
}

export default function MapStage({ nodes = [] }: MapStageProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { center, zoom, basemap, setCenter, setZoom, setMapInstance } = useMapStore();

  const initializeMap = useCallback(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: BASEMAP_STYLES[basemap],
      center: center,
      zoom: zoom,
      attributionControl: false,
      antialias: true,
    });

    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      'bottom-right'
    );

    map.addControl(new mapboxgl.NavigationControl({ showCompass: true }), 'bottom-right');
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 150 }), 'bottom-left');

    map.on('moveend', () => {
      const c = map.getCenter();
      setCenter([c.lng, c.lat]);
      setZoom(map.getZoom());
    });

    map.on('load', () => {
      setMapInstance(map);
    });

    mapRef.current = map;
  }, [basemap, center, zoom, setCenter, setZoom, setMapInstance]);

  useEffect(() => {
    initializeMap();

    return () => {
      if (mapRef.current) {
        setMapInstance(null);
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // Only init once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Basemap change
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(BASEMAP_STYLES[basemap]);
  }, [basemap]);

  return (
    <>
      <div
        ref={mapContainer}
        className="absolute inset-0 w-full h-full"
        style={{ minHeight: '100vh' }}
      />
      <MapNodeLayers nodes={nodes} />
    </>
  );
}
