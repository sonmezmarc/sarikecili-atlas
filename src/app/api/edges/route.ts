import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/requireAuth';
import { validateEdgeCreate, validateEdgeUpdate } from '@/lib/validation';

// GET /api/edges — fetch all edges
export async function GET() {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from('edges')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/edges — create a new edge
export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const supabase = createAdminSupabaseClient();
  const body = await request.json();

  const validationError = validateEdgeCreate(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const insertData: Record<string, unknown> = {
    source_node_id: body.source_node_id,
    target_node_id: body.target_node_id,
    type: body.type,
    properties: body.properties || {},
  };

  // Accept client-provided ID for optimistic updates
  if (body.id) {
    insertData.id = body.id;
  }

  const { data, error } = await supabase
    .from('edges')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// PUT /api/edges — update an edge
export async function PUT(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const supabase = createAdminSupabaseClient();
  const body = await request.json();

  const validationError = validateEdgeUpdate(body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.type !== undefined) updates.type = body.type;
  if (body.properties !== undefined) updates.properties = body.properties;

  const { data, error } = await supabase
    .from('edges')
    .update(updates)
    .eq('id', body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/edges — delete an edge
export async function DELETE(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const supabase = createAdminSupabaseClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { error } = await supabase.from('edges').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
