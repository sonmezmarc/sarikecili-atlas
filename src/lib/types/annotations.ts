import type { Season } from './nodes';

export type AnnotationType = 'text' | 'arrow' | 'circle' | 'freehand' | 'media_card' | 'composite';

export type VisibilityMode = 'always' | 'hover' | 'proximity';

export type ClickAction = 'none' | 'expand' | 'navigate' | 'popup';

export type EnterAnimation = 'fade' | 'scale' | 'slide';

export interface AnnotationContent {
  text?: { html: string; font_family: string; font_size: number; color: string };
  media?: Array<{ type: string; url: string; caption?: string }>;
  arrow?: { direction: number; style: 'solid' | 'dashed'; color: string; head: 'arrow' | 'dot' };
}

export interface AnnotationBehavior {
  zoom_min: number;
  zoom_max: number;
  visibility_mode: VisibilityMode;
  hover_timeout_ms: number;
  click_action: ClickAction;
  click_target?: string; // node_id
  enter_animation: EnterAnimation;
  animation_duration_ms: number;
}

export interface AnnotationStyle {
  width?: number;
  height?: number;
  background?: string;
  border?: string;
  border_radius?: number;
  opacity: number;
  hover_opacity: number;
  shadow?: boolean;
}

export interface Annotation {
  id: string;
  type: AnnotationType;
  geometry: GeoJSON.Geometry;
  content: AnnotationContent;
  behavior: AnnotationBehavior;
  style: AnnotationStyle;
  layer_id: string | null;
  seasons: Season[];
  z_index: number;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_ANNOTATION_BEHAVIOR: AnnotationBehavior = {
  zoom_min: 6,
  zoom_max: 18,
  visibility_mode: 'always',
  hover_timeout_ms: 2000,
  click_action: 'none',
  enter_animation: 'fade',
  animation_duration_ms: 300,
};

export const DEFAULT_ANNOTATION_STYLE: AnnotationStyle = {
  opacity: 0.9,
  hover_opacity: 1.0,
  shadow: true,
};
