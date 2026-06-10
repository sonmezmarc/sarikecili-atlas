'use client';

import { useEditorStore } from '@/stores/editorStore';
import { NODE_TYPE_CONFIG, SEASONS } from '@/lib/constants';
import type { AtlasNode, AtlasEdge, NodeType } from '@/lib/types/nodes';
import { Eye, Settings2, AlertTriangle, MapPin, Image as ImageIcon, Video, FileText, Music } from 'lucide-react';
import ValidationPanel from './ValidationPanel';

interface PropertyPanelProps {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  onUpdateNode: (id: string, changes: Partial<AtlasNode>) => void;
}

export default function PropertyPanel({ nodes, edges, onUpdateNode }: PropertyPanelProps) {
  const { selectedNodeId, rightPanelTab, setRightPanelTab } = useEditorStore();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-editor-border shrink-0">
        <button
          onClick={() => setRightPanelTab('preview')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs transition-colors ${
            rightPanelTab === 'preview'
              ? 'text-editor-text border-b-2 border-editor-accent'
              : 'text-editor-text-muted hover:text-editor-text'
          }`}
        >
          <Eye size={13} />
          Önizleme
        </button>
        <button
          onClick={() => setRightPanelTab('property')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs transition-colors ${
            rightPanelTab === 'property'
              ? 'text-editor-text border-b-2 border-editor-accent'
              : 'text-editor-text-muted hover:text-editor-text'
          }`}
        >
          <Settings2 size={13} />
          Özellikler
        </button>
        <button
          onClick={() => setRightPanelTab('validation')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs transition-colors ${
            rightPanelTab === 'validation'
              ? 'text-editor-text border-b-2 border-editor-accent'
              : 'text-editor-text-muted hover:text-editor-text'
          }`}
        >
          <AlertTriangle size={13} />
          Doğrulama
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scroll">
        {rightPanelTab === 'validation' ? (
          <ValidationPanel nodes={nodes} edges={edges} />
        ) : rightPanelTab === 'preview' ? (
          <PreviewTab node={selectedNode} />
        ) : (
          <PropertyTab node={selectedNode} onUpdateNode={onUpdateNode} />
        )}
      </div>
    </div>
  );
}

function PreviewTab({ node }: { node?: AtlasNode }) {
  if (!node) {
    return (
      <div className="p-4 text-center text-xs text-editor-text-muted">
        Önizlemek için bir düğüm seçin
      </div>
    );
  }

  const config = NODE_TYPE_CONFIG[node.type as NodeType];
  const props = node.properties as Record<string, unknown>;

  return (
    <div className="p-4">
      <div className="rounded-lg border border-editor-border p-4 bg-editor-surface">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: config?.color }}
          />
          <span className="text-sm text-editor-text font-medium">
            {node.label || config?.label}
          </span>
        </div>
        <p className="text-xs text-editor-text-muted">
          Tür: {config?.label}
        </p>
        <p className="text-xs text-editor-text-muted mt-1">
          Mevsimler: {node.seasons.join(', ')}
        </p>
        {node.parent_id && (
          <p className="text-xs text-editor-text-muted mt-1">
            Üst düğümü var
          </p>
        )}

        {/* Type-specific preview enhancements */}
        {node.type === 'anchor' && !!(props.lat || props.lng) && (
          <div className="mt-3 p-2 rounded bg-editor-bg border border-editor-border/50">
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={12} className="text-editor-accent" />
              <span className="text-[10px] font-semibold text-editor-text">Koordinatlar</span>
            </div>
            <p className="text-[10px] text-editor-text-muted font-mono">
              Enlem: {String(props.lat ?? 'N/A')}
            </p>
            <p className="text-[10px] text-editor-text-muted font-mono">
              Boylam: {String(props.lng ?? 'N/A')}
            </p>
          </div>
        )}

        {node.type === 'scene' && (
          <div className="mt-3 p-2 rounded bg-editor-bg border border-editor-border/50">
            <p className="text-[10px] text-editor-text-muted">
              <span className="font-semibold text-editor-text">Yerleşim:</span> {getLayoutLabel(props.layout as string)}
            </p>
            {!!props.enter_animation && (
              <p className="text-[10px] text-editor-text-muted mt-1">
                <span className="font-semibold text-editor-text">Animasyon:</span> {getAnimationLabel(props.enter_animation as string)}
              </p>
            )}
          </div>
        )}

        {node.type === 'content' && (
          <div className="mt-3 p-2 rounded bg-editor-bg border border-editor-border/50">
            <div className="flex items-center gap-2 mb-1">
              {getMediaIcon(props.media_type as string)}
              <span className="text-[10px] font-semibold text-editor-text">
                {getMediaTypeLabel(props.media_type as string)}
              </span>
            </div>
            {!!props.caption && (
              <p className="text-[10px] text-editor-text-muted mt-1">
                {props.caption as string}
              </p>
            )}
          </div>
        )}

        <div className="mt-3 p-2 rounded bg-editor-bg text-[10px] font-mono text-editor-text-muted overflow-auto max-h-[200px]">
          {JSON.stringify(node.properties, null, 2)}
        </div>
      </div>
    </div>
  );
}

// Helper functions for preview
function getLayoutLabel(layout: string): string {
  const labels: Record<string, string> = {
    'map-with-right-panel': 'Sağ Panel',
    'map-with-left-panel': 'Sol Panel',
    'overlay': 'Kaplama',
    'fullscreen-media': 'Tam Ekran',
    'split-view': 'Bölünmüş Görünüm',
    'bottom-drawer': 'Alt Çekmece',
    'popup': 'Açılır Pencere',
    'pointcloud-immersive': '3B Sürükleyici',
  };
  return labels[layout] || layout;
}

function getAnimationLabel(animation: string): string {
  const labels: Record<string, string> = {
    'fade': 'Solma',
    'slide-left': 'Sola Kayma',
    'slide-right': 'Sağa Kayma',
    'slide-up': 'Yukarı Kayma',
    'scale': 'Ölçekleme',
    'none': 'Yok',
  };
  return labels[animation] || animation;
}

function getMediaTypeLabel(mediaType: string): string {
  const labels: Record<string, string> = {
    'text': 'Metin',
    'image': 'Görsel',
    'video': 'Video',
    'audio': 'Ses',
    'gif': 'GIF',
    'pdf': 'PDF',
    'embed': 'Gömülü',
  };
  return labels[mediaType] || mediaType;
}

function getMediaIcon(mediaType: string) {
  const iconProps = { size: 12, className: 'text-editor-accent' };
  switch (mediaType) {
    case 'image':
    case 'gif':
      return <ImageIcon {...iconProps} />;
    case 'video':
      return <Video {...iconProps} />;
    case 'audio':
      return <Music {...iconProps} />;
    case 'text':
    case 'pdf':
    default:
      return <FileText {...iconProps} />;
  }
}

function PropertyTab({
  node,
  onUpdateNode,
}: {
  node?: AtlasNode;
  onUpdateNode: (id: string, changes: Partial<AtlasNode>) => void;
}) {
  if (!node) {
    return (
      <div className="p-4 text-center text-xs text-editor-text-muted">
        Özelliklerini düzenlemek için bir düğüm seçin
      </div>
    );
  }

  const config = NODE_TYPE_CONFIG[node.type as NodeType];
  const props = node.properties as Record<string, unknown>;

  const updateProp = (key: string, value: unknown) => {
    onUpdateNode(node.id, {
      properties: { ...props, [key]: value },
    });
  };

  return (
    <div className="p-3 space-y-4">
      {/* Node header */}
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: config?.color }}
        />
        <span className="text-xs uppercase tracking-wider text-editor-text-muted">
          {config?.label}
        </span>
      </div>

      {/* Common: Label */}
      <FieldGroup label="Etiket">
        <input
          type="text"
          value={node.label}
          onChange={(e) => onUpdateNode(node.id, { label: e.target.value })}
          className="w-full px-2 py-1.5 text-xs rounded-md bg-editor-surface border border-editor-border text-editor-text focus:outline-none focus:border-editor-accent"
        />
      </FieldGroup>

      {/* Common: Seasons */}
      <FieldGroup label="Mevsimler">
        <div className="flex flex-wrap gap-1">
          {SEASONS.map((s) => {
            const isActive = node.seasons.includes(s.key);
            return (
              <button
                key={s.key}
                onClick={() => {
                  const newSeasons = isActive
                    ? node.seasons.filter((ss) => ss !== s.key)
                    : [...node.seasons, s.key];
                  onUpdateNode(node.id, {
                    seasons: newSeasons.length > 0 ? newSeasons : ['all'],
                  });
                }}
                className={`px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
                  isActive
                    ? 'bg-editor-accent/20 border-editor-accent text-editor-text'
                    : 'border-editor-border text-editor-text-muted hover:border-editor-text-muted'
                }`}
              >
                {s.key === 'all' ? 'Tümü' : s.key.charAt(0).toUpperCase() + s.key.slice(1).replace('_', ' ')}
              </button>
            );
          })}
        </div>
      </FieldGroup>

      {/* Type-specific properties */}
      <div className="border-t border-editor-border pt-3">
        <TypeSpecificFields
          type={node.type as NodeType}
          properties={props}
          onUpdate={updateProp}
        />
      </div>
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-editor-text-muted mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function TypeSpecificFields({
  type,
  properties,
  onUpdate,
}: {
  type: NodeType;
  properties: Record<string, unknown>;
  onUpdate: (key: string, value: unknown) => void;
}) {
  switch (type) {
    case 'anchor':
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <FieldGroup label="Enlem">
              <NumberInput value={properties.lat as number} onChange={(v) => onUpdate('lat', v)} />
            </FieldGroup>
            <FieldGroup label="Boylam">
              <NumberInput value={properties.lng as number} onChange={(v) => onUpdate('lng', v)} />
            </FieldGroup>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FieldGroup label="Yakınlaştırma Min">
              <NumberInput value={properties.zoom_min as number} onChange={(v) => onUpdate('zoom_min', v)} />
            </FieldGroup>
            <FieldGroup label="Yakınlaştırma Maks">
              <NumberInput value={properties.zoom_max as number} onChange={(v) => onUpdate('zoom_max', v)} />
            </FieldGroup>
          </div>
          <FieldGroup label="İşaretçi Boyutu">
            <SelectInput
              value={properties.marker_size as string}
              options={[
                { value: 'sm', label: 'Küçük' },
                { value: 'md', label: 'Orta' },
                { value: 'lg', label: 'Büyük' },
              ]}
              onChange={(v) => onUpdate('marker_size', v)}
            />
          </FieldGroup>
          <FieldGroup label="Titreşim Animasyonu">
            <ToggleInput value={properties.pulse_animation as boolean} onChange={(v) => onUpdate('pulse_animation', v)} />
          </FieldGroup>
        </div>
      );

    case 'scene':
      return (
        <div className="space-y-3">
          <FieldGroup label="Yerleşim">
            <SelectInput
              value={properties.layout as string}
              options={[
                { value: 'map-with-right-panel', label: 'Sağ Panel' },
                { value: 'map-with-left-panel', label: 'Sol Panel' },
                { value: 'overlay', label: 'Kaplama' },
                { value: 'fullscreen-media', label: 'Tam Ekran' },
                { value: 'split-view', label: 'Bölünmüş Görünüm' },
                { value: 'bottom-drawer', label: 'Alt Çekmece' },
                { value: 'popup', label: 'Açılır Pencere' },
                { value: 'pointcloud-immersive', label: '3B Sürükleyici' },
              ]}
              onChange={(v) => onUpdate('layout', v)}
            />
          </FieldGroup>
          <FieldGroup label="Arka Plan">
            <SelectInput
              value={properties.background as string}
              options={[
                { value: 'map', label: 'Harita' },
                { value: 'photo', label: 'Fotoğraf' },
                { value: 'color', label: 'Renk' },
                { value: 'blur', label: 'Bulanık' },
              ]}
              onChange={(v) => onUpdate('background', v)}
            />
          </FieldGroup>
          <FieldGroup label="Giriş Animasyonu">
            <SelectInput
              value={properties.enter_animation as string}
              options={[
                { value: 'fade', label: 'Solma' },
                { value: 'slide-left', label: 'Sola Kayma' },
                { value: 'slide-right', label: 'Sağa Kayma' },
                { value: 'slide-up', label: 'Yukarı Kayma' },
                { value: 'scale', label: 'Ölçekleme' },
                { value: 'none', label: 'Yok' },
              ]}
              onChange={(v) => onUpdate('enter_animation', v)}
            />
          </FieldGroup>
        </div>
      );

    case 'gate':
      return (
        <div className="space-y-3">
          <FieldGroup label="Kapı Modu">
            <SelectInput
              value={(properties.gate_mode as string) || 'single'}
              options={[
                { value: 'single', label: 'Tekli (sıralı)' },
                { value: 'parallel', label: 'Paralel (eş zamanlı)' },
              ]}
              onChange={(v) => onUpdate('gate_mode', v)}
            />
          </FieldGroup>
          <FieldGroup label="Stil">
            <SelectInput
              value={properties.style as string}
              options={[
                { value: 'button', label: 'Buton' },
                { value: 'icon', label: 'İkon' },
                { value: 'text-link', label: 'Metin Bağlantısı' },
                { value: 'image-link', label: 'Görsel Bağlantısı' },
                { value: 'card', label: 'Kart' },
              ]}
              onChange={(v) => onUpdate('style', v)}
            />
          </FieldGroup>
          <FieldGroup label="Boyut">
            <SelectInput
              value={properties.size as string}
              options={[
                { value: 'sm', label: 'Küçük' },
                { value: 'md', label: 'Orta' },
                { value: 'lg', label: 'Büyük' },
              ]}
              onChange={(v) => onUpdate('size', v)}
            />
          </FieldGroup>
        </div>
      );

    case 'content':
      return (
        <div className="space-y-3">
          <FieldGroup label="Medya Türü">
            <SelectInput
              value={properties.media_type as string}
              options={[
                { value: 'text', label: 'Metin' },
                { value: 'image', label: 'Görsel' },
                { value: 'video', label: 'Video' },
                { value: 'audio', label: 'Ses' },
                { value: 'gif', label: 'GIF' },
                { value: 'pdf', label: 'PDF' },
                { value: 'embed', label: 'Gömülü' },
              ]}
              onChange={(v) => onUpdate('media_type', v)}
            />
          </FieldGroup>
          <FieldGroup label="Başlık">
            <input
              type="text"
              value={(properties.caption as string) || ''}
              onChange={(e) => onUpdate('caption', e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded-md bg-editor-surface border border-editor-border text-editor-text focus:outline-none focus:border-editor-accent"
            />
          </FieldGroup>
        </div>
      );

    case 'nav':
      return (
        <div className="space-y-3">
          <FieldGroup label="Navigasyon Türü">
            <SelectInput
              value={properties.nav_type as string}
              options={[
                { value: 'fly-to', label: 'Uçarak Git' },
                { value: 'zoom-in', label: 'Yakınlaştır' },
                { value: 'zoom-out', label: 'Uzaklaştır' },
                { value: 'pan', label: 'Kaydır' },
                { value: 'basemap-switch', label: 'Altlık Harita Değiştir' },
                { value: 'reset', label: 'Görünümü Sıfırla' },
              ]}
              onChange={(v) => onUpdate('nav_type', v)}
            />
          </FieldGroup>
          <FieldGroup label="Süre (ms)">
            <NumberInput value={properties.duration_ms as number} onChange={(v) => onUpdate('duration_ms', v)} />
          </FieldGroup>
        </div>
      );

    case 'route': {
      const journey = (properties.journey as Record<string, unknown>) ?? {};

      const updateJourney = (key: string, value: unknown) => {
        onUpdate('journey', { ...journey, [key]: value });
      };

      return (
        <div className="space-y-3">
          <FieldGroup label="Rota Türü">
            <SelectInput
              value={properties.route_type as string}
              options={[
                { value: 'migration', label: 'Göç' },
                { value: 'trade', label: 'Ticaret' },
                { value: 'seasonal', label: 'Mevsimsel' },
                { value: 'custom', label: 'Özel' },
              ]}
              onChange={(v) => onUpdate('route_type', v)}
            />
          </FieldGroup>
          <FieldGroup label="Renk">
            <ColorInput value={properties.color as string} onChange={(v) => onUpdate('color', v)} />
          </FieldGroup>
          <FieldGroup label="Genişlik">
            <NumberInput value={properties.width as number} onChange={(v) => onUpdate('width', v)} />
          </FieldGroup>
          <FieldGroup label="Animasyonlu">
            <ToggleInput value={properties.animation as boolean} onChange={(v) => onUpdate('animation', v)} />
          </FieldGroup>

          {/* Journey Section */}
          <div className="border-t border-editor-border pt-3 mt-4">
            <p className="text-[10px] uppercase tracking-wider text-editor-accent font-semibold mb-3">
              Göç Yolculuğu
            </p>

            <FieldGroup label="Aktif">
              <ToggleInput value={(journey.enabled as boolean) ?? false} onChange={(v) => updateJourney('enabled', v)} />
            </FieldGroup>

            {(journey.enabled as boolean) && (
              <div className="space-y-3 mt-3">
                {/* Direction */}
                <FieldGroup label="Göç Yönü">
                  <SelectInput
                    value={(properties.direction as string) || 'forward'}
                    options={[
                      { value: 'forward', label: 'Ileri' },
                      { value: 'backward', label: 'Geri' },
                    ]}
                    onChange={(v) => onUpdate('direction', v)}
                  />
                </FieldGroup>

                {/* 3D Terrain */}
                <FieldGroup label="3B Arazi">
                  <ToggleInput value={(journey.terrain_3d as boolean) ?? true} onChange={(v) => updateJourney('terrain_3d', v)} />
                </FieldGroup>
                {(journey.terrain_3d as boolean) !== false && (
                  <FieldGroup label="Yükselti Abartma">
                    <NumberInput value={(journey.terrain_exaggeration as number) ?? 1.5} onChange={(v) => updateJourney('terrain_exaggeration', v)} />
                  </FieldGroup>
                )}

                <FieldGroup label="Süre (sn)">
                  <NumberInput value={(journey.duration_s as number) ?? 60} onChange={(v) => updateJourney('duration_s', v)} />
                </FieldGroup>
                <div className="grid grid-cols-2 gap-2">
                  <FieldGroup label="Kamera Zoom">
                    <NumberInput value={(journey.camera_zoom as number) ?? 14} onChange={(v) => updateJourney('camera_zoom', v)} />
                  </FieldGroup>
                  <FieldGroup label="Kamera Pitch">
                    <NumberInput value={(journey.camera_pitch as number) ?? 60} onChange={(v) => updateJourney('camera_pitch', v)} />
                  </FieldGroup>
                </div>
                <FieldGroup label="Dönüş Hızı (°/sn)">
                  <NumberInput value={(journey.camera_bearing_speed as number) ?? 2} onChange={(v) => updateJourney('camera_bearing_speed', v)} />
                </FieldGroup>
                <FieldGroup label="Çizgi Rengi">
                  <ColorInput value={(journey.trail_color as string) ?? '#ef4444'} onChange={(v) => updateJourney('trail_color', v)} />
                </FieldGroup>
                <FieldGroup label="Çizgi Kalınlığı">
                  <NumberInput value={(journey.trail_width as number) ?? 3} onChange={(v) => updateJourney('trail_width', v)} />
                </FieldGroup>
                <FieldGroup label="Uç Noktası Rengi">
                  <ColorInput value={(journey.dot_color as string) ?? '#ffffff'} onChange={(v) => updateJourney('dot_color', v)} />
                </FieldGroup>
                <FieldGroup label="Uç Noktası Boyutu">
                  <NumberInput value={(journey.dot_radius as number) ?? 6} onChange={(v) => updateJourney('dot_radius', v)} />
                </FieldGroup>
                <div className="grid grid-cols-2 gap-2">
                  <FieldGroup label="Giriş Zoom">
                    <NumberInput value={(journey.intro_zoom as number) ?? 6} onChange={(v) => updateJourney('intro_zoom', v)} />
                  </FieldGroup>
                  <FieldGroup label="Giriş Süresi (ms)">
                    <NumberInput value={(journey.intro_duration_ms as number) ?? 3000} onChange={(v) => updateJourney('intro_duration_ms', v)} />
                  </FieldGroup>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FieldGroup label="Çıkış Zoom">
                    <NumberInput value={(journey.outro_zoom as number) ?? 8} onChange={(v) => updateJourney('outro_zoom', v)} />
                  </FieldGroup>
                  <FieldGroup label="Çıkış Süresi (ms)">
                    <NumberInput value={(journey.outro_duration_ms as number) ?? 2000} onChange={(v) => updateJourney('outro_duration_ms', v)} />
                  </FieldGroup>
                </div>

                {/* Timeline info message */}
                <div className="mt-4 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[10px] text-amber-600 leading-relaxed">
                    Duraklar (konalgalar) zaman cizelgesinde D katmaninda düzenlenir.
                    Amber renkli bloklari sürükleyerek konum ve süre ayarlayabilirsiniz.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    case 'storytelling':
      return (
        <div className="space-y-3">
          <FieldGroup label="Başlık">
            <input
              type="text"
              value={(properties.title as string) || ''}
              onChange={(e) => onUpdate('title', e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded-md bg-editor-surface border border-editor-border text-editor-text focus:outline-none focus:border-editor-accent"
            />
          </FieldGroup>
          <FieldGroup label="Boyut">
            <SelectInput
              value={properties.dimension as string}
              options={[
                { value: '2d', label: '2D' },
                { value: '3d', label: '3D' },
              ]}
              onChange={(v) => onUpdate('dimension', v)}
            />
          </FieldGroup>
          <FieldGroup label="Kaydırma Hızı">
            <NumberInput value={properties.scroll_speed as number} onChange={(v) => onUpdate('scroll_speed', v)} />
          </FieldGroup>
        </div>
      );

    case 'effect':
      return (
        <div className="space-y-3">
          <FieldGroup label="Efekt Türü">
            <SelectInput
              value={properties.effect_type as string}
              options={[
                { value: 'fade', label: 'Solma' },
                { value: 'slide', label: 'Kayma' },
                { value: 'scale', label: 'Ölçekleme' },
                { value: 'rotate', label: 'Döndürme' },
                { value: 'blur', label: 'Bulanıklık' },
                { value: 'color-shift', label: 'Renk Geçişi' },
              ]}
              onChange={(v) => onUpdate('effect_type', v)}
            />
          </FieldGroup>
          <FieldGroup label="Süre (ms)">
            <NumberInput value={properties.duration_ms as number} onChange={(v) => onUpdate('duration_ms', v)} />
          </FieldGroup>
          <FieldGroup label="Geçiş Eğrisi">
            <SelectInput
              value={properties.easing as string}
              options={[
                { value: 'ease-in-out', label: 'Yumuşak Giriş-Çıkış' },
                { value: 'ease-in', label: 'Yumuşak Giriş' },
                { value: 'ease-out', label: 'Yumuşak Çıkış' },
                { value: 'linear', label: 'Doğrusal' },
                { value: 'spring', label: 'Yay' },
              ]}
              onChange={(v) => onUpdate('easing', v)}
            />
          </FieldGroup>
        </div>
      );

    case 'layer':
      return (
        <div className="space-y-3">
          <FieldGroup label="Katman Adı">
            <input
              type="text"
              value={(properties.layer_name as string) || ''}
              onChange={(e) => onUpdate('layer_name', e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded-md bg-editor-surface border border-editor-border text-editor-text focus:outline-none focus:border-editor-accent"
            />
          </FieldGroup>
          <FieldGroup label="Renk">
            <ColorInput value={properties.color as string} onChange={(v) => onUpdate('color', v)} />
          </FieldGroup>
          <FieldGroup label="Varsayılan Görünürlük">
            <ToggleInput value={properties.visibility_default as boolean} onChange={(v) => onUpdate('visibility_default', v)} />
          </FieldGroup>
        </div>
      );

    case 'annotation':
      return (
        <div className="space-y-3">
          <FieldGroup label="Açıklama Türü">
            <SelectInput
              value={properties.annotation_type as string}
              options={[
                { value: 'text', label: 'Metin' },
                { value: 'arrow', label: 'Ok' },
                { value: 'circle', label: 'Daire' },
                { value: 'freehand', label: 'Serbest Çizim' },
                { value: 'media_card', label: 'Medya Kartı' },
                { value: 'composite', label: 'Bileşik' },
              ]}
              onChange={(v) => onUpdate('annotation_type', v)}
            />
          </FieldGroup>
          <FieldGroup label="Renk">
            <ColorInput value={properties.color as string} onChange={(v) => onUpdate('color', v)} />
          </FieldGroup>
          <FieldGroup label="Davranış">
            <SelectInput
              value={properties.behavior as string}
              options={[
                { value: 'always', label: 'Her Zaman Görünür' },
                { value: 'hover', label: 'Üzerine Gelince' },
                { value: 'zoom-range', label: 'Yakınlaştırma Aralığında' },
              ]}
              onChange={(v) => onUpdate('behavior', v)}
            />
          </FieldGroup>
        </div>
      );

    case 'pointcloud':
      return (
        <div className="space-y-3">
          <FieldGroup label="Model URL">
            <input
              type="text"
              value={(properties.model_url as string) || ''}
              onChange={(e) => onUpdate('model_url', e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded-md bg-editor-surface border border-editor-border text-editor-text focus:outline-none focus:border-editor-accent"
            />
          </FieldGroup>
          <FieldGroup label="Format">
            <SelectInput
              value={properties.format as string}
              options={[
                { value: 'las', label: 'LAS' },
                { value: 'laz', label: 'LAZ' },
                { value: 'ply', label: 'PLY' },
                { value: 'e57', label: 'E57' },
                { value: 'xyz', label: 'XYZ' },
              ]}
              onChange={(v) => onUpdate('format', v)}
            />
          </FieldGroup>
          <div className="grid grid-cols-2 gap-2">
            <FieldGroup label="Nokta Boyutu">
              <NumberInput value={properties.point_size as number} onChange={(v) => onUpdate('point_size', v)} />
            </FieldGroup>
            <FieldGroup label="Maks Nokta">
              <NumberInput value={(properties.max_points as number) ?? 1000000} onChange={(v) => onUpdate('max_points', v)} />
            </FieldGroup>
          </div>
          <FieldGroup label="Kamera Ön Ayarı">
            <SelectInput
              value={properties.camera_preset as string}
              options={[
                { value: 'orbit', label: 'Yörünge' },
                { value: 'fly', label: 'Uçuş' },
                { value: 'top-down', label: 'Kuşbakışı' },
                { value: 'first-person', label: 'Birinci Şahıs' },
              ]}
              onChange={(v) => onUpdate('camera_preset', v)}
            />
          </FieldGroup>
          <FieldGroup label="Geçiş Stili">
            <SelectInput
              value={properties.transition_style as string}
              options={[
                { value: 'fly-to', label: 'Uçarak Git' },
                { value: 'fade', label: 'Solma' },
                { value: 'cut', label: 'Kesme' },
                { value: 'orbit-in', label: 'Yörünge Girişi' },
              ]}
              onChange={(v) => onUpdate('transition_style', v)}
            />
          </FieldGroup>
          <FieldGroup label="Sınırlayıcı Kutuyu Göster">
            <ToggleInput value={properties.show_bounding_box as boolean} onChange={(v) => onUpdate('show_bounding_box', v)} />
          </FieldGroup>
          <FieldGroup label="Renk Modu">
            <SelectInput
              value={properties.color_mode as string}
              options={[
                { value: 'rgb', label: 'RGB' },
                { value: 'intensity', label: 'Yoğunluk' },
                { value: 'classification', label: 'Sınıflandırma' },
                { value: 'elevation', label: 'Yükseklik' },
                { value: 'single-color', label: 'Tek Renk' },
              ]}
              onChange={(v) => onUpdate('color_mode', v)}
            />
          </FieldGroup>
        </div>
      );

    case 'hotspot':
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <FieldGroup label="Konum X">
              <NumberInput value={properties.position_x as number} onChange={(v) => onUpdate('position_x', v)} />
            </FieldGroup>
            <FieldGroup label="Konum Y">
              <NumberInput value={properties.position_y as number} onChange={(v) => onUpdate('position_y', v)} />
            </FieldGroup>
            <FieldGroup label="Konum Z">
              <NumberInput value={properties.position_z as number} onChange={(v) => onUpdate('position_z', v)} />
            </FieldGroup>
          </div>
          <FieldGroup label="İkon">
            <SelectInput
              value={properties.icon as string}
              options={[
                { value: 'info', label: 'Bilgi' },
                { value: 'photo', label: 'Fotoğraf' },
                { value: 'video', label: 'Video' },
                { value: 'audio', label: 'Ses' },
                { value: 'link', label: 'Bağlantı' },
                { value: 'warning', label: 'Uyarı' },
                { value: 'custom', label: 'Özel' },
              ]}
              onChange={(v) => onUpdate('icon', v)}
            />
          </FieldGroup>
          <FieldGroup label="Etiket">
            <input
              type="text"
              value={(properties.label as string) || ''}
              onChange={(e) => onUpdate('label', e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded-md bg-editor-surface border border-editor-border text-editor-text focus:outline-none focus:border-editor-accent"
            />
          </FieldGroup>
          <FieldGroup label="Açılır Pencere Stili">
            <SelectInput
              value={properties.popup_style as string}
              options={[
                { value: 'tooltip', label: 'İpucu' },
                { value: 'modal', label: 'Modal' },
                { value: 'panel', label: 'Panel' },
                { value: 'inline', label: 'Satır İçi' },
                { value: 'none', label: 'Yok' },
              ]}
              onChange={(v) => onUpdate('popup_style', v)}
            />
          </FieldGroup>
          <FieldGroup label="Titreşim Animasyonu">
            <ToggleInput value={properties.pulse_animation as boolean} onChange={(v) => onUpdate('pulse_animation', v)} />
          </FieldGroup>
          <FieldGroup label="Boyut">
            <SelectInput
              value={properties.size as string}
              options={[
                { value: 'sm', label: 'Küçük' },
                { value: 'md', label: 'Orta' },
                { value: 'lg', label: 'Büyük' },
              ]}
              onChange={(v) => onUpdate('size', v)}
            />
          </FieldGroup>
        </div>
      );

    case 'import':
      return (
        <div className="space-y-3">
          <FieldGroup label="Dosya URL">
            <input
              type="text"
              value={(properties.file_url as string) || ''}
              onChange={(e) => onUpdate('file_url', e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded-md bg-editor-surface border border-editor-border text-editor-text focus:outline-none focus:border-editor-accent"
            />
          </FieldGroup>
          <FieldGroup label="Orijinal Dosya Adı">
            <input
              type="text"
              value={(properties.original_filename as string) || ''}
              onChange={(e) => onUpdate('original_filename', e.target.value)}
              placeholder="otomatik algılanır"
              className="w-full px-2 py-1.5 text-xs rounded-md bg-editor-surface border border-editor-border text-editor-text focus:outline-none focus:border-editor-accent"
            />
          </FieldGroup>
          <FieldGroup label="Dosya Türü">
            <SelectInput
              value={properties.file_type as string}
              options={[
                { value: 'image', label: 'Görsel' },
                { value: 'video', label: 'Video' },
                { value: 'audio', label: 'Ses' },
                { value: 'model-3d', label: '3B Model' },
                { value: 'document', label: 'Belge' },
                { value: 'geojson', label: 'GeoJSON' },
                { value: 'csv', label: 'CSV' },
                { value: 'json', label: 'JSON' },
                { value: 'unknown', label: 'Bilinmiyor' },
              ]}
              onChange={(v) => onUpdate('file_type', v)}
            />
          </FieldGroup>
          <FieldGroup label="Çözümlenmiş Tür">
            <input
              type="text"
              value={(properties.resolved_type as string) || ''}
              readOnly
              className="w-full px-2 py-1.5 text-xs rounded-md bg-editor-bg border border-editor-border text-editor-text-muted font-mono focus:outline-none cursor-default"
            />
          </FieldGroup>
          <FieldGroup label="Otomatik İşle">
            <ToggleInput value={properties.auto_process as boolean} onChange={(v) => onUpdate('auto_process', v)} />
          </FieldGroup>
        </div>
      );

    case 'group':
      return (
        <div className="space-y-3">
          <FieldGroup label="Açıklama">
            <input
              type="text"
              value={(properties.description as string) || ''}
              onChange={(e) => onUpdate('description', e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded-md bg-editor-surface border border-editor-border text-editor-text focus:outline-none focus:border-editor-accent"
            />
          </FieldGroup>
          <FieldGroup label="Renk">
            <ColorInput value={properties.color as string} onChange={(v) => onUpdate('color', v)} />
          </FieldGroup>
          <FieldGroup label="Varsayılan Kapalı">
            <ToggleInput value={properties.collapsed_default as boolean} onChange={(v) => onUpdate('collapsed_default', v)} />
          </FieldGroup>
          <FieldGroup label="Alt Öğeleri Kilitle">
            <ToggleInput value={properties.lock_children as boolean} onChange={(v) => onUpdate('lock_children', v)} />
          </FieldGroup>
          <FieldGroup label="İkon">
            <SelectInput
              value={properties.icon as string}
              options={[
                { value: 'folder', label: 'Klasör' },
                { value: 'collection', label: 'Koleksiyon' },
                { value: 'chapter', label: 'Bölüm' },
                { value: 'section', label: 'Kısım' },
                { value: 'custom', label: 'Özel' },
              ]}
              onChange={(v) => onUpdate('icon', v)}
            />
          </FieldGroup>
        </div>
      );

    default:
      return (
        <div className="text-xs text-editor-text-muted">
          <p className="mb-2">Özellikler:</p>
          <pre className="p-2 rounded bg-editor-bg text-[10px] font-mono overflow-auto max-h-[300px]">
            {JSON.stringify(properties, null, 2)}
          </pre>
        </div>
      );
  }
}

// Reusable input components

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={value ?? 0}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-full px-2 py-1.5 text-xs rounded-md bg-editor-surface border border-editor-border text-editor-text font-mono focus:outline-none focus:border-editor-accent"
    />
  );
}

function SelectInput({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value || options[0]?.value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1.5 text-xs rounded-md bg-editor-surface border border-editor-border text-editor-text focus:outline-none focus:border-editor-accent"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function ToggleInput({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-9 h-5 rounded-full transition-colors ${
        value ? 'bg-editor-accent' : 'bg-editor-border'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
          value ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || '#3b82f6'}
        onChange={(e) => onChange(e.target.value)}
        className="w-7 h-7 rounded border border-editor-border cursor-pointer"
      />
      <input
        type="text"
        value={value || '#3b82f6'}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-2 py-1.5 text-xs rounded-md bg-editor-surface border border-editor-border text-editor-text font-mono focus:outline-none focus:border-editor-accent"
      />
    </div>
  );
}
