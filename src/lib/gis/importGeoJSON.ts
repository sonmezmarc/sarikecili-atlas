// Node types used at runtime via string literals matching NodeType/Season values

type GeoJSONFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: string;
      coordinates: unknown;
    };
    properties: Record<string, unknown>;
  }>;
};

export interface GeoJSONFile {
  name: string;
  data: GeoJSONFeatureCollection;
}

function mapUnsurToStyle(unsur: string): { icon_style: string; seasons: string[] } {
  const u = unsur.toLowerCase();
  if (u.includes('yaz yurdu')) return { icon_style: 'summer', seasons: ['summer'] };
  if (u.includes('kış yurdu') || u.includes('kis yurdu')) return { icon_style: 'winter', seasons: ['winter'] };
  if (u.includes('konalga')) return { icon_style: 'camp', seasons: ['spring_migration', 'autumn_migration'] };
  if (u.includes('arkeolojik') || u.includes('makam')) return { icon_style: 'heritage', seasons: ['all'] };
  // tas ustasi, arilık, kuzluk, on-yasam alani vb.
  return { icon_style: 'intangible', seasons: ['all'] };
}

export function buildImportNodes(files: GeoJSONFile[]): Array<{
  id: string;
  type: string;
  parent_id: string | null;
  label: string;
  properties: Record<string, unknown>;
  canvas_x: number;
  canvas_y: number;
  seasons: string[];
}> {
  const allNodes: Array<{
    id: string;
    type: string;
    parent_id: string | null;
    label: string;
    properties: Record<string, unknown>;
    canvas_x: number;
    canvas_y: number;
    seasons: string[];
  }> = [];

  files.forEach((file, groupIndex) => {
    const groupId = crypto.randomUUID();
    const groupX = groupIndex * 300;
    const groupY = 0;

    // Create group node
    const groupLabel = file.name.replace(/_/g, ' ').replace(/\.geojson$/, '');
    allNodes.push({
      id: groupId,
      type: 'group',
      parent_id: null,
      label: groupLabel,
      properties: {},
      canvas_x: groupX,
      canvas_y: groupY,
      seasons: ['all'],
    });

    // Process features
    file.data.features.forEach((feature, childIndex) => {
      const childId = crypto.randomUUID();
      const childX = groupX;
      const childY = (childIndex + 1) * 80;

      // gocer_noktalar
      if (file.name === 'gocer_noktalar') {
        const unsur = (feature.properties.unsur || '') as string;
        const { icon_style, seasons } = mapUnsurToStyle(unsur);
        const coords = feature.geometry.coordinates as [number, number];

        allNodes.push({
          id: childId,
          type: 'anchor',
          parent_id: groupId,
          label: (feature.properties.adi || `Nokta ${feature.properties.id}`) as string,
          properties: {
            lat: coords[1],
            lng: coords[0],
            icon_style,
            marker_size: 'md',
            unsur: feature.properties.unsur,
            veri_tipi: feature.properties.veri_tipi,
            gorsel: feature.properties.gorsel,
          },
          canvas_x: childX,
          canvas_y: childY,
          seasons,
        });
      }

      // gocer_rotalari & goc_rotalari
      else if (file.name === 'gocer_rotalari' || file.name === 'goc_rotalari') {
        const featureCollection: GeoJSONFeatureCollection = {
          type: 'FeatureCollection',
          features: [feature],
        };

        allNodes.push({
          id: childId,
          type: 'route',
          parent_id: groupId,
          label: (feature.properties.name || `Rota ${feature.properties.id}`) as string,
          properties: {
            geojson_data: featureCollection,
            color: '#ef4444',
            width: 3,
            animation: true,
            direction: 'forward',
            route_type: 'migration',
            uzunluk_derece: feature.properties.uzunluk_derece,
            uzunluk_m: feature.properties.uzunluk_m,
          },
          canvas_x: childX,
          canvas_y: childY,
          seasons: ['spring_migration', 'autumn_migration'],
        });
      }

      // kis_yurdu & kis_yurdu_bazin
      else if (file.name === 'kis_yurdu' || file.name === 'kis_yurdu_bazin') {
        const coords = feature.geometry.coordinates as [number, number];

        allNodes.push({
          id: childId,
          type: 'anchor',
          parent_id: groupId,
          label: (feature.properties.kis_yurdu_yer || `Kış Yurdu ${feature.properties.id}`) as string,
          properties: {
            lat: coords[1],
            lng: coords[0],
            icon_style: 'winter',
            marker_size: 'md',
          },
          canvas_x: childX,
          canvas_y: childY,
          seasons: ['winter'],
        });
      }

      // yerlesimler
      else if (file.name === 'yerlesimler') {
        const coords = feature.geometry.coordinates as [number, number];

        allNodes.push({
          id: childId,
          type: 'anchor',
          parent_id: groupId,
          label: (feature.properties.yer_adi || `Yerleşim ${feature.properties.id}`) as string,
          properties: {
            lat: coords[1],
            lng: coords[0],
            icon_style: 'heritage',
            marker_size: 'sm',
          },
          canvas_x: childX,
          canvas_y: childY,
          seasons: ['all'],
        });
      }

      // gorulen_koyler
      else if (file.name === 'gorulen_koyler') {
        const coords = feature.geometry.coordinates as [number, number];

        allNodes.push({
          id: childId,
          type: 'anchor',
          parent_id: groupId,
          label: `Köy ${feature.properties.id}`,
          properties: {
            lat: coords[1],
            lng: coords[0],
            icon_style: 'heritage',
            marker_size: 'sm',
          },
          canvas_x: childX,
          canvas_y: childY,
          seasons: ['all'],
        });
      }

      // sehir_sinirlari
      else if (file.name === 'sehir_sinirlari') {
        allNodes.push({
          id: childId,
          type: 'annotation',
          parent_id: groupId,
          label: (feature.properties.sehir || `Şehir ${feature.properties.id}`) as string,
          properties: {
            annotation_type: 'text',
            geometry_type: 'polygon',
            geojson_data: feature.geometry.coordinates,
            color: '#64748b',
            stroke_width: 1,
            zoom_min: 6,
            zoom_max: 12,
          },
          canvas_x: childX,
          canvas_y: childY,
          seasons: ['all'],
        });
      }
    });
  });

  return allNodes;
}

export function getGeoJSONFileList(): string[] {
  // Sadece import edilecek dosya isimleri
  return [
    'gocer_noktalar',
    'gocer_rotalari',
    'goc_rotalari',
    'kis_yurdu',
    'kis_yurdu_bazin',
    'yerlesimler',
    'gorulen_koyler',
    'sehir_sinirlari',
  ];
}
