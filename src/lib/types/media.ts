export type MediaFileType =
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'pointcloud'
  | 'gif'
  | 'drawing'
  | 'geojson';

export interface MediaRecord {
  id: string;
  file_name: string;
  file_url: string;
  file_type: MediaFileType;
  file_size: number | null;
  metadata: Record<string, unknown>;
  uploaded_at: string;
}
