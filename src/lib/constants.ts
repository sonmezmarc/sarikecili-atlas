import type { NodeType, EdgeType, Season } from './types/nodes';

// Map defaults — Taurus Mountains / Mediterranean region
export const DEFAULT_CENTER: [number, number] = [33.5, 37.0]; // [lng, lat]
export const DEFAULT_ZOOM = 8;
export const MIN_ZOOM = 5;
export const MAX_ZOOM = 18;

// Selection
export const SELECTION_COLOR = '#f6d13b';

// Seasons
export const SEASONS: { key: Season; label: string; months: string }[] = [
  { key: 'all', label: 'Tüm Mevsimler', months: '' },
  { key: 'winter', label: 'Kış', months: 'Kas – Mar' },
  { key: 'spring_migration', label: 'Bahar Göçü', months: 'Nis – May' },
  { key: 'summer', label: 'Yaz', months: 'Haz – Eyl' },
  { key: 'autumn_migration', label: 'Güz Göçü', months: 'Eki' },
];

// Node type metadata for the editor — Lucide icon names
export const NODE_TYPE_CONFIG: Record<NodeType, {
  label: string;
  description: string;
  color: string;
  icon: string; // Lucide icon name
}> = {
  anchor: {
    label: 'Çapa',
    description: 'Haritadaki coğrafi nokta',
    color: '#22c55e',
    icon: 'MapPin',
  },
  scene: {
    label: 'Sahne',
    description: 'Yerleşim düzenli deneyim birimi',
    color: '#3b82f6',
    icon: 'Film',
  },
  content: {
    label: 'İçerik',
    description: 'Metin, görsel, video veya medya',
    color: '#a855f7',
    icon: 'FileText',
  },
  pointcloud: {
    label: 'Nokta Bulutu',
    description: '3B nokta bulutu görüntüleyici',
    color: '#06b6d4',
    icon: 'Cloud',
  },
  hotspot: {
    label: 'Etkin Nokta',
    description: '3B uzayda tıklanabilir nokta',
    color: '#f43f5e',
    icon: 'Target',
  },
  gate: {
    label: 'Kapı',
    description: 'Bağlantı kavşağı — tekli veya paralel',
    color: '#f97316',
    icon: 'DoorOpen',
  },
  nav: {
    label: 'Navigasyon',
    description: 'Harita kamera eylemi',
    color: '#64748b',
    icon: 'Navigation',
  },
  group: {
    label: 'Grup',
    description: 'Mantıksal gruplama kabı',
    color: '#78716c',
    icon: 'FolderOpen',
  },
  import: {
    label: 'İçe Aktar',
    description: 'Harici dosya içe aktar',
    color: '#84cc16',
    icon: 'Upload',
  },
  storytelling: {
    label: 'Hikâye Anlatımı',
    description: 'Kaydırma tabanlı anlatı',
    color: '#ec4899',
    icon: 'BookOpen',
  },
  effect: {
    label: 'Efekt',
    description: 'Geçiş ve animasyon',
    color: '#eab308',
    icon: 'Sparkles',
  },
  annotation: {
    label: 'Açıklama',
    description: 'Harita üstü açıklama',
    color: '#14b8a6',
    icon: 'PenTool',
  },
  layer: {
    label: 'Katman',
    description: 'Harita katman kontrolü',
    color: '#8b5cf6',
    icon: 'Layers',
  },
  route: {
    label: 'Rota',
    description: 'Zaman çizelgeli göç rotası',
    color: '#ef4444',
    icon: 'Route',
  },
};

// All node types as ordered array (for palette)
export const NODE_TYPES: NodeType[] = [
  'anchor', 'scene', 'content', 'pointcloud', 'hotspot',
  'gate', 'nav', 'group', 'import', 'storytelling',
  'effect', 'annotation', 'layer', 'route',
];

// Edge type metadata
export const EDGE_TYPE_CONFIG: Record<EdgeType, {
  label: string;
  color: string;
  style: 'dashed' | 'solid' | 'dotted';
}> = {
  trigger: { label: 'Tetikleyici', color: '#f97316', style: 'dashed' },
  contains: { label: 'İçerir', color: '#94a3b8', style: 'solid' },
  navigates: { label: 'Yönlendirir', color: '#3b82f6', style: 'solid' },
  references: { label: 'Referans', color: '#22c55e', style: 'dotted' },
};

// Handle colors match edge types
export const HANDLE_COLORS: Record<EdgeType, string> = {
  trigger: '#f97316',
  contains: '#94a3b8',
  navigates: '#3b82f6',
  references: '#22c55e',
};

// Edge types as ordered array
export const EDGE_TYPES: EdgeType[] = ['trigger', 'contains', 'navigates', 'references'];

// Layout preset thumbnails
export const LAYOUT_PRESETS = [
  { key: 'map-with-right-panel', label: 'Sağ Panel', icon: '◧' },
  { key: 'map-with-left-panel', label: 'Sol Panel', icon: '◨' },
  { key: 'overlay', label: 'Kaplama', icon: '◫' },
  { key: 'fullscreen-media', label: 'Tam Ekran', icon: '⬜' },
  { key: 'split-view', label: 'Bölünmüş Görünüm', icon: '◫' },
  { key: 'bottom-drawer', label: 'Alt Çekmece', icon: '⬒' },
  { key: 'popup', label: 'Açılır Pencere', icon: '◻' },
  { key: 'pointcloud-immersive', label: '3B Sürükleyici', icon: '🌐' },
] as const;

// Animation defaults
export const TRANSITION_DURATION_MS = 400;
export const FLY_TO_DURATION_MS = 2000;
export const SPLASH_DISPLAY_MS = 2000;
export const SPLASH_DISSOLVE_MS = 800;

// Timeline defaults
export const DEFAULT_BLOCK_DURATION_S = 3;
export const TIMELINE_MIN_ZOOM = 0.1;
export const TIMELINE_MAX_ZOOM = 10;
export const TIMELINE_DEFAULT_ZOOM = 1;

// Timeline layout constants
export const TIMELINE_BASE_PX_PER_SEC = 60;
export const TIMELINE_TRACK_HEIGHT = 32;
export const TIMELINE_RULER_HEIGHT = 20;
export const TIMELINE_TRACK_HEADER_WIDTH = 140;
export const TIMELINE_MIN_BLOCK_DURATION = 0.5;

// Pin-up note colors
export const PIN_UP_COLORS = [
  '#fef08a', // yellow
  '#bbf7d0', // green
  '#bfdbfe', // blue
  '#fecaca', // red
  '#e9d5ff', // purple
  '#fed7aa', // orange
];

// Canvas custom event names
export const CANVAS_EVENTS = {
  ALIGN: 'canvas-align',
  DISTRIBUTE: 'canvas-distribute',
  AUTO_LAYOUT: 'canvas-auto-layout',
  ADD_PINUP: 'canvas-add-pinup',
  TOGGLE_HANDLES: 'canvas-toggle-handles',
} as const;
