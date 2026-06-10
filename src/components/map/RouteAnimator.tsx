'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { useMapStore } from '@/stores/mapStore';
import { useRouteAnimationStore } from '@/stores/routeAnimationStore';
import { useSceneStore } from '@/stores/sceneStore';
import {
  prepareRouteGeometry,
  getPositionAtProgress,
  getBearingAtProgress,
  type PreparedRoute,
} from '@/lib/gis/routeGeometry';
import type { AtlasNode, RouteProperties, RouteWaypoint, RouteJourneyConfig } from '@/lib/types/nodes';
import { DEFAULT_JOURNEY_CONFIG as JOURNEY_DEFAULTS } from '@/lib/types/nodes';

// --- Map source / layer IDs ---
const ROUTE_SOURCE = 'journey-route';
const ROUTE_LINE_LAYER = 'journey-route-line';
const ROUTE_GLOW_LAYER = 'journey-route-glow';
const HEAD_SOURCE = 'journey-head';
const HEAD_DOT_LAYER = 'journey-head-dot';
const DEM_SOURCE = 'mapbox-dem';
const SKY_LAYER = 'journey-sky';
const SAT_SOURCE = 'journey-satellite';
const SAT_LAYER = 'journey-satellite-layer';

// --- Constants ---
const DELTA_TIME_CAP_MS = 100;
const CAMERA_ALTITUDE = 4000;
const CAMERA_LERP = 0.012;
const LOOK_AHEAD_PCT = 0.015;

// --- Helpers ---
function lerp(start: number, end: number, amt: number): number {
  return (1 - amt) * start + amt * end;
}

function computeCameraPosition(
  pitch: number,
  bearing: number,
  targetPosition: { lng: number; lat: number },
  altitude: number,
): { lng: number; lat: number } {
  const bearingRad = bearing / 57.29;
  const pitchRad = (90 - pitch) / 57.29;
  const lngDiff = ((altitude / Math.tan(pitchRad)) * Math.sin(-bearingRad)) / 70000;
  const latDiff = ((altitude / Math.tan(pitchRad)) * Math.cos(-bearingRad)) / 110000;
  return {
    lng: targetPosition.lng + lngDiff,
    lat: targetPosition.lat - latDiff,
  };
}

interface RouteAnimatorProps {
  nodes: AtlasNode[];
}

export default function RouteAnimator({ nodes }: RouteAnimatorProps) {
  const mapInstance = useMapStore((s) => s.mapInstance);
  const {
    isPlaying, isPaused, phase, activeRouteId, progress,
    currentWaypointIndex, direction,
    setPhase, setProgress, setTravelerLngLat, setCurrentBearing,
    setActiveWaypoint, setCurrentWaypointIndex, stopJourney,
  } = useRouteAnimationStore();
  const { setRightPanelOpen } = useSceneStore();

  // --- Refs ---
  const routeDataRef = useRef<PreparedRoute | null>(null);
  const configRef = useRef<RouteJourneyConfig>(JOURNEY_DEFAULTS);
  const waypointsRef = useRef<RouteWaypoint[]>([]);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const progressRef = useRef<number>(0);
  const phaseRef = useRef(phase);
  const isPausedRef = useRef(isPaused);
  const waypointIndexRef = useRef(-1);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const directionRef = useRef(direction);
  const activeRouteIdRef = useRef<string | null>(null);
  const lineColorRef = useRef<string>('#ef4444');

  // Smooth camera
  const smoothCameraPos = useRef<{ lng: number; lat: number }>({ lng: 0, lat: 0 });
  const smoothTargetPos = useRef<{ lng: number; lat: number }>({ lng: 0, lat: 0 });

  // Sync refs
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { waypointIndexRef.current = currentWaypointIndex; }, [currentWaypointIndex]);
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { activeRouteIdRef.current = activeRouteId; }, [activeRouteId]);

  // --- Satellite basemap overlay ---
  const enableSatellite = useCallback((map: mapboxgl.Map) => {
    if (!map.getSource(SAT_SOURCE)) {
      map.addSource(SAT_SOURCE, {
        type: 'raster',
        url: 'mapbox://mapbox.satellite',
        tileSize: 256,
      });
    }
    if (!map.getLayer(SAT_LAYER)) {
      // Insert satellite below all symbol layers (labels) so the map looks like satellite basemap
      const layers = map.getStyle().layers || [];
      let beforeId: string | undefined;
      for (const layer of layers) {
        if (layer.type === 'symbol') {
          beforeId = layer.id;
          break;
        }
      }
      map.addLayer(
        { id: SAT_LAYER, type: 'raster', source: SAT_SOURCE, paint: { 'raster-opacity': 0 } },
        beforeId,
      );
      // Fade in
      let opacity = 0;
      const fadeIn = () => {
        opacity = Math.min(1, opacity + 0.05);
        if (map.getLayer(SAT_LAYER)) map.setPaintProperty(SAT_LAYER, 'raster-opacity', opacity);
        if (opacity < 1) requestAnimationFrame(fadeIn);
      };
      requestAnimationFrame(fadeIn);
    }
  }, []);

  const disableSatellite = useCallback((map: mapboxgl.Map) => {
    if (map.getLayer(SAT_LAYER)) map.removeLayer(SAT_LAYER);
    if (map.getSource(SAT_SOURCE)) map.removeSource(SAT_SOURCE);
  }, []);

  // --- 3D Terrain ---
  const enable3DTerrain = useCallback((map: mapboxgl.Map, exaggeration: number) => {
    if (!map.getSource(DEM_SOURCE)) {
      map.addSource(DEM_SOURCE, {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
    }
    map.setTerrain({ source: DEM_SOURCE, exaggeration });
    if (!map.getLayer(SKY_LAYER)) {
      map.addLayer({
        id: SKY_LAYER,
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 90.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      });
    }
  }, []);

  const disable3DTerrain = useCallback((map: mapboxgl.Map) => {
    map.setTerrain(null);
    if (map.getLayer(SKY_LAYER)) map.removeLayer(SKY_LAYER);
  }, []);

  const hideAllStaticRoutes = useCallback((map: mapboxgl.Map) => {
    // Hide every static route layer (route-layer-*) so the gradient trail is the only visible line
    const style = map.getStyle();
    if (style?.layers) {
      for (const layer of style.layers) {
        if (layer.id.startsWith('route-layer-')) {
          map.setPaintProperty(layer.id, 'line-opacity', 0);
        }
      }
    }
  }, []);

  const restoreStaticRoutes = useCallback((map: mapboxgl.Map) => {
    // Restore all static route layers — MapNodeLayers will reconcile visibility on next render
    const style = map.getStyle();
    if (style?.layers) {
      for (const layer of style.layers) {
        if (layer.id.startsWith('route-layer-')) {
          map.setPaintProperty(layer.id, 'line-opacity', 0.8);
        }
      }
    }
  }, []);

  // --- Setup: full route GeoJSON with lineMetrics, line-gradient for progressive reveal ---
  const setupMapLayers = useCallback((map: mapboxgl.Map, route: PreparedRoute, config: RouteJourneyConfig) => {
    const color = config.trail_color || '#ef4444';
    lineColorRef.current = color;

    // Source: full route LineString with lineMetrics enabled
    if (!map.getSource(ROUTE_SOURCE)) {
      map.addSource(ROUTE_SOURCE, {
        type: 'geojson',
        lineMetrics: true,
        data: route.lineFeature,
      });
    }

    // Glow layer
    if (!map.getLayer(ROUTE_GLOW_LAYER)) {
      map.addLayer({
        id: ROUTE_GLOW_LAYER,
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': color,
          'line-width': (config.trail_width || 4) * 3,
          'line-opacity': 0.15,
          'line-blur': 10,
          // Glow also uses gradient — same reveal pattern
          'line-gradient': [
            'step',
            ['line-progress'],
            color,
            0.0001,
            'rgba(0, 0, 0, 0)',
          ],
        },
      });
    }

    // Main route line — line-gradient for progressive reveal
    if (!map.getLayer(ROUTE_LINE_LAYER)) {
      map.addLayer({
        id: ROUTE_LINE_LAYER,
        type: 'line',
        source: ROUTE_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': color,
          'line-width': config.trail_width || 4,
          'line-opacity': 0.9,
          // Initial: nothing revealed (step at nearly-zero hides everything)
          'line-gradient': [
            'step',
            ['line-progress'],
            color,
            0.0001,
            'rgba(0, 0, 0, 0)',
          ],
        },
      });
    }

    // Head dot
    if (!map.getSource(HEAD_SOURCE)) {
      map.addSource(HEAD_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }
    if (!map.getLayer(HEAD_DOT_LAYER)) {
      map.addLayer({
        id: HEAD_DOT_LAYER,
        type: 'circle',
        source: HEAD_SOURCE,
        paint: {
          'circle-radius': config.dot_radius || 6,
          'circle-color': config.dot_color || '#ffffff',
          'circle-opacity': 1,
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(0,0,0,0.3)',
        },
      });
    }
  }, []);

  const cleanupMapLayers = useCallback((map: mapboxgl.Map) => {
    [HEAD_DOT_LAYER, ROUTE_LINE_LAYER, ROUTE_GLOW_LAYER].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    [ROUTE_SOURCE, HEAD_SOURCE].forEach((id) => {
      if (map.getSource(id)) map.removeSource(id);
    });
  }, []);

  // --- Update head dot ---
  const updateHeadDot = useCallback((map: mapboxgl.Map, lngLat: [number, number]) => {
    const source = map.getSource(HEAD_SOURCE) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'Point', coordinates: lngLat },
          properties: {},
        }],
      });
    }
  }, []);

  // --- Cinematic camera ---
  const updateCinematicCamera = useCallback((
    map: mapboxgl.Map,
    targetLngLat: [number, number],
    routeBearing: number,
    config: RouteJourneyConfig,
    elapsed: number,
  ) => {
    const bearingOscillation = Math.sin(elapsed * 0.04) * config.camera_bearing_speed * 2;
    const cinematicBearing = routeBearing + bearingOscillation;
    const cinematicPitch = config.camera_pitch + Math.sin(elapsed * 0.025) * 0.8;
    const altitude = CAMERA_ALTITUDE * (config.terrain_exaggeration || 1.5);

    const idealCamPos = computeCameraPosition(
      cinematicPitch, cinematicBearing,
      { lng: targetLngLat[0], lat: targetLngLat[1] },
      altitude,
    );

    smoothCameraPos.current = {
      lng: lerp(smoothCameraPos.current.lng, idealCamPos.lng, CAMERA_LERP),
      lat: lerp(smoothCameraPos.current.lat, idealCamPos.lat, CAMERA_LERP),
    };
    smoothTargetPos.current = {
      lng: lerp(smoothTargetPos.current.lng, targetLngLat[0], CAMERA_LERP),
      lat: lerp(smoothTargetPos.current.lat, targetLngLat[1], CAMERA_LERP),
    };

    const camera = map.getFreeCameraOptions();
    camera.position = mapboxgl.MercatorCoordinate.fromLngLat(smoothCameraPos.current, altitude);
    camera.lookAtPoint(smoothTargetPos.current);
    map.setFreeCameraOptions(camera);
  }, []);

  // --- Head pulse ---
  const animateHeadPulse = useCallback((map: mapboxgl.Map, config: RouteJourneyConfig, elapsed: number) => {
    if (map.getLayer(HEAD_DOT_LAYER)) {
      const baseRadius = config.dot_radius || 6;
      map.setPaintProperty(HEAD_DOT_LAYER, 'circle-radius', baseRadius * (1 + 0.3 * Math.sin(elapsed * 4)));
    }
  }, []);

  // --- Waypoint hit ---
  const handleWaypointHit = useCallback((
    map: mapboxgl.Map, config: RouteJourneyConfig,
    wp: RouteWaypoint, wpIndex: number, pos: [number, number],
  ) => {
    waypointIndexRef.current = wpIndex;
    setCurrentWaypointIndex(wpIndex);

    if (wp.show_panel || wp.show_popup) {
      phaseRef.current = 'paused_at_stop';
      setPhase('paused_at_stop');
      setActiveWaypoint(wp);

      map.easeTo({
        center: pos,
        zoom: wp.camera_zoom ?? config.camera_zoom + 1,
        pitch: wp.camera_pitch ?? config.camera_pitch + 5,
        duration: 1500,
        easing: (t: number) => 1 - Math.pow(1 - t, 3),
      });

      if (wp.show_panel) setRightPanelOpen(true);

      // Always wait for manual "Devam Et" click — no auto-continue timer
    }
  }, [setCurrentWaypointIndex, setPhase, setActiveWaypoint, setRightPanelOpen]);

  // ─── Main animation loop ───
  const animate = useCallback((timestamp: number) => {
    const map = useMapStore.getState().mapInstance;
    if (!map || !routeDataRef.current) return;

    const currentPhase = phaseRef.current;
    if (currentPhase === 'idle') return;

    // First-frame skip
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp;
      if (startTimeRef.current === 0) startTimeRef.current = timestamp;
      animFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    const rawDeltaMs = timestamp - lastTimeRef.current;
    const deltaMs = Math.min(rawDeltaMs, DELTA_TIME_CAP_MS);
    lastTimeRef.current = timestamp;

    if (isPausedRef.current || currentPhase === 'paused_at_stop') {
      animateHeadPulse(map, configRef.current, elapsedRef.current);
      animFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    const config = configRef.current;
    const route = routeDataRef.current;
    const deltaS = deltaMs / 1000;
    elapsedRef.current += deltaS;

    if (currentPhase === 'intro') {
      animateHeadPulse(map, config, elapsedRef.current);
      animFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    if (currentPhase === 'traveling') {
      const isForward = directionRef.current === 'forward';
      const progressDelta = deltaS / config.duration_s;

      let newProgress: number;
      if (isForward) {
        newProgress = Math.min(1, progressRef.current + progressDelta);
      } else {
        newProgress = Math.max(0, progressRef.current - progressDelta);
      }
      progressRef.current = newProgress;
      setProgress(newProgress);

      // Position on route
      const pos = getPositionAtProgress(route, newProgress);
      const routeBearing = getBearingAtProgress(route, newProgress);
      setTravelerLngLat(pos);
      setCurrentBearing(routeBearing);

      // *** LINE-GRADIENT PROGRESSIVE REVEAL ***
      const color = lineColorRef.current;
      const animationPhase = isForward ? newProgress : newProgress;

      if (isForward) {
        // Colored from 0 to animationPhase, transparent after
        map.setPaintProperty(ROUTE_LINE_LAYER, 'line-gradient', [
          'step', ['line-progress'],
          color,
          animationPhase,
          'rgba(0, 0, 0, 0)',
        ]);
        map.setPaintProperty(ROUTE_GLOW_LAYER, 'line-gradient', [
          'step', ['line-progress'],
          color,
          animationPhase,
          'rgba(0, 0, 0, 0)',
        ]);
      } else {
        // Backward: transparent from 0 to animationPhase, colored after
        map.setPaintProperty(ROUTE_LINE_LAYER, 'line-gradient', [
          'step', ['line-progress'],
          'rgba(0, 0, 0, 0)',
          animationPhase,
          color,
        ]);
        map.setPaintProperty(ROUTE_GLOW_LAYER, 'line-gradient', [
          'step', ['line-progress'],
          'rgba(0, 0, 0, 0)',
          animationPhase,
          color,
        ]);
      }

      // Head dot + pulse
      updateHeadDot(map, pos);
      animateHeadPulse(map, config, elapsedRef.current);

      // Cinematic camera
      const lookAheadProgress = isForward
        ? Math.min(1, newProgress + LOOK_AHEAD_PCT)
        : Math.max(0, newProgress - LOOK_AHEAD_PCT);
      const lookAheadPos = getPositionAtProgress(route, lookAheadProgress);
      updateCinematicCamera(map, lookAheadPos, routeBearing, config, elapsedRef.current);

      // Waypoint check
      const waypoints = waypointsRef.current;
      const currentIdx = waypointIndexRef.current;

      if (isForward) {
        const nextIdx = currentIdx + 1;
        if (nextIdx < waypoints.length && newProgress >= waypoints[nextIdx].distance_pct) {
          handleWaypointHit(map, config, waypoints[nextIdx], nextIdx, pos);
          animFrameRef.current = requestAnimationFrame(animate);
          return;
        }
      } else {
        const nextIdx = currentIdx >= 0 ? currentIdx - 1 : waypoints.length - 1;
        if (nextIdx >= 0 && nextIdx < waypoints.length && newProgress <= waypoints[nextIdx].distance_pct) {
          handleWaypointHit(map, config, waypoints[nextIdx], nextIdx, pos);
          animFrameRef.current = requestAnimationFrame(animate);
          return;
        }
      }

      // Journey complete?
      const isComplete = isForward ? newProgress >= 1 : newProgress <= 0;
      if (isComplete) {
        phaseRef.current = 'outro';
        setPhase('outro');
        setRightPanelOpen(false);

        const midPos = getPositionAtProgress(route, 0.5);
        if (config.terrain_3d) disable3DTerrain(map);

        map.flyTo({
          center: midPos, zoom: config.outro_zoom,
          pitch: 0, bearing: 0, duration: config.outro_duration_ms,
        });

        setTimeout(() => {
          cleanupMapLayers(map);
          disableSatellite(map);
          restoreStaticRoutes(map);
          stopJourney();
        }, config.outro_duration_ms + 500);
        return;
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
  }, [
    setProgress, setTravelerLngLat, setCurrentBearing, setPhase,
    setRightPanelOpen, updateHeadDot, animateHeadPulse,
    cleanupMapLayers, stopJourney, disable3DTerrain, disableSatellite, restoreStaticRoutes,
    handleWaypointHit, updateCinematicCamera,
  ]);

  // --- Start journey ---
  useEffect(() => {
    if (!isPlaying || !activeRouteId || !mapInstance) return;
    if (phase !== 'intro') return;

    const routeNode = nodes.find((n) => n.id === activeRouteId);
    if (!routeNode) { stopJourney(); return; }

    const props = routeNode.properties as unknown as RouteProperties;
    if (!props.geojson_data) { stopJourney(); return; }

    const prepared = prepareRouteGeometry(props.geojson_data);
    if (!prepared) { stopJourney(); return; }

    const config: RouteJourneyConfig = { ...JOURNEY_DEFAULTS, ...props.journey };
    const waypoints = [...(props.waypoints || [])].sort((a, b) => a.distance_pct - b.distance_pct);

    routeDataRef.current = prepared;
    configRef.current = config;
    waypointsRef.current = waypoints;
    lastTimeRef.current = 0;
    startTimeRef.current = 0;
    elapsedRef.current = 0;

    const isForward = direction === 'forward';
    progressRef.current = isForward ? 0 : 1;
    waypointIndexRef.current = isForward ? -1 : waypoints.length;

    const startProgress = isForward ? 0 : 1;
    const startPos = getPositionAtProgress(prepared, startProgress);
    const startBearing = getBearingAtProgress(prepared, startProgress);

    const altitude = CAMERA_ALTITUDE * (config.terrain_exaggeration || 1.5);
    const startCamPos = computeCameraPosition(
      config.camera_pitch, startBearing,
      { lng: startPos[0], lat: startPos[1] }, altitude,
    );
    smoothCameraPos.current = startCamPos;
    smoothTargetPos.current = { lng: startPos[0], lat: startPos[1] };

    hideAllStaticRoutes(mapInstance);
    enableSatellite(mapInstance);
    setupMapLayers(mapInstance, prepared, config);
    if (config.terrain_3d) enable3DTerrain(mapInstance, config.terrain_exaggeration);

    updateHeadDot(mapInstance, startPos);
    setTravelerLngLat(startPos);

    mapInstance.flyTo({
      center: startPos, zoom: config.camera_zoom,
      pitch: config.camera_pitch, bearing: startBearing,
      duration: config.intro_duration_ms, essential: true,
    });

    const introTimer = setTimeout(() => {
      phaseRef.current = 'traveling';
      setPhase('traveling');
      lastTimeRef.current = 0;
      startTimeRef.current = 0;
      animFrameRef.current = requestAnimationFrame(animate);
    }, config.intro_duration_ms);

    animFrameRef.current = requestAnimationFrame(animate);

    return () => { clearTimeout(introTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, activeRouteId, mapInstance, phase === 'intro']);

  // --- Continue from stop ---
  useEffect(() => {
    if (phase === 'traveling' && routeDataRef.current) {
      if (pauseTimerRef.current) { clearTimeout(pauseTimerRef.current); pauseTimerRef.current = null; }
      lastTimeRef.current = 0;

      const map = useMapStore.getState().mapInstance;
      if (map) {
        const center = map.getCenter();
        const config = configRef.current;
        const altitude = CAMERA_ALTITUDE * (config.terrain_exaggeration || 1.5);
        const camPos = computeCameraPosition(map.getPitch(), map.getBearing(), { lng: center.lng, lat: center.lat }, altitude);
        smoothCameraPos.current = camPos;
        smoothTargetPos.current = { lng: center.lng, lat: center.lat };
      }

      animFrameRef.current = requestAnimationFrame(animate);
    }
  }, [phase, animate]);

  useEffect(() => {
    if (!isPlaying && mapInstance) {
      cancelAnimationFrame(animFrameRef.current);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      cleanupMapLayers(mapInstance);
      disableSatellite(mapInstance);
    }
  }, [isPlaying, mapInstance, cleanupMapLayers, disableSatellite]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  }, []);

  return null;
}
