import type { AtlasNode, AtlasEdge, NodeType } from '@/lib/types/nodes';

export interface ValidationWarning {
  nodeId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

export function validateAllNodes(nodes: AtlasNode[], edges: AtlasEdge[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  for (const node of nodes) {
    if (!node.label || node.label.trim() === '') {
      warnings.push({ nodeId: node.id, severity: 'warning', message: 'Düğüm etiketi boş', field: 'label' });
    }

    const p = node.properties as Record<string, unknown>;

    switch (node.type as NodeType) {
      case 'anchor':
        if (!p.lat || !p.lng) warnings.push({ nodeId: node.id, severity: 'error', message: 'Koordinat eksik (enlem/boylam)', field: 'lat/lng' });
        break;
      case 'scene': {
        const children = nodes.filter(n => n.parent_id === node.id);
        if (children.length === 0) warnings.push({ nodeId: node.id, severity: 'warning', message: 'Sahne düğümünün alt öğesi yok', field: 'children' });
        break;
      }
      case 'content':
        if (p.media_type !== 'text' && !p.media_url) warnings.push({ nodeId: node.id, severity: 'info', message: 'Medya URL\'si tanımlanmamış', field: 'media_url' });
        break;
      case 'pointcloud':
        if (!p.model_url) warnings.push({ nodeId: node.id, severity: 'error', message: 'Nokta bulutu model dosyası eksik', field: 'model_url' });
        break;
      case 'route':
        if (!p.geojson_data) warnings.push({ nodeId: node.id, severity: 'info', message: 'Rota verisi (GeoJSON) eklenmemiş', field: 'geojson_data' });
        break;
      case 'storytelling':
        if (!p.chapters || (Array.isArray(p.chapters) && p.chapters.length === 0)) warnings.push({ nodeId: node.id, severity: 'warning', message: 'Hikâye bölümü eklenmemiş', field: 'chapters' });
        break;
      case 'import':
        if (!p.file_url) warnings.push({ nodeId: node.id, severity: 'warning', message: 'Dosya URL\'si belirtilmemiş', field: 'file_url' });
        break;
      case 'nav':
        if (p.nav_type === 'fly-to' && (!p.target_lat || !p.target_lng)) warnings.push({ nodeId: node.id, severity: 'error', message: 'Navigasyon hedef koordinatları eksik', field: 'target_lat/lng' });
        break;
    }
  }

  // Baglantilanmanis node kontrolu (kok haric)
  const connectedIds = new Set<string>();
  edges.forEach(e => { connectedIds.add(e.source_node_id); connectedIds.add(e.target_node_id); });
  nodes.forEach(n => {
    if (n.parent_id === null && !connectedIds.has(n.id) && nodes.filter(x => x.parent_id === null).length > 1) {
      // Kok seviye ve baglantisi yok — uyari
    }
  });

  return warnings;
}
