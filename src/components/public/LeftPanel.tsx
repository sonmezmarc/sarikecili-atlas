'use client';

import { useSceneStore } from '@/stores/sceneStore';
import { useLayerStore } from '@/stores/layerStore';
import { SEASONS } from '@/lib/constants';
import { useTimeStore } from '@/stores/timeStore';

export default function LeftPanel() {
  const { setDiscoverOpen } = useSceneStore();
  const { layers, visibilityMap, toggleLayer } = useLayerStore();
  const { activeSeason, setActiveSeason } = useTimeStore();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-stone-900/95 backdrop-blur-sm text-white z-40 flex flex-col overflow-y-auto border-r border-white/10">
      {/* Atlas Title */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-lg font-light tracking-[0.2em] text-white/90">
          SARIKEÇİLİ
        </h1>
        <p className="text-xs text-white/50 tracking-wider mt-1">
          Dijital Kültürel Harita
        </p>
      </div>

      {/* Discover Button */}
      <div className="px-5 pb-4">
        <button
          onClick={() => setDiscoverOpen(true)}
          className="w-full py-3 px-4 bg-amber-700/80 hover:bg-amber-700 text-white text-sm font-medium tracking-wider uppercase rounded transition-all duration-300 animate-pulse hover:animate-none"
        >
          Sarıkeçilileri Keşfet
        </button>
      </div>

      <div className="w-full h-[1px] bg-white/10" />

      {/* Legend */}
      <div className="px-5 py-4">
        <h3 className="text-xs font-medium tracking-wider uppercase text-white/40 mb-3">
          Lejant
        </h3>
        <div className="space-y-2.5 text-sm">
          <LegendItem color="#60a5fa" shape="circle" label="Kışlak" />
          <LegendItem color="#fbbf24" shape="circle" label="Yayla" />
          <LegendItem color="#a78bfa" shape="circle" label="Konalga" />
          <LegendItem color="#f87171" shape="diamond" label="Somut Miras" />
          <LegendItem color="#34d399" shape="ring" label="Somut Olmayan Miras" />
          <LegendItem color="#94a3b8" shape="line" label="Göç Rotası" />
        </div>
      </div>

      <div className="w-full h-[1px] bg-white/10" />

      {/* Layers */}
      <div className="px-5 py-4">
        <h3 className="text-xs font-medium tracking-wider uppercase text-white/40 mb-3">
          Katmanlar
        </h3>
        <div className="space-y-2">
          {layers.length > 0 ? (
            layers.map((layer) => (
              <label key={layer.id} className="flex items-center gap-2 text-sm cursor-pointer group">
                <input
                  type="checkbox"
                  checked={visibilityMap[layer.id] ?? true}
                  onChange={() => toggleLayer(layer.id)}
                  className="rounded border-white/30 bg-white/10 text-amber-600 focus:ring-amber-600/50"
                />
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: layer.color }}
                />
                <span className="text-white/70 group-hover:text-white/90 transition-colors">
                  {layer.name}
                </span>
              </label>
            ))
          ) : (
            <p className="text-xs text-white/30 italic">Katman yapılandırılmamış</p>
          )}
        </div>
      </div>

      <div className="w-full h-[1px] bg-white/10" />

      {/* Season Filter (compact) */}
      <div className="px-5 py-4">
        <h3 className="text-xs font-medium tracking-wider uppercase text-white/40 mb-3">
          Mevsim
        </h3>
        <div className="space-y-1">
          {SEASONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSeason(s.key)}
              className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                activeSeason === s.key
                  ? 'bg-amber-700/60 text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              {s.label}
              {s.months && (
                <span className="text-xs text-white/30 ml-2">{s.months}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full h-[1px] bg-white/10" />

      {/* Guided Tour */}
      <div className="px-5 py-4">
        <button className="w-full py-2 px-4 border border-white/20 text-white/60 hover:text-white hover:border-white/40 text-sm tracking-wider uppercase rounded transition-all">
          Rehberli Tur Başlat
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Credits */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-[10px] text-white/30 leading-relaxed">
          Sarıkeçili Yörükleri Dijital Kültürel Haritası
        </p>
        <p className="text-[10px] text-white/20 mt-1">
          Gizem Büyükgüner Sönmez, 2026
        </p>
      </div>
    </aside>
  );
}

function LegendItem({
  color,
  shape,
  label,
}: {
  color: string;
  shape: 'circle' | 'diamond' | 'ring' | 'line';
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
        {shape === 'circle' && (
          <circle cx="7" cy="7" r="4.5" fill={color} opacity={0.9} />
        )}
        {shape === 'diamond' && (
          <rect x="3" y="3" width="8" height="8" rx="1.5" fill={color} opacity={0.9} transform="rotate(45 7 7)" />
        )}
        {shape === 'ring' && (
          <circle cx="7" cy="7" r="4" fill="none" stroke={color} strokeWidth="1.8" opacity={0.9} />
        )}
        {shape === 'line' && (
          <line x1="1" y1="7" x2="13" y2="7" stroke={color} strokeWidth="2" strokeDasharray="3 2" opacity={0.7} />
        )}
      </svg>
      <span className="text-white/60 text-[13px]">{label}</span>
    </div>
  );
}
