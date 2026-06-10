-- ============================================
-- Sarıkeçili Cultural Atlas — Database Schema
-- ============================================

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- ========== ENUMS ==========

CREATE TYPE node_type AS ENUM (
  'anchor', 'scene', 'content', 'pointcloud',
  'hotspot', 'gate', 'nav', 'group'
);

CREATE TYPE edge_type AS ENUM (
  'trigger', 'contains', 'navigates', 'references'
);

CREATE TYPE annotation_type AS ENUM (
  'text', 'arrow', 'circle', 'freehand', 'media_card', 'composite'
);

CREATE TYPE media_file_type AS ENUM (
  'image', 'video', 'audio', 'pdf', 'pointcloud', 'gif', 'drawing', 'geojson'
);

-- ========== TABLES ==========

-- NODES: All node types in the scene graph
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type node_type NOT NULL,
  parent_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
  label TEXT NOT NULL DEFAULT '',
  properties JSONB NOT NULL DEFAULT '{}',
  canvas_x FLOAT DEFAULT 0,
  canvas_y FLOAT DEFAULT 0,
  seasons TEXT[] DEFAULT ARRAY['all'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- EDGES: Connections between nodes
CREATE TABLE edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  type edge_type NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- LAYERS: Cultural map layers
CREATE TABLE layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_tr TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT,
  visibility_default BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- NODE_LAYERS: Many-to-many node-layer relationship
CREATE TABLE node_layers (
  node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
  layer_id UUID REFERENCES layers(id) ON DELETE CASCADE,
  PRIMARY KEY (node_id, layer_id)
);

-- MEDIA: Uploaded media files
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type media_file_type NOT NULL,
  file_size BIGINT,
  metadata JSONB DEFAULT '{}',
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- ANNOTATIONS: Map overlay annotations
CREATE TABLE annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type annotation_type NOT NULL,
  geometry GEOGRAPHY(GEOMETRY, 4326),
  content JSONB NOT NULL DEFAULT '{}',
  behavior JSONB NOT NULL DEFAULT '{}',
  style JSONB NOT NULL DEFAULT '{}',
  layer_id UUID REFERENCES layers(id) ON DELETE SET NULL,
  seasons TEXT[] DEFAULT ARRAY['all'],
  z_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- GUIDED TOURS: Ordered step-by-step tours
CREATE TABLE guided_tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- SETTINGS: Global atlas configuration (singleton)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  splash_image_url TEXT,
  atlas_title TEXT DEFAULT 'Digital Cultural Map of the Sarikecili Yoruks',
  atlas_subtitle TEXT,
  discover_content JSONB DEFAULT '{}',
  default_center JSONB DEFAULT '{"lng": 33.5, "lat": 37.0}',
  default_zoom FLOAT DEFAULT 8,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========== INDEXES ==========

CREATE INDEX idx_nodes_type ON nodes(type);
CREATE INDEX idx_nodes_parent ON nodes(parent_id);
CREATE INDEX idx_edges_source ON edges(source_node_id);
CREATE INDEX idx_edges_target ON edges(target_node_id);
CREATE INDEX idx_edges_type ON edges(type);
CREATE INDEX idx_annotations_geometry ON annotations USING GIST(geometry);
CREATE INDEX idx_annotations_layer ON annotations(layer_id);
CREATE INDEX idx_node_layers_node ON node_layers(node_id);
CREATE INDEX idx_node_layers_layer ON node_layers(layer_id);
CREATE INDEX idx_media_type ON media(file_type);

-- ========== ROW LEVEL SECURITY ==========

ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE guided_tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Public read access (everyone can read)
CREATE POLICY "Public read nodes" ON nodes FOR SELECT USING (true);
CREATE POLICY "Public read edges" ON edges FOR SELECT USING (true);
CREATE POLICY "Public read annotations" ON annotations FOR SELECT USING (true);
CREATE POLICY "Public read media" ON media FOR SELECT USING (true);
CREATE POLICY "Public read layers" ON layers FOR SELECT USING (true);
CREATE POLICY "Public read node_layers" ON node_layers FOR SELECT USING (true);
CREATE POLICY "Public read tours" ON guided_tours FOR SELECT USING (true);
CREATE POLICY "Public read settings" ON settings FOR SELECT USING (true);

-- Admin write access (authenticated users only)
CREATE POLICY "Admin write nodes" ON nodes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin write edges" ON edges FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin write annotations" ON annotations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin write media" ON media FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin write layers" ON layers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin write node_layers" ON node_layers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin write tours" ON guided_tours FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Admin write settings" ON settings FOR ALL USING (auth.role() = 'authenticated');

-- ========== TRIGGERS ==========

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER nodes_updated_at BEFORE UPDATE ON nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER annotations_updated_at BEFORE UPDATE ON annotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tours_updated_at BEFORE UPDATE ON guided_tours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========== SEED DATA ==========

-- Default layers
INSERT INTO layers (name, name_tr, color, icon, visibility_default, sort_order) VALUES
  ('Tangible Heritage', 'Somut Miras', '#f87171', '▲', true, 1),
  ('Intangible Heritage', 'Somut Olmayan Miras', '#34d399', '♫', true, 2),
  ('Migration Route', 'Goc Guzergahi', '#94a3b8', '─', true, 3),
  ('Climate-Culture', 'Iklim-Kultur', '#60a5fa', '◈', true, 4),
  ('Conservation', 'Koruma', '#fbbf24', '⚠', true, 5);

-- Default settings
INSERT INTO settings (atlas_title, atlas_subtitle, default_center, default_zoom, discover_content)
VALUES (
  'Digital Cultural Map of the Sarikecili Yoruks',
  'Mapping tangible and intangible heritage of Anatolia''s last nomads',
  '{"lng": 33.5, "lat": 37.0}',
  8,
  '{
    "heading": "Migration & the Sarikecili",
    "body_html": "<p>The Sarikecili Yoruks are one of the last nomadic communities in Anatolia. For centuries, they have migrated between the Taurus Mountains and the Mediterranean coast, following a rhythm dictated by climate, pasture, and tradition.</p><p>This digital cultural atlas maps their world.</p>",
    "cta_label": "Begin Exploring"
  }'
);
