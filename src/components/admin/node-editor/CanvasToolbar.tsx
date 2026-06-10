'use client';

import { useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { CANVAS_EVENTS } from '@/lib/constants';
import type { AtlasNode } from '@/lib/types/nodes';
import type { LucideIcon } from 'lucide-react';
import {
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  LayoutGrid,
  StickyNote,
  ArrowLeftRight,
  Grid3x3,
  Magnet,
  Search,
  Check,
  Loader2,
  AlertCircle,
  Upload,
} from 'lucide-react';
import GISImportDialog from './GISImportDialog';

interface CanvasToolbarProps {
  nodes: AtlasNode[];
  onAlignNodes?: (direction: 'horizontal' | 'vertical') => void;
  onDistributeNodes?: (direction: 'horizontal' | 'vertical') => void;
  onAutoLayout?: () => void;
  onAddPinUpNote?: () => void;
}

export default function CanvasToolbar({}: CanvasToolbarProps) {
  const [showImport, setShowImport] = useState(false);
  const {
    gridEnabled,
    snapToGrid,
    snapToNode,
    toggleGrid,
    toggleSnapToGrid,
    toggleSnapToNode,
    searchQuery,
    setSearchQuery,
    isDirty,
    isSaving,
    lastSavedAt,
  } = useEditorStore();

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b border-editor-border bg-editor-toolbar shrink-0">
      {/* Align buttons */}
      <ToolbarButton
        icon={AlignCenterHorizontal}
        title="Yatay Hizala"
        onClick={() => window.dispatchEvent(new CustomEvent(CANVAS_EVENTS.ALIGN, { detail: { direction: 'horizontal' } }))}
      />
      <ToolbarButton
        icon={AlignCenterVertical}
        title="Dikey Hizala"
        onClick={() => window.dispatchEvent(new CustomEvent(CANVAS_EVENTS.ALIGN, { detail: { direction: 'vertical' } }))}
      />
      <ToolbarButton
        icon={AlignHorizontalDistributeCenter}
        title="Yatay Dağıt"
        onClick={() => window.dispatchEvent(new CustomEvent(CANVAS_EVENTS.DISTRIBUTE, { detail: { direction: 'horizontal' } }))}
      />
      <ToolbarButton
        icon={AlignVerticalDistributeCenter}
        title="Dikey Dağıt"
        onClick={() => window.dispatchEvent(new CustomEvent(CANVAS_EVENTS.DISTRIBUTE, { detail: { direction: 'vertical' } }))}
      />

      {/* Separator */}
      <div className="w-px h-4 bg-editor-border mx-1" />

      {/* Auto-layout */}
      <ToolbarButton
        icon={LayoutGrid}
        title="Otomatik Yerleşim"
        onClick={() => window.dispatchEvent(new CustomEvent(CANVAS_EVENTS.AUTO_LAYOUT))}
      />

      {/* Pin-up note */}
      <ToolbarButton
        icon={StickyNote}
        title="Not Ekle"
        onClick={() => window.dispatchEvent(new CustomEvent(CANVAS_EVENTS.ADD_PINUP, { detail: { x: 200, y: 200 } }))}
      />

      {/* Handle toggle */}
      <ToolbarButton
        icon={ArrowLeftRight}
        title="Tutamaç Konumunu Değiştir"
        onClick={() => window.dispatchEvent(new CustomEvent(CANVAS_EVENTS.TOGGLE_HANDLES))}
      />

      {/* Separator */}
      <div className="w-px h-4 bg-editor-border mx-1" />

      {/* Grid toggle */}
      <ToolbarButton
        icon={Grid3x3}
        title={gridEnabled ? 'Izgarayı Gizle' : 'Izgarayı Göster'}
        active={gridEnabled}
        onClick={toggleGrid}
      />

      {/* Snap to grid toggle */}
      <ToolbarButton
        icon={Magnet}
        title={snapToGrid ? 'Izgaraya Yapışmayı Kapat' : 'Izgaraya Yapışmayı Aç'}
        active={snapToGrid}
        onClick={toggleSnapToGrid}
      />

      {/* Snap to node toggle */}
      <ToolbarButton
        icon={Magnet}
        title={snapToNode ? 'Düğüme Yapışmayı Kapat' : 'Düğüme Yapışmayı Aç'}
        active={snapToNode}
        onClick={toggleSnapToNode}
      />

      {/* Separator */}
      <div className="w-px h-4 bg-editor-border mx-1" />

      {/* GIS Import */}
      <ToolbarButton
        icon={Upload}
        title="GIS İçe Aktar"
        onClick={() => setShowImport(true)}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative mr-2">
        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-editor-text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Düğüm ara..."
          className="w-40 pl-6 pr-2 py-1 text-xs rounded-md bg-editor-surface border border-editor-border text-editor-text placeholder:text-editor-text-muted focus:outline-none focus:border-editor-accent focus:w-56 transition-all"
        />
      </div>

      {/* Auto-save indicator */}
      <div className="flex items-center gap-1 text-[11px] min-w-[80px] justify-end">
        {isSaving ? (
          <>
            <Loader2 size={12} className="animate-spin text-editor-text-muted" />
            <span className="text-editor-text-muted">Kaydediliyor...</span>
          </>
        ) : isDirty ? (
          <>
            <AlertCircle size={12} className="text-amber-500" />
            <span className="text-amber-500">Kaydedilmedi</span>
          </>
        ) : lastSavedAt ? (
          <>
            <Check size={12} className="text-green-500" />
            <span className="text-green-500">Kaydedildi</span>
          </>
        ) : (
          <span className="text-editor-text-muted">Hazır</span>
        )}
      </div>

      {/* GIS Import Dialog */}
      <GISImportDialog open={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  title,
  active,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
        active
          ? 'bg-editor-accent/15 text-editor-accent'
          : 'text-editor-text-muted hover:text-editor-text hover:bg-editor-surface-hover'
      }`}
    >
      <Icon size={14} />
    </button>
  );
}
