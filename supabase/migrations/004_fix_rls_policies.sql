-- Migration 004: Tighten RLS policies
-- Migration 003 opened all tables to public writes for dev convenience.
-- Now that API routes use service_role (which bypasses RLS), we can
-- restrict direct writes to authenticated users only.

-- ─── Drop the overly permissive policies from migration 003 ─────────

DROP POLICY IF EXISTS "Allow all writes nodes" ON nodes;
DROP POLICY IF EXISTS "Allow all writes edges" ON edges;
DROP POLICY IF EXISTS "Allow all writes annotations" ON annotations;
DROP POLICY IF EXISTS "Allow all writes media" ON media;
DROP POLICY IF EXISTS "Allow all writes layers" ON layers;
DROP POLICY IF EXISTS "Allow all writes node_layers" ON node_layers;
DROP POLICY IF EXISTS "Allow all writes tours" ON guided_tours;
DROP POLICY IF EXISTS "Allow all writes settings" ON settings;

-- ─── Authenticated-only write policies ──────────────────────────────

CREATE POLICY "Authenticated write nodes" ON nodes
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated write edges" ON edges
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated write annotations" ON annotations
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated write media" ON media
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated write layers" ON layers
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated write node_layers" ON node_layers
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated write tours" ON guided_tours
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated write settings" ON settings
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
