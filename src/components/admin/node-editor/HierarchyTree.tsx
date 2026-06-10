'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useEditorStore } from '@/stores/editorStore';
import { NODE_TYPE_CONFIG, NODE_TYPES, SELECTION_COLOR } from '@/lib/constants';
import type { AtlasNode, AtlasEdge, NodeType } from '@/lib/types/nodes';
import type { LucideIcon } from 'lucide-react';
import {
  MapPin, Film, FileText, Cloud, Target, DoorOpen, Navigation, FolderOpen,
  Upload, BookOpen, Sparkles, PenTool, Layers, Route,
  ChevronRight, ChevronDown, Search, Plus,
  Trash2, Copy, ClipboardPaste, Edit3, FolderPlus, ArrowDownRight,
  Eye, EyeOff,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Icon map — resolve string icon names from NODE_TYPE_CONFIG to Lucide components
// ---------------------------------------------------------------------------
const ICON_MAP: Record<string, LucideIcon> = {
  MapPin, Film, FileText, Cloud, Target, DoorOpen, Navigation, FolderOpen,
  Upload, BookOpen, Sparkles, PenTool, Layers, Route,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface HierarchyTreeProps {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  onCreateNode?: (type: NodeType, x: number, y: number, parentId?: string | null) => AtlasNode;
  onUpdateNode?: (id: string, changes: Partial<AtlasNode>) => void;
  onDeleteNode?: (id: string, withChildren: boolean) => void;
}

// ---------------------------------------------------------------------------
// Context-menu data
// ---------------------------------------------------------------------------
interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
}

// Drag-drop transfer
interface DragState {
  draggingId: string | null;
  overTargetId: string | null;
  dropPosition: 'above' | 'below' | 'inside' | null;
}

// ---------------------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------------------

/** Return children of a given parentId, sorted by created_at. */
function getChildren(nodes: AtlasNode[], parentId: string | null): AtlasNode[] {
  return nodes
    .filter((n) => n.parent_id === parentId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** Recursively count all descendants (children, grandchildren, ...). */
function countDescendants(nodeId: string, nodes: AtlasNode[], depth = 0, maxDepth = 20): number {
  if (depth >= maxDepth) return 0;
  const children = nodes.filter((n) => n.parent_id === nodeId);
  return children.reduce((sum, c) => sum + 1 + countDescendants(c.id, nodes, depth + 1, maxDepth), 0);
}

/** Recursively collect all descendant ids. */
function collectDescendantIds(nodeId: string, nodes: AtlasNode[], depth = 0, maxDepth = 20): string[] {
  if (depth >= maxDepth) return [];
  const children = nodes.filter((n) => n.parent_id === nodeId);
  const ids: string[] = [];
  for (const c of children) {
    ids.push(c.id);
    ids.push(...collectDescendantIds(c.id, nodes, depth + 1, maxDepth));
  }
  return ids;
}

/** Check if node or any descendant matches search query. */
function nodeMatchesSearch(node: AtlasNode, allNodes: AtlasNode[], query: string): boolean {
  const q = query.toLowerCase();
  if (node.label.toLowerCase().includes(q) || node.type.toLowerCase().includes(q)) return true;
  return allNodes
    .filter((n) => n.parent_id === node.id)
    .some((child) => nodeMatchesSearch(child, allNodes, q));
}

// ---------------------------------------------------------------------------
// Context Menu Component (rendered via portal)
// ---------------------------------------------------------------------------

interface ContextMenuProps {
  x: number;
  y: number;
  node: AtlasNode;
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onAddChild: (type: NodeType) => void;
  onCreateGroup: () => void;
  onDrillIn: () => void;
  hasClipboard: boolean;
}

function ContextMenu({
  x, y, node, nodes, onClose,
  onRename, onDelete, onDuplicate, onCopy, onPaste,
  onAddChild, onCreateGroup, onDrillIn, hasClipboard,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [subMenuOpen, setSubMenuOpen] = useState(false);
  const [adjustedPos, setAdjustedPos] = useState({ x, y });

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    let ax = x;
    let ay = y;
    if (x + rect.width > window.innerWidth - 8) ax = window.innerWidth - rect.width - 8;
    if (y + rect.height > window.innerHeight - 8) ay = window.innerHeight - rect.height - 8;
    if (ax < 4) ax = 4;
    if (ay < 4) ay = 4;
    setAdjustedPos({ x: ax, y: ay });
  }, [x, y]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const descendantCount = countDescendants(node.id, nodes);

  const menuItemClass =
    'flex items-center gap-2 px-3 py-1.5 text-xs text-[#c8c8c8] hover:bg-[#3a3a3a] cursor-pointer transition-colors w-full text-left';
  const disabledClass =
    'flex items-center gap-2 px-3 py-1.5 text-xs text-[#666] cursor-not-allowed w-full text-left';

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[200px] py-1 bg-[#252525] border border-[#444] rounded-md shadow-xl"
      style={{ left: adjustedPos.x, top: adjustedPos.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Rename */}
      <button className={menuItemClass} onClick={() => { onRename(); onClose(); }}>
        <Edit3 size={13} className="text-[#8a8a8a] shrink-0" />
        <span>Yeniden Adlandır</span>
        <span className="ml-auto text-[10px] text-[#666]">F2</span>
      </button>

      {/* Delete */}
      <button className={menuItemClass} onClick={() => { onDelete(); onClose(); }}>
        <Trash2 size={13} className="text-[#e55] shrink-0" />
        <span>Sil</span>
        {descendantCount > 0 && (
          <span className="ml-auto text-[10px] text-[#888] tabular-nums">+{descendantCount}</span>
        )}
        <span className="ml-1 text-[10px] text-[#666]">Del</span>
      </button>

      {/* Duplicate */}
      <button className={menuItemClass} onClick={() => { onDuplicate(); onClose(); }}>
        <Copy size={13} className="text-[#8a8a8a] shrink-0" />
        <span>Çoğalt</span>
      </button>

      {/* Copy */}
      <button className={menuItemClass} onClick={() => { onCopy(); onClose(); }}>
        <Copy size={13} className="text-[#8a8a8a] shrink-0" />
        <span>Kopyala</span>
        <span className="ml-auto text-[10px] text-[#666]">Ctrl+C</span>
      </button>

      {/* Paste */}
      <button
        className={hasClipboard ? menuItemClass : disabledClass}
        onClick={() => { if (hasClipboard) { onPaste(); onClose(); } }}
      >
        <ClipboardPaste size={13} className="shrink-0" />
        <span>Yapıştır</span>
        <span className="ml-auto text-[10px] text-[#666]">Ctrl+V</span>
      </button>

      {/* Separator */}
      <div className="my-1 border-t border-[#3a3a3a]" />

      {/* Add Child — submenu */}
      <div
        className="relative"
        onMouseEnter={() => setSubMenuOpen(true)}
        onMouseLeave={() => setSubMenuOpen(false)}
      >
        <button className={menuItemClass}>
          <Plus size={13} className="text-[#8a8a8a] shrink-0" />
          <span>Yeni Çocuk Ekle</span>
          <ChevronRight size={12} className="ml-auto text-[#666]" />
        </button>

        {subMenuOpen && (
          <div
            className="absolute left-full top-0 ml-0.5 min-w-[180px] py-1 bg-[#252525] border border-[#444] rounded-md shadow-xl z-[10000] max-h-[320px] overflow-y-auto custom-scroll"
          >
            {NODE_TYPES.map((nt) => {
              const cfg = NODE_TYPE_CONFIG[nt];
              const Icon = cfg ? ICON_MAP[cfg.icon] : null;
              return (
                <button
                  key={nt}
                  className={menuItemClass}
                  onClick={() => { onAddChild(nt); onClose(); }}
                >
                  <span className="w-3.5 h-3.5 flex items-center justify-center shrink-0" style={{ color: cfg?.color }}>
                    {Icon && <Icon size={12} />}
                  </span>
                  <span>{cfg?.label || nt}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Group */}
      <button className={menuItemClass} onClick={() => { onCreateGroup(); onClose(); }}>
        <FolderPlus size={13} className="text-[#8a8a8a] shrink-0" />
        <span>Grup Oluştur</span>
      </button>

      {/* Separator */}
      <div className="my-1 border-t border-[#3a3a3a]" />

      {/* Drill In */}
      <button className={menuItemClass} onClick={() => { onDrillIn(); onClose(); }}>
        <ArrowDownRight size={13} className="text-[#8a8a8a] shrink-0" />
        <span>İçine Dal</span>
      </button>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation dialog (portal)
// ---------------------------------------------------------------------------
interface DeleteDialogProps {
  node: AtlasNode;
  descendantCount: number;
  onConfirm: (withChildren: boolean) => void;
  onCancel: () => void;
}

function DeleteDialog({ node, descendantCount, onConfirm, onCancel }: DeleteDialogProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
      <div
        ref={ref}
        className="bg-[#2a2a2a] border border-[#444] rounded-lg p-4 shadow-2xl min-w-[300px] max-w-[400px]"
      >
        <h3 className="text-sm font-medium text-[#e0e0e0] mb-2">Düğümü Sil</h3>
        <p className="text-xs text-[#a0a0a0] mb-1">
          <span className="text-[#e0e0e0] font-medium">&quot;{node.label}&quot;</span> silinecek.
        </p>
        {descendantCount > 0 && (
          <p className="text-xs text-[#e55] mb-3">
            Bu düğümün {descendantCount} alt düğümü var.
          </p>
        )}
        <div className="flex gap-2 justify-end mt-4">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs rounded-md bg-[#333] text-[#c0c0c0] hover:bg-[#3a3a3a] transition-colors border border-[#444]"
          >
            İptal
          </button>
          {descendantCount > 0 && (
            <button
              onClick={() => onConfirm(false)}
              className="px-3 py-1.5 text-xs rounded-md bg-[#444] text-[#e0e0e0] hover:bg-[#555] transition-colors border border-[#555]"
            >
              Sadece Bunu Sil
            </button>
          )}
          <button
            onClick={() => onConfirm(true)}
            className="px-3 py-1.5 text-xs rounded-md bg-[#c53030] text-white hover:bg-[#e53e3e] transition-colors"
          >
            {descendantCount > 0 ? `Hepsini Sil (${descendantCount + 1})` : 'Sil'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Single tree item row
// ---------------------------------------------------------------------------

interface TreeItemProps {
  node: AtlasNode;
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  depth: number;
  searchQuery: string;
  expandedMap: Record<string, boolean>;
  toggleExpanded: (id: string) => void;
  renamingId: string | null;
  renameValue: string;
  setRenamingId: (id: string | null) => void;
  setRenameValue: (v: string) => void;
  onCommitRename: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, nodeId: string) => void;
  focusedId: string | null;
  setFocusedId: (id: string | null) => void;
  dragState: DragState;
  onDragStart: (nodeId: string) => void;
  onDragOver: (e: React.DragEvent, nodeId: string) => void;
  onDragLeave: () => void;
  onDrop: (targetId: string) => void;
  onDragEnd: () => void;
  onCreateNode?: (type: NodeType, x: number, y: number, parentId?: string | null) => AtlasNode;
  onUpdateNode?: (id: string, changes: Partial<AtlasNode>) => void;
  onDeleteNode?: (id: string, withChildren: boolean) => void;
  onItemClick: (nodeId: string, e: React.MouseEvent) => void;
}

function TreeItem({
  node, nodes, edges, depth, searchQuery,
  expandedMap, toggleExpanded,
  renamingId, renameValue, setRenamingId, setRenameValue, onCommitRename,
  onContextMenu,
  focusedId, setFocusedId,
  dragState, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd,
  onItemClick,
}: TreeItemProps) {
  const {
    selectedNodeId, selectedNodeIds,
    drillIntoGroup,
  } = useEditorStore();

  const renameInputRef = useRef<HTMLInputElement>(null);

  const children = getChildren(nodes, node.id);
  const hasChildren = children.length > 0;
  const isSelected = selectedNodeId === node.id || selectedNodeIds.includes(node.id);
  const isFocused = focusedId === node.id;
  const isExpanded = expandedMap[node.id] !== false; // default true
  const config = NODE_TYPE_CONFIG[node.type as NodeType];
  const mapVisible = (node.properties as Record<string, unknown>).map_visible !== false;

  // Focus rename input when entering rename mode (must be before early return)
  useEffect(() => {
    if (renamingId === node.id && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId, node.id]);

  // Search matching
  const matchesSearch =
    !searchQuery ||
    node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    node.type.toLowerCase().includes(searchQuery.toLowerCase());

  const hasMatchingDescendant =
    !searchQuery ||
    matchesSearch ||
    children.some((c) => nodeMatchesSearch(c, nodes, searchQuery));

  if (searchQuery && !matchesSearch && !hasMatchingDescendant) return null;

  // Drag state for this item
  const isDragging = dragState.draggingId === node.id;
  const isDropTarget = dragState.overTargetId === node.id;
  const dropPos = isDropTarget ? dragState.dropPosition : null;

  const handleClick = (e: React.MouseEvent) => {
    onItemClick(node.id, e);
    setFocusedId(node.id);
  };

  const handleDoubleClick = () => {
    drillIntoGroup(node.id);
  };

  const isActiveGroup = useEditorStore.getState().activeGroupId === node.id;

  return (
    <div>
      {/* Drop indicator line — above */}
      {isDropTarget && dropPos === 'above' && (
        <div
          className="h-0.5 rounded-full mx-2"
          style={{ backgroundColor: SELECTION_COLOR, marginLeft: depth * 16 + 4 }}
        />
      )}

      <div
        className={[
          'flex items-center gap-0 pr-2 py-[3px] cursor-pointer transition-colors group relative',
          isSelected ? '' : 'hover:bg-[#2a2a2e]',
          isDragging ? 'opacity-40' : '',
          isDropTarget && dropPos === 'inside' ? 'bg-[#2a2a3a]' : '',
        ].join(' ')}
        style={{
          paddingLeft: 0,
          background: isSelected
            ? 'var(--editor-accent, #4a9eff)'
            : isActiveGroup
              ? '#2a2a3a'
              : undefined,
          outline: isFocused && !isSelected ? `1px solid ${SELECTION_COLOR}44` : undefined,
          outlineOffset: -1,
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => onContextMenu(e, node.id)}
        draggable={renamingId !== node.id}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', node.id);
          onDragStart(node.id);
        }}
        onDragOver={(e) => onDragOver(e, node.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDrop(node.id);
        }}
        onDragEnd={onDragEnd}
      >
        {/* Indent guides + spacing */}
        <div className="flex items-stretch shrink-0" style={{ width: depth * 16 + 4 }}>
          {Array.from({ length: depth }).map((_, i) => (
            <div
              key={i}
              className="shrink-0"
              style={{
                width: 16,
                borderLeft: i > 0 || depth > 0 ? '1px solid #333' : 'none',
                marginLeft: i === 0 ? 4 : 0,
              }}
            />
          ))}
        </div>

        {/* Expand/collapse toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded(node.id);
          }}
          className="w-4 h-4 flex items-center justify-center text-[#777] hover:text-[#bbb] shrink-0 transition-colors"
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )
          ) : (
            <span className="w-3" />
          )}
        </button>

        {/* Label or inline rename input */}
        {renamingId === node.id ? (
          <input
            ref={renameInputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onCommitRename(node.id);
              } else if (e.key === 'Escape') {
                setRenamingId(null);
              }
              e.stopPropagation();
            }}
            onBlur={() => onCommitRename(node.id)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 text-xs px-1 py-0 rounded bg-[#1a1a1e] border border-[#555] text-[#e0e0e0] focus:outline-none focus:border-[#f6d13b] selection:bg-[#f6d13b33]"
          />
        ) : (
          <span
            className={[
              'text-xs truncate flex-1 min-w-0 select-none ml-1',
              isSelected
                ? 'font-medium'
                : searchQuery && matchesSearch
                  ? 'font-medium'
                  : searchQuery && !matchesSearch
                    ? ''
                    : 'group-hover:text-[#d0d0d0]',
            ].join(' ')}
            style={{
              color: isSelected
                ? '#000'
                : !mapVisible
                  ? '#555'
                  : isActiveGroup
                    ? '#e0e0e0'
                    : searchQuery && matchesSearch
                      ? '#e0e0e0'
                      : searchQuery && !matchesSearch
                        ? '#555'
                        : '#a0a0a4',
            }}
          >
            {node.label || config?.label || node.type}
          </span>
        )}

        {/* Visibility toggle */}
        {renamingId !== node.id && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(
                new CustomEvent('node-toggle-visibility', { detail: { nodeId: node.id } })
              );
            }}
            className="w-4 h-4 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              opacity: (node.properties as Record<string, unknown>).map_visible === false ? 1 : undefined,
            }}
            title={
              (node.properties as Record<string, unknown>).map_visible === false
                ? 'Haritada Göster'
                : 'Haritada Gizle'
            }
          >
            {(node.properties as Record<string, unknown>).map_visible === false ? (
              <EyeOff size={11} className="text-[#555]" />
            ) : (
              <Eye size={11} style={{ color: isSelected ? 'rgba(0,0,0,0.5)' : '#666' }} />
            )}
          </button>
        )}

        {/* Child count badge */}
        {hasChildren && renamingId !== node.id && (
          <span
            className="text-[10px] tabular-nums shrink-0 ml-1"
            style={{ color: isSelected ? 'rgba(0,0,0,0.5)' : '#555' }}
          >
            {children.length}
          </span>
        )}
      </div>

      {/* Drop indicator line — below */}
      {isDropTarget && dropPos === 'below' && (
        <div
          className="h-0.5 rounded-full mx-2"
          style={{ backgroundColor: SELECTION_COLOR, marginLeft: depth * 16 + 4 }}
        />
      )}

      {/* Children (recursive) */}
      {isExpanded && hasChildren && (
        <div className="relative">
          {/* Vertical indent guide line for this level */}
          <div
            className="absolute top-0 bottom-0"
            style={{
              left: depth * 16 + 4 + 8,
              width: 1,
              background: '#333',
            }}
          />
          {children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              nodes={nodes}
              edges={edges}
              depth={depth + 1}
              searchQuery={searchQuery}
              expandedMap={expandedMap}
              toggleExpanded={toggleExpanded}
              renamingId={renamingId}
              renameValue={renameValue}
              setRenamingId={setRenamingId}
              setRenameValue={setRenameValue}
              onCommitRename={onCommitRename}
              onContextMenu={onContextMenu}
              focusedId={focusedId}
              setFocusedId={setFocusedId}
              dragState={dragState}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main HierarchyTree component
// ---------------------------------------------------------------------------
export default function HierarchyTree({
  nodes,
  edges,
  onCreateNode,
  onUpdateNode,
  onDeleteNode,
}: HierarchyTreeProps) {
  const {
    searchQuery, setSearchQuery,
    groupStack,
    selectedNodeId,
    selectNode, selectMultiple, drillIntoGroup, drillOut, drillToRoot,
    clipboardNodes,
    setClipboard,
  } = useEditorStore();

  // Local state
  const [localSearch, setLocalSearch] = useState('');
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<AtlasNode | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    draggingId: null,
    overTargetId: null,
    dropPosition: null,
  });

  const treeContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastClickedIdRef = useRef<string | null>(null);

  const effectiveSearch = localSearch || searchQuery;

  // Root nodes — always show full tree from root (null)
  const rootNodes = useMemo(() => getChildren(nodes, null), [nodes]);

  // Breadcrumb from groupStack
  const breadcrumbItems = useMemo(() =>
    groupStack.map((id) => {
      const node = nodes.find((n) => n.id === id);
      return { id, label: node?.label || 'Grup' };
    }),
    [groupStack, nodes]
  );

  // -----------------------------------------------------------------------
  // Expand/collapse
  // -----------------------------------------------------------------------
  const toggleExpanded = useCallback((id: string) => {
    setExpandedMap((prev) => ({ ...prev, [id]: prev[id] === false ? true : false }));
  }, []);

  // -----------------------------------------------------------------------
  // Unified click handler — handles normal, Shift (range), Ctrl (toggle)
  // Anchor ref is updated SYNCHRONOUSLY to avoid useEffect timing issues
  // -----------------------------------------------------------------------
  const { addToSelection } = useEditorStore();

  const handleItemClick = useCallback((nodeId: string, e: React.MouseEvent) => {
    if (e.shiftKey) {
      // --- Range select ---
      const anchorId = lastClickedIdRef.current;
      if (!anchorId) {
        selectNode(nodeId, nodes.find((n) => n.id === nodeId)?.type as NodeType);
        lastClickedIdRef.current = nodeId;
        return;
      }

      const flatList = getVisibleFlatList(nodes, null, expandedMap, effectiveSearch);
      const anchorIdx = flatList.findIndex((n) => n.id === anchorId);
      const clickedIdx = flatList.findIndex((n) => n.id === nodeId);

      if (anchorIdx === -1 || clickedIdx === -1) {
        selectNode(nodeId, nodes.find((n) => n.id === nodeId)?.type as NodeType);
        lastClickedIdRef.current = nodeId;
        return;
      }

      const start = Math.min(anchorIdx, clickedIdx);
      const end = Math.max(anchorIdx, clickedIdx);
      const rangeIds = flatList.slice(start, end + 1).map((n) => n.id);
      selectMultiple(rangeIds);
      // Anchor stays — don't update lastClickedIdRef
    } else if (e.ctrlKey || e.metaKey) {
      // --- Toggle select ---
      addToSelection(nodeId);
      // Don't move anchor on ctrl-click
    } else {
      // --- Normal click ---
      selectNode(nodeId, nodes.find((n) => n.id === nodeId)?.type as NodeType);
      lastClickedIdRef.current = nodeId; // Set anchor SYNCHRONOUSLY
    }
  }, [nodes, expandedMap, effectiveSearch, selectNode, selectMultiple, addToSelection]);

  // -----------------------------------------------------------------------
  // Inline rename
  // -----------------------------------------------------------------------
  const startRename = useCallback((id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    setRenameValue(node.label);
    setRenamingId(id);
  }, [nodes]);

  const commitRename = useCallback((id: string) => {
    if (onUpdateNode && renameValue.trim()) {
      onUpdateNode(id, { label: renameValue.trim() });
    }
    setRenamingId(null);
  }, [onUpdateNode, renameValue]);

  // -----------------------------------------------------------------------
  // Context menu handlers
  // -----------------------------------------------------------------------
  const handleContextMenu = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
    selectNode(nodeId, nodes.find((n) => n.id === nodeId)?.type as NodeType);
    setFocusedId(nodeId);
  }, [selectNode, nodes]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Context menu actions
  const ctxNode = contextMenu ? nodes.find((n) => n.id === contextMenu.nodeId) : null;

  const handleCtxRename = useCallback(() => {
    if (contextMenu) startRename(contextMenu.nodeId);
  }, [contextMenu, startRename]);

  const handleCtxDelete = useCallback(() => {
    if (!contextMenu) return;
    const node = nodes.find((n) => n.id === contextMenu.nodeId);
    if (!node) return;
    setDeleteDialog(node);
  }, [contextMenu, nodes]);

  const handleCtxDuplicate = useCallback(() => {
    if (!contextMenu || !onCreateNode) return;
    const node = nodes.find((n) => n.id === contextMenu.nodeId);
    if (!node) return;

    // Create a duplicate as sibling with offset position
    const newNode = onCreateNode(
      node.type as NodeType,
      node.canvas_x + 40,
      node.canvas_y + 40,
      node.parent_id
    );

    // Copy label & properties
    if (onUpdateNode) {
      onUpdateNode(newNode.id, {
        label: `${node.label} (copy)`,
        properties: { ...node.properties },
        seasons: [...node.seasons],
      });
    }

    // Recursively duplicate children
    const duplicateChildren = (sourceParentId: string, newParentId: string) => {
      const childNodes = nodes.filter((n) => n.parent_id === sourceParentId);
      for (const child of childNodes) {
        const newChild = onCreateNode(
          child.type as NodeType,
          child.canvas_x + 40,
          child.canvas_y + 40,
          newParentId
        );
        if (onUpdateNode) {
          onUpdateNode(newChild.id, {
            label: child.label,
            properties: { ...child.properties },
            seasons: [...child.seasons],
          });
        }
        duplicateChildren(child.id, newChild.id);
      }
    };
    duplicateChildren(node.id, newNode.id);
  }, [contextMenu, nodes, onCreateNode, onUpdateNode]);

  const handleCtxCopy = useCallback(() => {
    if (!contextMenu) return;
    const node = nodes.find((n) => n.id === contextMenu.nodeId);
    if (!node) return;
    // Copy node and all descendants
    const descendantIds = collectDescendantIds(node.id, nodes);
    const allIds = [node.id, ...descendantIds];
    const copiedNodes = nodes.filter((n) => allIds.includes(n.id));
    const copiedEdges = edges.filter(
      (e) => allIds.includes(e.source_node_id) && allIds.includes(e.target_node_id)
    );
    setClipboard(copiedNodes, copiedEdges);
  }, [contextMenu, nodes, edges, setClipboard]);

  const handleCtxPaste = useCallback(() => {
    if (!contextMenu || !onCreateNode || clipboardNodes.length === 0) return;
    const parentId = contextMenu.nodeId;

    // Build a mapping from old IDs to new IDs
    const idMap: Record<string, string> = {};

    // Sort clipboard nodes so parents come before children
    const sortedNodes = [...clipboardNodes].sort((a, b) => {
      if (a.parent_id === null && b.parent_id !== null) return -1;
      if (a.parent_id !== null && b.parent_id === null) return 1;
      return 0;
    });

    // Find the root nodes in clipboard (nodes whose parent is not in clipboard)
    const clipboardIds = new Set(clipboardNodes.map((n) => n.id));

    for (const cNode of sortedNodes) {
      const isRoot = !cNode.parent_id || !clipboardIds.has(cNode.parent_id);
      const newParent = isRoot ? parentId : (idMap[cNode.parent_id!] || parentId);

      const created = onCreateNode(
        cNode.type as NodeType,
        cNode.canvas_x + 40,
        cNode.canvas_y + 40,
        newParent
      );
      idMap[cNode.id] = created.id;

      if (onUpdateNode) {
        onUpdateNode(created.id, {
          label: cNode.label,
          properties: { ...cNode.properties },
          seasons: [...cNode.seasons],
        });
      }
    }
  }, [contextMenu, clipboardNodes, onCreateNode, onUpdateNode]);

  const handleCtxAddChild = useCallback((type: NodeType) => {
    if (!contextMenu || !onCreateNode) return;
    const parentNode = nodes.find((n) => n.id === contextMenu.nodeId);
    onCreateNode(
      type,
      (parentNode?.canvas_x ?? 0) + 60,
      (parentNode?.canvas_y ?? 0) + 60,
      contextMenu.nodeId
    );
    // Auto-expand parent
    setExpandedMap((prev) => ({ ...prev, [contextMenu.nodeId]: true }));
  }, [contextMenu, nodes, onCreateNode]);

  const handleCtxCreateGroup = useCallback(() => {
    if (!contextMenu || !onCreateNode || !onUpdateNode) return;
    const node = nodes.find((n) => n.id === contextMenu.nodeId);
    if (!node) return;

    // Create a group as a sibling, then reparent the selected node into it
    const group = onCreateNode(
      'group',
      node.canvas_x,
      node.canvas_y,
      node.parent_id
    );
    onUpdateNode(group.id, { label: 'Yeni Grup' });
    onUpdateNode(node.id, { parent_id: group.id } as Partial<AtlasNode>);

    // Expand the new group
    setExpandedMap((prev) => ({ ...prev, [group.id]: true }));
  }, [contextMenu, nodes, onCreateNode, onUpdateNode]);

  const handleCtxDrillIn = useCallback(() => {
    if (!contextMenu) return;
    drillIntoGroup(contextMenu.nodeId);
  }, [contextMenu, drillIntoGroup]);

  // -----------------------------------------------------------------------
  // Delete confirmation
  // -----------------------------------------------------------------------
  const handleConfirmDelete = useCallback((withChildren: boolean) => {
    if (!deleteDialog || !onDeleteNode) return;
    onDeleteNode(deleteDialog.id, withChildren);
    selectNode(null);
    setDeleteDialog(null);
  }, [deleteDialog, onDeleteNode, selectNode]);

  // -----------------------------------------------------------------------
  // Drag & drop
  // -----------------------------------------------------------------------
  const handleDragStart = useCallback((nodeId: string) => {
    setDragState({ draggingId: nodeId, overTargetId: null, dropPosition: null });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (dragState.draggingId === targetId) return;
    // Prevent dropping a parent onto its own descendant
    if (dragState.draggingId) {
      const descIds = collectDescendantIds(dragState.draggingId, nodes);
      if (descIds.includes(targetId)) return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    let position: 'above' | 'below' | 'inside';
    if (y < h * 0.25) {
      position = 'above';
    } else if (y > h * 0.75) {
      position = 'below';
    } else {
      position = 'inside';
    }

    setDragState((prev) => ({
      ...prev,
      overTargetId: targetId,
      dropPosition: position,
    }));
  }, [dragState.draggingId, nodes]);

  const handleDragLeave = useCallback(() => {
    setDragState((prev) => ({ ...prev, overTargetId: null, dropPosition: null }));
  }, []);

  const handleDrop = useCallback((targetId: string) => {
    if (!dragState.draggingId || !onUpdateNode || dragState.draggingId === targetId) {
      setDragState({ draggingId: null, overTargetId: null, dropPosition: null });
      return;
    }

    const dragged = nodes.find((n) => n.id === dragState.draggingId);
    const target = nodes.find((n) => n.id === targetId);
    if (!dragged || !target) {
      setDragState({ draggingId: null, overTargetId: null, dropPosition: null });
      return;
    }

    if (dragState.dropPosition === 'inside') {
      // Reparent: make dragged a child of target
      onUpdateNode(dragged.id, { parent_id: targetId } as Partial<AtlasNode>);
      setExpandedMap((prev) => ({ ...prev, [targetId]: true }));
    } else {
      // Reorder: place dragged as sibling of target (same parent)
      onUpdateNode(dragged.id, { parent_id: target.parent_id } as Partial<AtlasNode>);
    }

    setDragState({ draggingId: null, overTargetId: null, dropPosition: null });
  }, [dragState, nodes, onUpdateNode]);

  const handleDragEnd = useCallback(() => {
    setDragState({ draggingId: null, overTargetId: null, dropPosition: null });
  }, []);

  // -----------------------------------------------------------------------
  // Keyboard shortcuts
  // -----------------------------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only handle when tree area is focused (not when typing in other inputs)
      const active = document.activeElement;
      const isInTree = treeContainerRef.current?.contains(active as HTMLElement);
      const isSearchFocused = searchInputRef.current === active;

      // Search: Enter in search input jumps to first match
      if (isSearchFocused && e.key === 'Enter') {
        if (effectiveSearch) {
          const match = nodes.find(
            (n) =>
              n.label.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
              n.type.toLowerCase().includes(effectiveSearch.toLowerCase())
          );
          if (match) {
            selectNode(match.id, match.type as NodeType);
            setFocusedId(match.id);
          }
        }
        return;
      }

      if (!isInTree && !isSearchFocused) return;

      // F2 — rename focused/selected node
      if (e.key === 'F2') {
        e.preventDefault();
        const id = focusedId || selectedNodeId;
        if (id) startRename(id);
        return;
      }

      // Delete — delete focused/selected node
      if (e.key === 'Delete' && !renamingId) {
        e.preventDefault();
        const id = focusedId || selectedNodeId;
        if (!id) return;
        const node = nodes.find((n) => n.id === id);
        if (node) setDeleteDialog(node);
        return;
      }

      // Enter — drill into focused/selected node
      if (e.key === 'Enter' && !renamingId && !isSearchFocused) {
        e.preventDefault();
        const id = focusedId || selectedNodeId;
        if (id) drillIntoGroup(id);
        return;
      }

      // Escape — drill out or clear selection
      if (e.key === 'Escape' && !renamingId) {
        if (contextMenu) {
          setContextMenu(null);
        } else if (groupStack.length > 0) {
          drillOut();
        } else {
          selectNode(null);
          setFocusedId(null);
        }
        return;
      }

      // Arrow keys for navigation
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !renamingId) {
        e.preventDefault();
        const visibleNodes = getVisibleFlatList(nodes, null, expandedMap, effectiveSearch);
        if (visibleNodes.length === 0) return;
        const currentIdx = visibleNodes.findIndex((n) => n.id === (focusedId || selectedNodeId));
        let nextIdx: number;
        if (currentIdx === -1) {
          nextIdx = 0;
        } else {
          nextIdx = e.key === 'ArrowDown'
            ? Math.min(currentIdx + 1, visibleNodes.length - 1)
            : Math.max(currentIdx - 1, 0);
        }
        const nextNode = visibleNodes[nextIdx];
        selectNode(nextNode.id, nextNode.type as NodeType);
        setFocusedId(nextNode.id);
        return;
      }

      // ArrowRight — expand
      if (e.key === 'ArrowRight' && !renamingId) {
        const id = focusedId || selectedNodeId;
        if (id && expandedMap[id] === false) {
          setExpandedMap((prev) => ({ ...prev, [id]: true }));
        }
        return;
      }

      // ArrowLeft — collapse
      if (e.key === 'ArrowLeft' && !renamingId) {
        const id = focusedId || selectedNodeId;
        if (id && expandedMap[id] !== false) {
          setExpandedMap((prev) => ({ ...prev, [id]: false }));
        }
        return;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [
    focusedId, selectedNodeId, renamingId, effectiveSearch,
    nodes, expandedMap, groupStack,
    selectNode, drillIntoGroup, drillOut, startRename, contextMenu,
  ]);

  // -----------------------------------------------------------------------
  // Get flat visible node list (for keyboard nav)
  // -----------------------------------------------------------------------

  return (
    <div ref={treeContainerRef} className="flex flex-col h-full" tabIndex={-1}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#333]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-[#777] font-medium select-none">
            Gezgin
          </span>
          <span className="text-[10px] text-[#555] tabular-nums">
            {nodes.length}
          </span>
        </div>

        {/* Search bar */}
        <div className="mt-1.5 relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#666]" />
          <input
            ref={searchInputRef}
            type="text"
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              setSearchQuery(e.target.value);
            }}
            placeholder="Düğüm ara..."
            className="w-full pl-6 pr-2 py-1 text-xs rounded bg-[#1e1e22] border border-[#333] text-[#c0c0c0] placeholder:text-[#555] focus:outline-none focus:border-[#f6d13b88] transition-colors"
          />
          {localSearch && (
            <button
              onClick={() => { setLocalSearch(''); setSearchQuery(''); }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#aaa] transition-colors"
            >
              <span className="text-[10px]">&times;</span>
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb navigation for drill-in */}
      {groupStack.length > 0 && (
        <div className="px-3 py-1.5 border-b border-[#2a2a2a] flex items-center gap-0.5 text-[11px] overflow-x-auto custom-scroll flex-nowrap">
          <button
            onClick={drillToRoot}
            className="text-[#777] hover:text-[#ccc] transition-colors shrink-0 px-1 py-0.5 rounded hover:bg-[#2a2a2e]"
          >
            Kök
          </button>
          {breadcrumbItems.map((item, i) => (
            <span key={item.id} className="flex items-center gap-0.5 shrink-0">
              <ChevronRight size={10} className="text-[#555]" />
              <button
                onClick={() => {
                  const targetIndex = groupStack.indexOf(item.id);
                  for (let j = groupStack.length - 1; j > targetIndex; j--) {
                    drillOut();
                  }
                }}
                className={[
                  'px-1 py-0.5 rounded transition-colors shrink-0',
                  i === breadcrumbItems.length - 1
                    ? 'text-[#e0e0e0] font-medium'
                    : 'text-[#888] hover:text-[#ccc] hover:bg-[#2a2a2e]',
                ].join(' ')}
              >
                {item.label}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Tree content */}
      <div
        className="flex-1 overflow-y-auto custom-scroll py-0.5"
        onDragOver={(e) => {
          e.preventDefault();
          // Allow dropping on empty area to reparent to root / activeGroupId
        }}
        onDrop={(e) => {
          e.preventDefault();
          const draggedId = e.dataTransfer.getData('text/plain');
          if (draggedId && onUpdateNode) {
            onUpdateNode(draggedId, { parent_id: null } as Partial<AtlasNode>);
          }
          setDragState({ draggingId: null, overTargetId: null, dropPosition: null });
        }}
      >
        {rootNodes.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <div className="text-[#555] text-xs mb-1">
              Boş tuval.
            </div>
            <div className="text-[10px] text-[#444]">
              Sol paletten sürükleyerek düğüm ekleyin.
            </div>
          </div>
        ) : (
          rootNodes.map((node) => (
            <TreeItem
              key={node.id}
              node={node}
              nodes={nodes}
              edges={edges}
              depth={0}
              searchQuery={effectiveSearch}
              expandedMap={expandedMap}
              toggleExpanded={toggleExpanded}
              renamingId={renamingId}
              renameValue={renameValue}
              setRenamingId={setRenamingId}
              setRenameValue={setRenameValue}
              onCommitRename={commitRename}
              onContextMenu={handleContextMenu}
              focusedId={focusedId}
              setFocusedId={setFocusedId}
              dragState={dragState}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onCreateNode={onCreateNode}
              onUpdateNode={onUpdateNode}
              onDeleteNode={onDeleteNode}
              onItemClick={handleItemClick}
            />
          ))
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && ctxNode && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={ctxNode}
          nodes={nodes}
          edges={edges}
          onClose={closeContextMenu}
          onRename={handleCtxRename}
          onDelete={handleCtxDelete}
          onDuplicate={handleCtxDuplicate}
          onCopy={handleCtxCopy}
          onPaste={handleCtxPaste}
          onAddChild={handleCtxAddChild}
          onCreateGroup={handleCtxCreateGroup}
          onDrillIn={handleCtxDrillIn}
          hasClipboard={clipboardNodes.length > 0}
        />
      )}

      {/* Delete confirmation dialog */}
      {deleteDialog && (
        <DeleteDialog
          node={deleteDialog}
          descendantCount={countDescendants(deleteDialog.id, nodes)}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteDialog(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: build a flat list of visible nodes (for keyboard navigation)
// ---------------------------------------------------------------------------
function getVisibleFlatList(
  allNodes: AtlasNode[],
  parentId: string | null,
  expandedMap: Record<string, boolean>,
  searchQuery: string
): AtlasNode[] {
  const result: AtlasNode[] = [];
  const roots = getChildren(allNodes, parentId);

  function walk(nodes: AtlasNode[]) {
    for (const node of nodes) {
      // Search filter
      const matches =
        !searchQuery ||
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.type.toLowerCase().includes(searchQuery.toLowerCase());
      const hasMatchingDesc =
        !searchQuery || matches || nodeMatchesSearch(node, allNodes, searchQuery);

      if (searchQuery && !matches && !hasMatchingDesc) continue;

      result.push(node);

      const isExpanded = expandedMap[node.id] !== false;
      if (isExpanded) {
        const children = getChildren(allNodes, node.id);
        walk(children);
      }
    }
  }

  walk(roots);
  return result;
}
