export interface Layer {
  id: string;
  name: string;
  name_tr: string | null;
  color: string;
  icon: string | null;
  visibility_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface GuidedTourStep {
  node_id: string;
  order: number;
  map_action?: {
    type: 'fly-to' | 'zoom' | 'none';
    lat?: number;
    lng?: number;
    zoom?: number;
    duration_ms?: number;
  };
  description?: string;
}

export interface GuidedTour {
  id: string;
  name: string;
  description: string | null;
  steps: GuidedTourStep[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AtlasSettings {
  id: string;
  splash_image_url: string | null;
  atlas_title: string;
  atlas_subtitle: string | null;
  discover_content: {
    heading?: string;
    body_html?: string;
    media?: Array<{ type: string; url: string; caption?: string }>;
    cta_label?: string;
  };
  default_center: { lng: number; lat: number };
  default_zoom: number;
  created_at: string;
  updated_at: string;
}
