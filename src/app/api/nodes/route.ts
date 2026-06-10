import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/requireAuth';
import { validateNodeCreate, validateNodeUpdate } from '@/lib/validation';

// GET /api/nodes — fetch all nodes (optionally filter by parent_id)
export async function GET(request: NextRequest) {
  const supabase = createAdminSupabaseClient();
  const { searchParams } = new URL(request.url);
  const parentId = searchParams.get('parent_id');

  let query = supabase.from('nodes').select('*').order('created_at', { ascending: true });

  if (parentId) {
    query = query.eq('parent_id', parentId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/nodes — create a new node
export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const supabase = createAdminSupabaseClient();
  const body = await request.json();

  const validationError = validateNodeCreate(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const insertData: Record<string, unknown> = {
    type: body.type,
    parent_id: body.parent_id || null,
    label: body.label || '',
    properties: body.properties || {},
    canvas_x: body.canvas_x ?? 0,
    canvas_y: body.canvas_y ?? 0,
    seasons: body.seasons || ['all'],
  };

  // Accept client-provided ID for optimistic updates
  if (body.id) {
    insertData.id = body.id;
  }

  const { data, error } = await supabase
    .from('nodes')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// PUT /api/nodes — update a node
export async function PUT(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const supabase = createAdminSupabaseClient();
  const body = await request.json();

  const validationError = validateNodeUpdate(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.label !== undefined) updates.label = body.label;
  if (body.properties !== undefined) updates.properties = body.properties;
  if (body.canvas_x !== undefined) updates.canvas_x = body.canvas_x;
  if (body.canvas_y !== undefined) updates.canvas_y = body.canvas_y;
  if (body.parent_id !== undefined) updates.parent_id = body.parent_id;
  if (body.seasons !== undefined) updates.seasons = body.seasons;
  if (body.type !== undefined) updates.type = body.type;

  // Cycle detection: prevent setting a parent that would create a loop
  if (body.parent_id !== undefined && body.parent_id !== null) {
    const wouldCycle = await detectCycle(supabase, body.id, body.parent_id);
    if (wouldCycle) {
      return NextResponse.json(
        { error: 'Cannot set parent: would create a cycle' },
        { status: 400 }
      );
    }
  }

  const { data, error } = await supabase
    .from('nodes')
    .update(updates)
    .eq('id', body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/nodes — delete a node (with optional cascade)
export async function DELETE(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const supabase = createAdminSupabaseClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const withChildren = searchParams.get('with_children') === 'true';

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  if (withChildren) {
    // Recursively get all descendant IDs
    const descendants = await getDescendantIds(supabase, id);
    const allIds = [id, ...descendants];

    const { error } = await supabase
      .from('nodes')
      .delete()
      .in('id', allIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // Move children to parent's parent before deleting
    const { data: node } = await supabase
      .from('nodes')
      .select('parent_id')
      .eq('id', id)
      .single();

    if (node) {
      await supabase
        .from('nodes')
        .update({ parent_id: node.parent_id })
        .eq('parent_id', id);
    }

    const { error } = await supabase
      .from('nodes')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

// Detect parent cycle: walk up from proposedParentId; if we reach nodeId, it's a cycle
async function detectCycle(
  supabase: SupabaseClient,
  nodeId: string,
  proposedParentId: string,
  maxDepth = 20
): Promise<boolean> {
  let currentId: string | null = proposedParentId;
  let depth = 0;

  while (currentId && depth < maxDepth) {
    if (currentId === nodeId) return true;

    const { data } = await supabase
      .from('nodes')
      .select('parent_id')
      .eq('id', currentId)
      .single() as { data: { parent_id: string | null } | null };

    currentId = data?.parent_id ?? null;
    depth++;
  }

  return false;
}

async function getDescendantIds(
  supabase: SupabaseClient,
  parentId: string,
  depth = 0,
  maxDepth = 20
): Promise<string[]> {
  if (depth >= maxDepth) return [];

  const { data: children } = await supabase
    .from('nodes')
    .select('id')
    .eq('parent_id', parentId) as { data: { id: string }[] | null };

  if (!children || children.length === 0) return [];

  const childIds = children.map((c) => c.id);
  const grandchildren = await Promise.all(
    childIds.map((cid) => getDescendantIds(supabase, cid, depth + 1, maxDepth))
  );

  return [...childIds, ...grandchildren.flat()];
}
