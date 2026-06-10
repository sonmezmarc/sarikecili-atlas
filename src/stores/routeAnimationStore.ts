import { create } from 'zustand';
import type { RouteWaypoint } from '@/lib/types/nodes';

export type JourneyPhase = 'idle' | 'intro' | 'traveling' | 'paused_at_stop' | 'outro';
export type JourneyDirection = 'forward' | 'backward';

interface RouteAnimationState {
  // Playback state
  isPlaying: boolean;
  isPaused: boolean;
  phase: JourneyPhase;

  // Route tracking
  activeRouteId: string | null;
  progress: number; // 0–1
  currentWaypointIndex: number;
  direction: JourneyDirection;

  // Traveler position
  travelerLngLat: [number, number] | null;
  currentBearing: number;

  // Active waypoint data (for right panel)
  activeWaypoint: RouteWaypoint | null;

  // Editor preview (waypoint selected in timeline)
  previewWaypointId: string | null;
  previewWaypointLngLat: [number, number] | null;

  // Actions
  startJourney: (routeId: string, direction?: JourneyDirection) => void;
  stopJourney: () => void;
  pauseJourney: () => void;
  resumeJourney: () => void;
  continueFromStop: () => void;
  setPhase: (phase: JourneyPhase) => void;
  setProgress: (progress: number) => void;
  setTravelerLngLat: (lngLat: [number, number]) => void;
  setCurrentBearing: (bearing: number) => void;
  setActiveWaypoint: (waypoint: RouteWaypoint | null) => void;
  setCurrentWaypointIndex: (index: number) => void;
  setPreviewWaypoint: (id: string | null, lngLat: [number, number] | null) => void;
}

export const useRouteAnimationStore = create<RouteAnimationState>((set) => ({
  isPlaying: false,
  isPaused: false,
  phase: 'idle',
  activeRouteId: null,
  progress: 0,
  currentWaypointIndex: -1,
  direction: 'forward',
  travelerLngLat: null,
  currentBearing: 0,
  activeWaypoint: null,
  previewWaypointId: null,
  previewWaypointLngLat: null,

  startJourney: (routeId, direction = 'forward') =>
    set({
      isPlaying: true,
      isPaused: false,
      phase: 'intro',
      activeRouteId: routeId,
      progress: direction === 'forward' ? 0 : 1,
      currentWaypointIndex: -1,
      direction,
      travelerLngLat: null,
      currentBearing: 0,
      activeWaypoint: null,
      previewWaypointId: null,
      previewWaypointLngLat: null,
    }),

  stopJourney: () =>
    set({
      isPlaying: false,
      isPaused: false,
      phase: 'idle',
      activeRouteId: null,
      progress: 0,
      currentWaypointIndex: -1,
      travelerLngLat: null,
      currentBearing: 0,
      activeWaypoint: null,
      previewWaypointId: null,
      previewWaypointLngLat: null,
    }),

  pauseJourney: () => set({ isPaused: true }),
  resumeJourney: () => set({ isPaused: false }),

  continueFromStop: () =>
    set({
      phase: 'traveling',
      isPaused: false,
      activeWaypoint: null,
    }),

  setPhase: (phase) => set({ phase }),
  setProgress: (progress) => set({ progress }),
  setTravelerLngLat: (lngLat) => set({ travelerLngLat: lngLat }),
  setCurrentBearing: (bearing) => set({ currentBearing: bearing }),
  setActiveWaypoint: (waypoint) => set({ activeWaypoint: waypoint }),
  setCurrentWaypointIndex: (index) => set({ currentWaypointIndex: index }),
  setPreviewWaypoint: (id, lngLat) => set({ previewWaypointId: id, previewWaypointLngLat: lngLat }),
}));
