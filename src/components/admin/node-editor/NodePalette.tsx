'use client';

import { NODE_TYPES, NODE_TYPE_CONFIG } from '@/lib/constants';
import type { LucideIcon } from 'lucide-react';
import {
  MapPin, Film, FileText, Cloud, Target, DoorOpen, Navigation, FolderOpen,
  Upload, BookOpen, Sparkles, PenTool, Layers, Route, ChevronDown, ChevronRight,
} from 'lucide-react';
import type { NodeType } from '@/lib/types/nodes';

const ICON_MAP: Record<string, LucideIcon> = {
  MapPin, Film, FileText, Cloud, Target, DoorOpen, Navigation, FolderOpen,
  Upload, BookOpen, Sparkles, PenTool, Layers, Route,
};

interface NodePaletteProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function NodePalette({ collapsed, onToggle }: NodePaletteProps) {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="border-t border-editor-border">
      {/* Toggle header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] uppercase tracking-wider text-editor-text-muted hover:text-editor-text transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        <span>Palet</span>
      </button>

      {/* Node cards */}
      {!collapsed && (
        <div className="px-2 pb-2 space-y-0.5 max-h-[280px] overflow-y-auto custom-scroll">
          {NODE_TYPES.map((type) => {
            const config = NODE_TYPE_CONFIG[type];
            const Icon = ICON_MAP[config.icon];

            return (
              <div
                key={type}
                draggable
                onDragStart={(e) => onDragStart(e, type)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-grab active:cursor-grabbing hover:bg-editor-surface-hover transition-colors group"
              >
                <div
                  className="w-1 h-6 rounded-full shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                {Icon && (
                  <Icon
                    size={14}
                    className="shrink-0 text-editor-text-muted group-hover:text-editor-text transition-colors"
                  />
                )}
                <span className="text-xs text-editor-text-secondary group-hover:text-editor-text truncate transition-colors">
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
