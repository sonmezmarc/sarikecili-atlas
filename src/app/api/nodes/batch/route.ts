import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/requireAuth';
import { validateNodeCreate } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const authError = await requireAuth();
  if (authError) return authError;

  const body = await request.json();
  const nodes = body.nodes;

  if (!Array.isArray(nodes) || nodes.length === 0) {
    return NextResponse.json({ error: 'nodes array required' }, { status: 400 });
  }

  if (nodes.length > 500) {
    return NextResponse.json({ error: 'max 500 nodes per batch' }, { status: 400 });
  }

  // Validate all and whitelist fields
  const sanitizedNodes: Record<string, unknown>[] = [];
  for (const node of nodes) {
    const err = validateNodeCreate(node);
    if (err) return NextResponse.json({ error: `Validation: ${err}` }, { status: 400 });

    const safe: Record<string, unknown> = {
      type: node.type,
      parent_id: node.parent_id || null,
      label: node.label || '',
      properties: node.properties || {},
      canvas_x: node.canvas_x ?? 0,
      canvas_y: node.canvas_y ?? 0,
      seasons: node.seasons || ['all'],
    };
    if (node.id) safe.id = node.id;
    sanitizedNodes.push(safe);
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.from('nodes').insert(sanitizedNodes).select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ created: data.length, ids: data.map(d => d.id) }, { status: 201 });
}
