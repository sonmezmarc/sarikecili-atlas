import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/requireAuth';
import { buildImportNodes, getGeoJSONFileList } from '@/lib/gis/importGeoJSON';
import type { GeoJSONFile } from '@/lib/gis/importGeoJSON';
import fs from 'fs';
import path from 'path';

export async function POST() {
  const authError = await requireAuth();
  if (authError) return authError;

  const geojsonDir = path.join(process.cwd(), 'gocer_localdatabase', 'geojson');

  if (!fs.existsSync(geojsonDir)) {
    return NextResponse.json(
      { error: 'GeoJSON dizini bulunamadı: gocer_localdatabase/geojson/' },
      { status: 404 }
    );
  }

  // Read all GeoJSON files
  const fileList = getGeoJSONFileList();
  const files: GeoJSONFile[] = [];

  for (const name of fileList) {
    const filePath = path.join(geojsonDir, `${name}.geojson`);
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    files.push({ name, data: JSON.parse(raw) });
  }

  if (files.length === 0) {
    return NextResponse.json({ error: 'Hiç GeoJSON dosyası bulunamadı' }, { status: 404 });
  }

  // Build nodes from GeoJSON
  const nodes = buildImportNodes(files);

  // Insert into Supabase
  const supabase = createAdminSupabaseClient();

  // Insert in batches of 100 to avoid payload limits
  const batchSize = 100;
  let totalCreated = 0;
  const allIds: string[] = [];

  for (let i = 0; i < nodes.length; i += batchSize) {
    const batch = nodes.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('nodes')
      .insert(batch)
      .select('id');

    if (error) {
      return NextResponse.json(
        { error: `Batch ${Math.floor(i / batchSize) + 1} hatası: ${error.message}`, created_so_far: totalCreated },
        { status: 500 }
      );
    }

    totalCreated += data.length;
    allIds.push(...data.map((d: { id: string }) => d.id));
  }

  return NextResponse.json({
    created: totalCreated,
    files_processed: files.length,
    groups: files.length,
    summary: files.map(f => ({ name: f.name, features: f.data.features.length })),
  }, { status: 201 });
}
