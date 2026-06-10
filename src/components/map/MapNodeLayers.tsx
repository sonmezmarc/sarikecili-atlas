'use client';
import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapStore } from '@/stores/mapStore';
import { useSceneStore } from '@/stores/sceneStore';
import { useRouteAnimationStore } from '@/stores/routeAnimationStore';
import { createMarkerElement } from '@/lib/mapMarkers';
import type { AtlasNode, AnchorProperties, RouteProperties, AnnotationNodeProperties } from '@/lib/types/nodes';

interface MapNodeLayersProps {
  nodes: AtlasNode[];
}

export default function MapNodeLayers({ nodes }: MapNodeLayersProps) {
  const { mapInstance, activeSeason } = useMapStore();
  const { openScene } = useSceneStore();
  const { isPlaying, activeRouteId } = useRouteAnimationStore();
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const sourceLayersRef = useRef<Set<string>>(new Set());

  const shouldShowNode = useCallback((node: AtlasNode) => {
    // Check map_visible flag (default true)
    const props = node.properties as Record<string, unknown>;
    if (props.map_visible === false) return false;

    // Check season filter
    if (activeSeason === 'all') return true;
    return node.seasons.includes(activeSeason) || node.seasons.includes('all');
  }, [activeSeason]);

  useEffect(() => {
    if (!mapInstance || !mapInstance.isStyleLoaded()) return;

    // Cleanup previous markers and layers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    sourceLayersRef.current.forEach(id => {
      if (mapInstance.getLayer(`${id}-layer`)) {
        mapInstance.removeLayer(`${id}-layer`);
      }
      if (mapInstance.getSource(id)) {
        mapInstance.removeSource(id);
      }
    });
    sourceLayersRef.current.clear();

    // Render anchors
    const anchors = nodes.filter(n => n.type === 'anchor');
    anchors.forEach(node => {
      if (!shouldShowNode(node)) return;

      const props = node.properties as unknown as AnchorProperties;
      const markerEl = createMarkerElement(
        props.icon_style || 'custom',
        props.marker_size || 'md',
        node.label
      );

      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([props.lng, props.lat])
        .addTo(mapInstance);

      // Popup — use setText to prevent XSS via node labels
      const popup = new mapboxgl.Popup({ offset: 25 })
        .setText(node.label);
      marker.setPopup(popup);

      // Click handler
      markerEl.addEventListener('click', () => {
        openScene(node.id, node.label);
      });

      markersRef.current.push(marker);
    });

    // Render routes
    const routes = nodes.filter(n => n.type === 'route');
    routes.forEach(node => {
      if (!shouldShowNode(node)) return;

      const props = node.properties as unknown as RouteProperties;
      if (!props.geojson_data) return;

      const sourceId = `route-${node.id}`;
      const layerId = `route-layer-${node.id}`;

      if (!mapInstance.getSource(sourceId)) {
        mapInstance.addSource(sourceId, {
          type: 'geojson',
          data: props.geojson_data as GeoJSON.GeoJSON,
        });
      }

      // Determine opacity: hide ALL routes during journey playback
      const opacity = isPlaying ? 0 : 0.8;

      if (!mapInstance.getLayer(layerId)) {
        mapInstance.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': props.color || '#ef4444',
            'line-width': props.width || 3,
            'line-opacity': opacity,
          },
        });
      }

      sourceLayersRef.current.add(sourceId);
    });

    // Render annotations (boundaries)
    const annotations = nodes.filter(n => n.type === 'annotation');
    annotations.forEach(node => {
      if (!shouldShowNode(node)) return;

      const props = node.properties as unknown as AnnotationNodeProperties;
      if (!props.geometry_type || props.geometry_type === 'point') return;

      // For simplicity, we assume geojson_data exists in properties
      const geojsonData = (node.properties as Record<string, unknown>).geojson_data;
      if (!geojsonData) return;

      const sourceId = `annotation-${node.id}`;
      const layerId = `annotation-layer-${node.id}`;

      if (!mapInstance.getSource(sourceId)) {
        mapInstance.addSource(sourceId, {
          type: 'geojson',
          data: geojsonData as GeoJSON.GeoJSON,
        });
      }

      if (!mapInstance.getLayer(layerId)) {
        mapInstance.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {},
          paint: {
            'line-color': props.color || '#64748b',
            'line-width': props.stroke_width || 1,
            'line-opacity': 0.6,
          },
        });
      }

      sourceLayersRef.current.add(sourceId);
    });

    // Cleanup on unmount — capture refs to avoid stale closure warning
    const currentMarkers = markersRef.current;
    const currentSourceLayers = sourceLayersRef.current;

    return () => {
      currentMarkers.forEach(marker => marker.remove());
      markersRef.current = [];

      currentSourceLayers.forEach(id => {
        if (mapInstance.getLayer(`${id}-layer`)) {
          mapInstance.removeLayer(`${id}-layer`);
        }
        if (mapInstance.getSource(id)) {
          mapInstance.removeSource(id);
        }
      });
      currentSourceLayers.clear();
    };
  }, [mapInstance, nodes, activeSeason, shouldShowNode, openScene, isPlaying, activeRouteId]);

  // Update route layer opacity when journey starts/stops
  useEffect(() => {
    if (!mapInstance) return;

    const routes = nodes.filter(n => n.type === 'route');
    routes.forEach(node => {
      const layerId = `route-layer-${node.id}`;
      if (mapInstance.getLayer(layerId)) {
        const opacity = isPlaying ? 0 : 0.8;
        mapInstance.setPaintProperty(layerId, 'line-opacity', opacity);
      }
    });
  }, [mapInstance, nodes, isPlaying, activeRouteId]);

  return null;
}
