// ============================================
// Node & Edge Type Definitions
// Sarıkeçili Cultural Atlas — 14 Node Types
// ============================================

// --- Enums ---

export type NodeType =
  | 'anchor'
  | 'scene'
  | 'content'
  | 'pointcloud'
  | 'hotspot'
  | 'gate'
  | 'nav'
  | 'group'
  | 'import'
  | 'storytelling'
  | 'effect'
  | 'annotation'
  | 'layer'
  | 'route';

export type EdgeType = 'trigger' | 'contains' | 'navigates' | 'references';

export type Season = 'winter' | 'spring_migration' | 'summer' | 'autumn_migration' | 'all';

export type LayoutPreset =
  | 'map-with-right-panel'
  | 'map-with-left-panel'
  | 'overlay'
  | 'fullscreen-media'
  | 'split-view'
  | 'bottom-drawer'
  | 'popup'
  | 'pointcloud-immersive'
  | 'custom';

export type AnimationType = 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'scale' | 'none';

export type MediaType = 'text' | 'image' | 'video' | 'audio' | 'gif' | 'drawing' | 'pdf' | 'embed';

export type MarkerIconStyle = 'winter' | 'summer' | 'camp' | 'heritage' | 'intangible' | 'custom';

// --- Node Properties by Type ---

export interface AnchorProperties {
  lat: number;
  lng: number;
  zoom_min: number;
  zoom_max: number;
  icon_style: MarkerIconStyle;
  icon_url?: string;
  pulse_animation: boolean;
  marker_size: 'sm' | 'md' | 'lg';
}

export interface MapAction {
  type: 'fly-to' | 'zoom' | 'none';
  lat?: number;
  lng?: number;
  zoom?: number;
  bearing?: number;
  pitch?: number;
  duration_ms?: number;
}

export interface SceneProperties {
  layout: LayoutPreset;
  background: 'map' | 'photo' | 'color' | 'blur';
  background_value?: string;
  panel_width?: number;
  enter_animation: AnimationType;
  exit_animation: AnimationType;
  animation_duration_ms: number;
  basemap_switch?: string;
  map_action?: MapAction;
}

export interface ContentProperties {
  media_type: MediaType;
  media_id?: string;
  media_url?: string;
  text_content?: string;
  caption?: string;
  display_style: {
    width?: string;
    height?: string;
    border_radius?: string;
    object_fit?: 'cover' | 'contain' | 'fill';
  };
}

export interface PointCloudProperties {
  model_media_id: string;
  model_url: string;
  format: 'ply' | 'obj' | 'las' | 'laz' | 'potree';
  camera_preset: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    up: { x: number; y: number; z: number };
  };
  transition_style: 'dive-in' | 'fade' | 'slide';
  transition_duration_ms: number;
  background_color: string;
  point_size: number;
  point_budget: number;
}

export interface HotspotProperties {
  x: number;
  y: number;
  z: number;
  icon: 'info' | 'photo' | 'video' | 'document' | 'link' | 'custom';
  icon_url?: string;
  label: string;
  label_always_visible: boolean;
  popup_style: 'tooltip' | 'panel' | 'fullscreen';
}

export interface GateProperties {
  label: string;
  gate_mode: 'single' | 'parallel';
  style: 'button' | 'icon' | 'text-link' | 'image-link' | 'card';
  icon?: string;
  image_url?: string;
  visibility_rule: 'always' | 'hover' | 'zoom-range';
  zoom_min?: number;
  zoom_max?: number;
  color?: string;
  size: 'sm' | 'md' | 'lg';
}

export interface NavProperties {
  nav_type: 'fly-to' | 'zoom-in' | 'zoom-out' | 'pan' | 'basemap-switch' | 'reset';
  target_lat?: number;
  target_lng?: number;
  target_zoom?: number;
  target_bearing?: number;
  target_pitch?: number;
  basemap_style?: string;
  duration_ms: number;
  easing: 'ease-in-out' | 'ease-in' | 'ease-out' | 'linear';
}

export interface GroupProperties {
  color: string;
  description?: string;
  collapsed: boolean;
}

export interface ImportProperties {
  file_url?: string;
  original_name?: string;
  file_size?: number;
  resolved_type?: NodeType;
  auto_detect: boolean;
}

export interface StorytellingProperties {
  title: string;
  description?: string;
  scroll_speed: number;
  dimension: '2d' | '3d';
  chapters: StorytellingChapter[];
}

export interface StorytellingChapter {
  id: string;
  title: string;
  content_html?: string;
  camera_position?: MapAction;
  layer_toggles?: Record<string, boolean>;
  duration_s: number;
}

export interface EffectProperties {
  effect_type: 'fade' | 'slide' | 'scale' | 'rotate' | 'blur' | 'color-shift' | 'custom';
  target_property: string;
  duration_ms: number;
  delay_ms: number;
  easing: 'ease-in-out' | 'ease-in' | 'ease-out' | 'linear' | 'spring';
  keyframes: EffectKeyframe[];
}

export interface EffectKeyframe {
  time: number; // 0-1 normalized
  value: number | string;
}

export interface AnnotationNodeProperties {
  annotation_type: 'text' | 'arrow' | 'circle' | 'freehand' | 'media_card' | 'composite';
  geometry_type: 'point' | 'line' | 'polygon' | 'freehand';
  font?: string;
  font_size?: number;
  color: string;
  fill_color?: string;
  stroke_width?: number;
  zoom_min: number;
  zoom_max: number;
  behavior: 'always' | 'hover' | 'zoom-range';
  hover_timeout_ms?: number;
  click_action?: 'expand' | 'navigate' | 'popup' | 'none';
}

export interface LayerNodeProperties {
  layer_name: string;
  layer_name_tr?: string;
  color: string;
  icon?: string;
  visibility_default: boolean;
  season_filter?: Season[];
  sort_order: number;
}

export interface RouteWaypoint {
  id: string;
  distance_pct: number;    // 0.0–1.0 (rotanın neresinde)
  pause_ms: number;         // otomatik devam bekleme süresi (0 = manuel devam)
  label: string;            // konalga adı
  description: string;      // anlatı metni
  image_url: string;        // fotoğraf URL
  camera_zoom?: number;     // duraklamada zoom override
  camera_pitch?: number;    // duraklamada pitch override
  show_popup: boolean;      // harita üstünde label göster
  show_panel: boolean;      // sağ panelde bilgi göster
}

export interface RouteJourneyConfig {
  enabled: boolean;
  duration_s: number;              // toplam yolculuk süresi (saniye, duraklar hariç)
  camera_zoom: number;             // yolculuk zoom
  camera_pitch: number;            // yolculuk pitch
  camera_bearing_speed: number;    // derece/saniye dönüş
  intro_zoom: number;              // başlangıç genel zoom
  intro_duration_ms: number;       // intro flyTo süresi
  outro_zoom: number;              // bitiş genel zoom
  outro_duration_ms: number;       // outro flyTo süresi
  dot_color: string;               // gezgin dot rengi
  dot_radius: number;              // gezgin dot boyutu
  trail_enabled: boolean;          // iz çizgisi göster
  trail_color: string;             // iz rengi
  trail_width: number;             // iz kalınlığı
  terrain_3d: boolean;             // 3D arazi (default: true)
  terrain_exaggeration: number;    // yükselti abartma (default: 1.5)
}

export interface RouteProperties {
  route_type: 'migration' | 'trade' | 'seasonal' | 'custom';
  geojson_url?: string;
  geojson_data?: GeoJSON.FeatureCollection;
  color: string;
  width: number;
  dash_pattern?: number[];
  animation: boolean;
  animation_speed?: number;
  direction: 'forward' | 'backward' | 'bidirectional';
  waypoints?: RouteWaypoint[];
  journey?: RouteJourneyConfig;
}

// --- All Properties Union ---

export type NodeProperties =
  | AnchorProperties
  | SceneProperties
  | ContentProperties
  | PointCloudProperties
  | HotspotProperties
  | GateProperties
  | NavProperties
  | GroupProperties
  | ImportProperties
  | StorytellingProperties
  | EffectProperties
  | AnnotationNodeProperties
  | LayerNodeProperties
  | RouteProperties;

// --- Timeline Types ---

export interface TimelineTrack {
  id: string;
  name: string;
  locked: boolean;
  hidden: boolean;
}

export interface TimelineBlock {
  id: string;
  node_id: string;
  track_id: string;
  start_s: number;
  duration_s: number;
  color?: string;
}

export interface NodeTimeline {
  tracks: TimelineTrack[];
  blocks: TimelineBlock[];
}

// --- Pin-up Note ---

export interface PinUpNote {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// --- Database Records ---

export interface AtlasNode {
  id: string;
  type: NodeType;
  parent_id: string | null;
  label: string;
  properties: Record<string, unknown>;
  canvas_x: number;
  canvas_y: number;
  seasons: Season[];
  created_at: string;
  updated_at: string;
}

export interface AtlasEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  type: EdgeType;
  properties: Record<string, unknown>;
  created_at: string;
}

// --- Typed Node Helpers ---

export interface TypedNode<T extends NodeProperties> extends Omit<AtlasNode, 'properties'> {
  properties: T;
}

export type AnchorNode = TypedNode<AnchorProperties>;
export type SceneNode = TypedNode<SceneProperties>;
export type ContentNode = TypedNode<ContentProperties>;
export type PointCloudNodeData = TypedNode<PointCloudProperties>;
export type HotspotNodeData = TypedNode<HotspotProperties>;
export type GateNodeData = TypedNode<GateProperties>;
export type NavNodeData = TypedNode<NavProperties>;
export type GroupNodeData = TypedNode<GroupProperties>;
export type ImportNodeData = TypedNode<ImportProperties>;
export type StorytellingNodeData = TypedNode<StorytellingProperties>;
export type EffectNodeData = TypedNode<EffectProperties>;
export type AnnotationNodeData = TypedNode<AnnotationNodeProperties>;
export type LayerNodeData = TypedNode<LayerNodeProperties>;
export type RouteNodeData = TypedNode<RouteProperties>;

// --- Default Properties Factories ---

export const DEFAULT_ANCHOR_PROPS: AnchorProperties = {
  lat: 37.0,
  lng: 33.5,
  zoom_min: 6,
  zoom_max: 18,
  icon_style: 'heritage',
  pulse_animation: false,
  marker_size: 'md',
};

export const DEFAULT_SCENE_PROPS: SceneProperties = {
  layout: 'map-with-right-panel',
  background: 'map',
  enter_animation: 'fade',
  exit_animation: 'fade',
  animation_duration_ms: 400,
};

export const DEFAULT_CONTENT_PROPS: ContentProperties = {
  media_type: 'text',
  text_content: '',
  display_style: { width: '100%' },
};

export const DEFAULT_POINTCLOUD_PROPS: PointCloudProperties = {
  model_media_id: '',
  model_url: '',
  format: 'ply',
  camera_preset: {
    position: { x: 0, y: 5, z: 10 },
    target: { x: 0, y: 0, z: 0 },
    up: { x: 0, y: 1, z: 0 },
  },
  transition_style: 'dive-in',
  transition_duration_ms: 1500,
  background_color: '#1a1a2e',
  point_size: 1.0,
  point_budget: 1000000,
};

export const DEFAULT_HOTSPOT_PROPS: HotspotProperties = {
  x: 0, y: 0, z: 0,
  icon: 'info',
  label: 'New Hotspot',
  label_always_visible: false,
  popup_style: 'tooltip',
};

export const DEFAULT_GATE_PROPS: GateProperties = {
  label: 'Explore',
  gate_mode: 'single',
  style: 'button',
  visibility_rule: 'always',
  size: 'md',
};

export const DEFAULT_NAV_PROPS: NavProperties = {
  nav_type: 'fly-to',
  duration_ms: 2000,
  easing: 'ease-in-out',
};

export const DEFAULT_GROUP_PROPS: GroupProperties = {
  color: '#78716c',
  collapsed: false,
};

export const DEFAULT_IMPORT_PROPS: ImportProperties = {
  auto_detect: true,
};

export const DEFAULT_STORYTELLING_PROPS: StorytellingProperties = {
  title: 'New Story',
  scroll_speed: 1.0,
  dimension: '2d',
  chapters: [],
};

export const DEFAULT_EFFECT_PROPS: EffectProperties = {
  effect_type: 'fade',
  target_property: 'opacity',
  duration_ms: 400,
  delay_ms: 0,
  easing: 'ease-in-out',
  keyframes: [
    { time: 0, value: 0 },
    { time: 1, value: 1 },
  ],
};

export const DEFAULT_ANNOTATION_NODE_PROPS: AnnotationNodeProperties = {
  annotation_type: 'text',
  geometry_type: 'point',
  color: '#f97316',
  zoom_min: 6,
  zoom_max: 18,
  behavior: 'always',
};

export const DEFAULT_LAYER_NODE_PROPS: LayerNodeProperties = {
  layer_name: 'New Layer',
  color: '#3b82f6',
  visibility_default: true,
  sort_order: 0,
};

export const DEFAULT_JOURNEY_CONFIG: RouteJourneyConfig = {
  enabled: false,
  duration_s: 60,
  camera_zoom: 14,
  camera_pitch: 60,
  camera_bearing_speed: 2,
  intro_zoom: 6,
  intro_duration_ms: 3000,
  outro_zoom: 8,
  outro_duration_ms: 2000,
  dot_color: '#ffffff',
  dot_radius: 8,
  trail_enabled: true,
  trail_color: '#ef4444',
  trail_width: 3,
  terrain_3d: true,
  terrain_exaggeration: 1.5,
};

export const DEFAULT_ROUTE_PROPS: RouteProperties = {
  route_type: 'migration',
  color: '#ef4444',
  width: 3,
  animation: true,
  animation_speed: 1.0,
  direction: 'forward',
  waypoints: [],
  journey: { ...DEFAULT_JOURNEY_CONFIG },
};

export function getDefaultProperties(type: NodeType): Record<string, unknown> {
  const defaults: Record<NodeType, NodeProperties> = {
    anchor: DEFAULT_ANCHOR_PROPS,
    scene: DEFAULT_SCENE_PROPS,
    content: DEFAULT_CONTENT_PROPS,
    pointcloud: DEFAULT_POINTCLOUD_PROPS,
    hotspot: DEFAULT_HOTSPOT_PROPS,
    gate: DEFAULT_GATE_PROPS,
    nav: DEFAULT_NAV_PROPS,
    group: DEFAULT_GROUP_PROPS,
    import: DEFAULT_IMPORT_PROPS,
    storytelling: DEFAULT_STORYTELLING_PROPS,
    effect: DEFAULT_EFFECT_PROPS,
    annotation: DEFAULT_ANNOTATION_NODE_PROPS,
    layer: DEFAULT_LAYER_NODE_PROPS,
    route: DEFAULT_ROUTE_PROPS,
  };
  return { ...defaults[type] };
}
