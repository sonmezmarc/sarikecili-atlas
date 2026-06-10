// Mapbox style URLs and configurations

export const BASEMAP_STYLES = {
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  streets: 'mapbox://styles/mapbox/streets-v12',
} as const;

export type BasemapKey = keyof typeof BASEMAP_STYLES;

export const DEFAULT_BASEMAP: BasemapKey = 'outdoors';

export const BASEMAP_OPTIONS: { key: BasemapKey; label: string }[] = [
  { key: 'satellite', label: 'Satellite' },
  { key: 'outdoors', label: 'Outdoors' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'streets', label: 'Streets' },
];

// Marker icon colors by type
export const MARKER_COLORS: Record<string, string> = {
  winter: '#60a5fa',
  summer: '#fbbf24',
  camp: '#a78bfa',
  heritage: '#f87171',
  intangible: '#34d399',
  custom: '#94a3b8',
};
