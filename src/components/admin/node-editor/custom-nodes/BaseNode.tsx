import { memo, useCallback, useState, useRef, useEffect, type ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  MapPin,
  Film,
  FileText,
  Cloud,
  Target,
  DoorOpen,
  Navigation,
  FolderOpen,
  Upload,
  BookOpen,
  Sparkles,
  PenTool,
  Layers,
  Route,
  AlertTriangle,
  Eye,
  EyeOff,
  type LucideIcon,
} from 'lucide-react';
import { NODE_TYPE_CONFIG, SELECTION_COLOR } from '@/lib/constants';
import type { NodeType } from '@/lib/types/nodes';

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------
const ICON_MAP: Record<string, LucideIcon> = {
  MapPin,
  Film,
  FileText,
  Cloud,
  Target,
  DoorOpen,
  Navigation,
  FolderOpen,
  Upload,
  BookOpen,
  Sparkles,
  PenTool,
  Layers,
  Route,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface BaseNodeProps {
  data: Record<string, unknown>;
  selected?: boolean;
  type: NodeType;
  /** Compact summary shown below header (always visible) */
  compact?: ReactNode;
  /** Expanded detail shown only when toggled open */
  children?: ReactNode;
  /** Override the default click-to-toggle expand behaviour */
  onHeaderClick?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function BaseNodeInner({
  data,
  selected,
  type,
  compact,
  children,
  onHeaderClick,
}: BaseNodeProps) {
  const config = NODE_TYPE_CONFIG[type];
  const Icon = ICON_MAP[config.icon];
  const label = (data.label as string) ?? config.label;
  const isExpanded = (data.isExpanded as boolean) ?? false;
  const nodeId = data.id as string;
  const warnings = (data.warnings as number) ?? 0;
  const props = (data.properties as Record<string, unknown>) ?? {};
  const mapVisible = props.map_visible !== false;

  // Inline rename state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(label);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  // Listen for rename request from keyboard shortcut (F2)
  useEffect(() => {
    const handler = (e: Event) => {
      const { nodeId: targetId } = (e as CustomEvent).detail;
      if (targetId === nodeId) {
        setRenameValue(label);
        setIsRenaming(true);
      }
    };
    window.addEventListener('node-rename-request', handler);
    return () => window.removeEventListener('node-rename-request', handler);
  }, [nodeId, label]);

  const commitRename = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== label) {
      window.dispatchEvent(
        new CustomEvent('node-rename-commit', { detail: { nodeId, label: trimmed } })
      );
    }
    setIsRenaming(false);
  }, [renameValue, label, nodeId]);

  const handleToggle = useCallback(() => {
    if (onHeaderClick) {
      onHeaderClick();
      return;
    }
    window.dispatchEvent(
      new CustomEvent('node-toggle-expand', { detail: { nodeId } })
    );
  }, [nodeId, onHeaderClick]);

  const handleToggleVisibility = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(
      new CustomEvent('node-toggle-visibility', { detail: { nodeId } })
    );
  }, [nodeId]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameValue(label);
    setIsRenaming(true);
  }, [label]);

  const borderColor = selected ? SELECTION_COLOR : 'var(--editor-border)';
  const shadowSelected = `0 0 0 1.5px ${SELECTION_COLOR}66, 0 2px 8px rgba(0,0,0,0.3)`;
  const shadowDefault = '0 1px 4px rgba(0,0,0,0.2)';

  return (
    <div
      className="group/node relative"
      style={{
        width: 160,
        minWidth: 140,
        maxWidth: 200,
        borderRadius: 8,
        overflow: 'visible',
        border: `1.5px solid ${borderColor}`,
        boxShadow: selected ? shadowSelected : shadowDefault,
        background: 'var(--editor-surface)',
        fontFamily: 'Inter, system-ui, sans-serif',
        transition: 'border-color 0.12s ease, box-shadow 0.12s ease, opacity 0.15s ease',
        opacity: mapVisible ? 1 : 0.45,
      }}
    >
      {/* ---- Header strip: 24px tall ---- */}
      <div
        onClick={handleToggle}
        onDoubleClick={handleDoubleClick}
        className="flex items-center gap-1.5 cursor-pointer select-none"
        style={{
          height: 24,
          padding: '0 8px',
          background: config.color,
          borderRadius: '6.5px 6.5px 0 0',
        }}
      >
        {Icon && (
          <Icon
            size={11}
            color="#fff"
            strokeWidth={2.4}
            className="shrink-0"
          />
        )}
        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            onBlur={commitRename}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className="nodrag nopan flex-1 min-w-0 text-[10.5px] font-semibold px-0.5 py-0 rounded-sm bg-white/20 border border-white/30 text-white focus:outline-none focus:border-white/60 selection:bg-white/30"
            style={{ lineHeight: 1 }}
          />
        ) : (
          <span
            className="truncate"
            style={{
              color: '#fff',
              fontSize: 10.5,
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: '0.01em',
            }}
          >
            {label}
          </span>
        )}
        <div className="flex items-center gap-0.5 ml-auto shrink-0">
          <button
            onClick={handleToggleVisibility}
            className="nodrag nopan flex items-center justify-center w-4 h-4 rounded-sm opacity-0 group-hover/node:opacity-100 transition-opacity hover:bg-white/20"
            title={mapVisible ? 'Haritada Gizle' : 'Haritada Göster'}
            style={{ opacity: mapVisible ? undefined : 1 }}
          >
            {mapVisible ? (
              <Eye size={9} color="#fff" strokeWidth={2} />
            ) : (
              <EyeOff size={9} color="#fff" strokeWidth={2} className="opacity-60" />
            )}
          </button>
          {warnings > 0 && (
            <AlertTriangle size={10} color="#f59e0b" className="shrink-0" />
          )}
        </div>
      </div>

      {/* ---- Compact summary (always visible) ---- */}
      {compact && (
        <div
          className="px-2 py-1"
          style={{
            borderTop: '1px solid var(--editor-border)',
          }}
        >
          {compact}
        </div>
      )}

      {/* ---- Expanded detail ---- */}
      {isExpanded && children && (
        <div
          className="px-2 py-1.5"
          style={{
            borderTop: '1px solid var(--editor-border)',
          }}
        >
          {children}
        </div>
      )}

      {/* Left = input (target) */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{
          top: '50%',
          width: 10,
          height: 10,
          minWidth: 10,
          minHeight: 10,
          borderRadius: '50%',
          background: '#94a3b8',
          border: '2px solid var(--editor-surface)',
          left: -5,
          cursor: 'crosshair',
        }}
      />

      {/* Right = output (source) */}
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{
          top: '50%',
          width: 10,
          height: 10,
          minWidth: 10,
          minHeight: 10,
          borderRadius: '50%',
          background: '#94a3b8',
          border: '2px solid var(--editor-surface)',
          right: -5,
          cursor: 'crosshair',
        }}
      />
    </div>
  );
}

const BaseNode = memo(BaseNodeInner);
export default BaseNode;
