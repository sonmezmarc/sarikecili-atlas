-- Migration 003: Fix RLS policies for admin panel access
-- The original policies required auth.role() = 'authenticated' for writes,
-- but the admin panel uses the anon key. Allow all operations for development.

-- ─── Drop existing restrictive write policies ──────────────

DROP POLICY IF EXISTS "Admin write nodes" ON nodes;
DROP POLICY IF EXISTS "Admin write edges" ON edges;
DROP POLICY IF EXISTS "Admin write annotations" ON annotations;
DROP POLICY IF EXISTS "Admin write media" ON media;
DROP POLICY IF EXISTS "Admin write layers" ON layers;
DROP POLICY IF EXISTS "Admin write node_layers" ON node_layers;
DROP POLICY IF EXISTS "Admin write tours" ON guided_tours;
DROP POLICY IF EXISTS "Admin write settings" ON settings;

-- ─── Add open write policies (dev/admin) ────────────────────

CREATE POLICY "Allow all writes nodes" ON nodes
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all writes edges" ON edges
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all writes annotations" ON annotations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all writes media" ON media
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all writes layers" ON layers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all writes node_layers" ON node_layers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all writes tours" ON guided_tours
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all writes settings" ON settings
  FOR ALL USING (true) WITH CHECK (true);
