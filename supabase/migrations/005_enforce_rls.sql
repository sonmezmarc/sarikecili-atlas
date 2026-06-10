-- ============================================
-- Migration 005: Enforce RLS on ALL tables
-- ============================================
-- Supabase reports "rls_disabled_in_public" — this migration ensures
-- every public table has RLS enabled and proper policies.
--
-- Security model:
--   anon (public)        -> SELECT only (read-only)
--   authenticated        -> ALL (logged-in admin users)
--   service_role         -> bypasses RLS (used by API routes)
-- ============================================

-- ─── 1. Enable RLS on every table (idempotent) ───────────────

ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE guided_tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ─── 2. Drop ALL existing policies (clean slate) ─────────────

-- From migration 001
DROP POLICY IF EXISTS "Public read nodes" ON nodes;
DROP POLICY IF EXISTS "Public read edges" ON edges;
DROP POLICY IF EXISTS "Public read annotations" ON annotations;
DROP POLICY IF EXISTS "Public read media" ON media;
DROP POLICY IF EXISTS "Public read layers" ON layers;
DROP POLICY IF EXISTS "Public read node_layers" ON node_layers;
DROP POLICY IF EXISTS "Public read tours" ON guided_tours;
DROP POLICY IF EXISTS "Public read settings" ON settings;

DROP POLICY IF EXISTS "Admin write nodes" ON nodes;
DROP POLICY IF EXISTS "Admin write edges" ON edges;
DROP POLICY IF EXISTS "Admin write annotations" ON annotations;
DROP POLICY IF EXISTS "Admin write media" ON media;
DROP POLICY IF EXISTS "Admin write layers" ON layers;
DROP POLICY IF EXISTS "Admin write node_layers" ON node_layers;
DROP POLICY IF EXISTS "Admin write tours" ON guided_tours;
DROP POLICY IF EXISTS "Admin write settings" ON settings;

-- From migration 003
DROP POLICY IF EXISTS "Allow all writes nodes" ON nodes;
DROP POLICY IF EXISTS "Allow all writes edges" ON edges;
DROP POLICY IF EXISTS "Allow all writes annotations" ON annotations;
DROP POLICY IF EXISTS "Allow all writes media" ON media;
DROP POLICY IF EXISTS "Allow all writes layers" ON layers;
DROP POLICY IF EXISTS "Allow all writes node_layers" ON node_layers;
DROP POLICY IF EXISTS "Allow all writes tours" ON guided_tours;
DROP POLICY IF EXISTS "Allow all writes settings" ON settings;

-- From migration 004
DROP POLICY IF EXISTS "Authenticated write nodes" ON nodes;
DROP POLICY IF EXISTS "Authenticated write edges" ON edges;
DROP POLICY IF EXISTS "Authenticated write annotations" ON annotations;
DROP POLICY IF EXISTS "Authenticated write media" ON media;
DROP POLICY IF EXISTS "Authenticated write layers" ON layers;
DROP POLICY IF EXISTS "Authenticated write node_layers" ON node_layers;
DROP POLICY IF EXISTS "Authenticated write tours" ON guided_tours;
DROP POLICY IF EXISTS "Authenticated write settings" ON settings;

-- ─── 3. Public read-only policies (anon users can only SELECT) ────

CREATE POLICY "anon_read_nodes" ON nodes FOR SELECT USING (true);
CREATE POLICY "anon_read_edges" ON edges FOR SELECT USING (true);
CREATE POLICY "anon_read_layers" ON layers FOR SELECT USING (true);
CREATE POLICY "anon_read_node_layers" ON node_layers FOR SELECT USING (true);
CREATE POLICY "anon_read_media" ON media FOR SELECT USING (true);
CREATE POLICY "anon_read_annotations" ON annotations FOR SELECT USING (true);
CREATE POLICY "anon_read_tours" ON guided_tours FOR SELECT USING (true);
CREATE POLICY "anon_read_settings" ON settings FOR SELECT USING (true);

-- ─── 4. Authenticated write policies (logged-in users: full CRUD) ──

CREATE POLICY "auth_all_nodes" ON nodes FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_edges" ON edges FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_layers" ON layers FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_node_layers" ON node_layers FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_media" ON media FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_annotations" ON annotations FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_tours" ON guided_tours FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_settings" ON settings FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- ─── Done ──────────────────────────────────────────────────────
-- service_role key (used by API routes) bypasses RLS entirely.
-- anon key (used by public page) can only SELECT.
-- authenticated users (logged-in via Supabase Auth) have full access.
