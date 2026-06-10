const VALID_NODE_TYPES = [
  'anchor', 'scene', 'content', 'pointcloud', 'hotspot',
  'gate', 'nav', 'group', 'import', 'storytelling',
  'effect', 'annotation', 'layer', 'route',
] as const;

const VALID_EDGE_TYPES = [
  'trigger', 'contains', 'navigates', 'references',
] as const;

const VALID_SEASONS = [
  'all', 'summer', 'winter', 'spring_migration', 'autumn_migration',
] as const;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_LABEL_LENGTH = 500;

/**
 * Validate the body of a POST /api/nodes request.
 * Returns null if valid, or a string error message if invalid.
 */
export function validateNodeCreate(body: Record<string, unknown>): string | null {
  if (!body.type || !VALID_NODE_TYPES.includes(body.type as typeof VALID_NODE_TYPES[number])) {
    return `Invalid node type: "${body.type}". Must be one of: ${VALID_NODE_TYPES.join(', ')}`;
  }

  if (body.label !== undefined) {
    if (typeof body.label !== 'string') return 'label must be a string';
    if (body.label.length > MAX_LABEL_LENGTH) return `label must be at most ${MAX_LABEL_LENGTH} characters`;
  }

  if (body.canvas_x !== undefined && typeof body.canvas_x !== 'number') {
    return 'canvas_x must be a number';
  }

  if (body.canvas_y !== undefined && typeof body.canvas_y !== 'number') {
    return 'canvas_y must be a number';
  }

  if (body.id !== undefined) {
    if (typeof body.id !== 'string' || !UUID_REGEX.test(body.id)) {
      return 'id must be a valid UUID format';
    }
  }

  if (body.parent_id !== undefined && body.parent_id !== null) {
    if (typeof body.parent_id !== 'string' || !UUID_REGEX.test(body.parent_id)) {
      return 'parent_id must be a valid UUID format';
    }
  }

  if (body.seasons !== undefined) {
    if (!Array.isArray(body.seasons)) return 'seasons must be an array';
    for (const s of body.seasons) {
      if (!VALID_SEASONS.includes(s as typeof VALID_SEASONS[number])) {
        return `Invalid season: "${s}". Must be one of: ${VALID_SEASONS.join(', ')}`;
      }
    }
  }

  return null;
}

/**
 * Validate the body of a PUT /api/nodes request.
 * Returns null if valid, or a string error message if invalid.
 */
export function validateNodeUpdate(body: Record<string, unknown>): string | null {
  if (!body.id) {
    return 'id is required';
  }

  if (typeof body.id !== 'string' || !UUID_REGEX.test(body.id)) {
    return 'id must be a valid UUID format';
  }

  if (body.type !== undefined && !VALID_NODE_TYPES.includes(body.type as typeof VALID_NODE_TYPES[number])) {
    return `Invalid node type: "${body.type}". Must be one of: ${VALID_NODE_TYPES.join(', ')}`;
  }

  if (body.label !== undefined) {
    if (typeof body.label !== 'string') return 'label must be a string';
    if (body.label.length > MAX_LABEL_LENGTH) return `label must be at most ${MAX_LABEL_LENGTH} characters`;
  }

  if (body.canvas_x !== undefined && typeof body.canvas_x !== 'number') {
    return 'canvas_x must be a number';
  }

  if (body.canvas_y !== undefined && typeof body.canvas_y !== 'number') {
    return 'canvas_y must be a number';
  }

  if (body.parent_id !== undefined && body.parent_id !== null) {
    if (typeof body.parent_id !== 'string' || !UUID_REGEX.test(body.parent_id)) {
      return 'parent_id must be a valid UUID format';
    }
  }

  if (body.seasons !== undefined) {
    if (!Array.isArray(body.seasons)) return 'seasons must be an array';
    for (const s of body.seasons) {
      if (!VALID_SEASONS.includes(s as typeof VALID_SEASONS[number])) {
        return `Invalid season: "${s}". Must be one of: ${VALID_SEASONS.join(', ')}`;
      }
    }
  }

  return null;
}

/**
 * Validate the body of a POST /api/edges request.
 * Returns null if valid, or a string error message if invalid.
 */
export function validateEdgeCreate(body: Record<string, unknown>): string | null {
  if (!body.source_node_id || typeof body.source_node_id !== 'string') {
    return 'source_node_id is required and must be a string';
  }
  if (!UUID_REGEX.test(body.source_node_id as string)) {
    return 'source_node_id must be a valid UUID format';
  }

  if (!body.target_node_id || typeof body.target_node_id !== 'string') {
    return 'target_node_id is required and must be a string';
  }
  if (!UUID_REGEX.test(body.target_node_id as string)) {
    return 'target_node_id must be a valid UUID format';
  }

  if (body.id !== undefined) {
    if (typeof body.id !== 'string' || !UUID_REGEX.test(body.id)) {
      return 'id must be a valid UUID format';
    }
  }

  if (!body.type || !VALID_EDGE_TYPES.includes(body.type as typeof VALID_EDGE_TYPES[number])) {
    return `Invalid edge type: "${body.type}". Must be one of: ${VALID_EDGE_TYPES.join(', ')}`;
  }

  return null;
}

/**
 * Validate the body of a PUT /api/edges request.
 * Returns null if valid, or a string error message if invalid.
 */
export function validateEdgeUpdate(body: Record<string, unknown>): string | null {
  if (!body.id) {
    return 'id is required';
  }
  if (typeof body.id !== 'string' || !UUID_REGEX.test(body.id)) {
    return 'id must be a valid UUID format';
  }

  if (body.type !== undefined && !VALID_EDGE_TYPES.includes(body.type as typeof VALID_EDGE_TYPES[number])) {
    return `Invalid edge type: "${body.type}". Must be one of: ${VALID_EDGE_TYPES.join(', ')}`;
  }

  return null;
}
