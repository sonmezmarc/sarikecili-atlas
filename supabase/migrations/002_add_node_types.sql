-- ============================================
-- Migration 002: Add 6 new node types
-- Sarıkeçili Cultural Atlas
-- ============================================

-- Add new node types to the enum
-- Each ADD VALUE must be a separate statement (PostgreSQL restriction)
ALTER TYPE node_type ADD VALUE IF NOT EXISTS 'import';
ALTER TYPE node_type ADD VALUE IF NOT EXISTS 'storytelling';
ALTER TYPE node_type ADD VALUE IF NOT EXISTS 'effect';
ALTER TYPE node_type ADD VALUE IF NOT EXISTS 'annotation';
ALTER TYPE node_type ADD VALUE IF NOT EXISTS 'layer';
ALTER TYPE node_type ADD VALUE IF NOT EXISTS 'route';
