'use client';

import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  SelectionMode,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { nodeTypes } from './custom-nodes';
import { edgeTypes } from './custom-edges';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import PinUpNoteComponent from './PinUpNote';
import { useEditorStore } from '@/stores/editorStore';
import { NODE_TYPE_CONFIG, EDGE_TYPE_CONFIG, EDGE_TYPES, CANVAS_EVENTS } from '@/lib/constants';
import type { AtlasNode, AtlasEdge, NodeType, EdgeType } from '@/lib/types/nodes';
import {
  StickyNote,
  ClipboardPaste,
  MousePointer2,
  ZoomIn,
  Maximize,
  Settings,
  Grid3x3,
  Magnet,
  Map,
  ChevronRight,
  Check,
  Trash2,
  Pencil,
} from 'lucide-react';

interface NodeCanvasProps {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  onCreateNode: (type: NodeType, x: number, y: number, parentId?: string | null) => AtlasNode;
  onUpdateNode: (id: string, changes: Partial<AtlasNode>) => void;
  onDeleteNode: (id: string, withChildren: boolean) => void;
  onCreateEdge: (sourceId: string, targetId: string, type: EdgeType) => AtlasEdge;
  onDeleteEdge: (id: string) => void;
  onUpdateEdge: (id: string, changes: Partial<AtlasEdge>) => void;
}

// Convert AtlasNode -> React Flow Node
function toFlowNode(node: AtlasNode): Node {
  return {
    id: node.id,
    type: node.type,
    position: { x: node.canvas_x, y: node.canvas_y },
    data: {
      id: node.id,
      label: node.label,
      type: node.type,
      properties: node.properties,
      seasons: node.seasons,
      isExpanded: false,
    },
  };
}

// Convert AtlasEdge -> React Flow Edge
function toFlowEdge(edge: AtlasEdge): Edge {
  return {
    id: edge.id,
    source: edge.source_node_id,
    target: edge.target_node_id,
    type: edge.type,
    data: { label: (edge.properties as Record<string, unknown>)?.label || '' },
  };
}

// Simple UUID v4 generator
function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function NodeCanvasInner({
  nodes: atlasNodes,
  edges: atlasEdges,
  onCreateNode,
  onUpdateNode,
  onDeleteNode,
  onCreateEdge,
  onDeleteEdge,
  onUpdateEdge,
}: NodeCanvasProps) {
  const reactFlowInstance = useReactFlow();
  const { screenToFlowPosition, fitView, zoomTo } = reactFlowInstance;
  const {
    selectedNodeId,
    selectNode,
    selectedNodeIds,
    selectMultiple,
    activeGroupId,
    drillIntoGroup,
    groupStack,
    drillOut,
    drillToRoot,
    gridEnabled,
    minimapVisible,
    snapToGrid,
    snapToNode,
    toggleGrid,
    toggleSnapToGrid,
    toggleSnapToNode,
    toggleMinimap,
    clipboardNodes,
    setClipboard,
    pinnedNotes,
    addPinnedNote,
    updatePinnedNote,
    removePinnedNote,
    undo,
    redo,
  } = useEditorStore();

  // Ref for current state — used in keyboard handler to avoid stale closures
  const currentStateRef = useRef({ nodes: atlasNodes, edges: atlasEdges });
  useEffect(() => {
    currentStateRef.current = { nodes: atlasNodes, edges: atlasEdges };
  }, [atlasNodes, atlasEdges]);

  // Filter nodes by active group -- memoised to prevent infinite re-render
  const visibleAtlasNodes = useMemo(
    () =>
      activeGroupId
        ? atlasNodes.filter((n) => n.parent_id === activeGroupId)
        : atlasNodes.filter((n) => n.parent_id === null),
    [atlasNodes, activeGroupId]
  );

  const visibleAtlasEdges = useMemo(() => {
    const ids = new Set(visibleAtlasNodes.map((n) => n.id));
    return atlasEdges.filter(
      (e) => ids.has(e.source_node_id) && ids.has(e.target_node_id)
    );
  }, [atlasEdges, visibleAtlasNodes]);

  // Derived React Flow data -- also memoised
  const initialRfNodes = useMemo(() => visibleAtlasNodes.map(toFlowNode), [visibleAtlasNodes]);
  const initialRfEdges = useMemo(() => visibleAtlasEdges.map(toFlowEdge), [visibleAtlasEdges]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(initialRfNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initialRfEdges);

  // Sync when atlas data actually changes (reference-stable thanks to useMemo)
  useEffect(() => {
    setRfNodes(initialRfNodes);
  }, [initialRfNodes, setRfNodes]);

  useEffect(() => {
    setRfEdges(initialRfEdges);
  }, [initialRfEdges, setRfEdges]);

  // Snap-to-node alignment guides
  const SNAP_THRESHOLD = 8; // pixels threshold for snapping
  const NODE_WIDTH = 160; // match BaseNode width
  const NODE_HEADER_HEIGHT = 24;
  const [alignGuides, setAlignGuides] = useState<{
    horizontal: number[]; // Y positions of horizontal guides
    vertical: number[]; // X positions of vertical guides
  }>({ horizontal: [], vertical: [] });

  // Edge context menu state
  const [edgeContextMenu, setEdgeContextMenu] = useState<{
    x: number;
    y: number;
    edgeId: string;
  } | null>(null);

  // Edge label editing state
  const [edgeLabelEdit, setEdgeLabelEdit] = useState<{
    edgeId: string;
    value: string;
  } | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    flowPos: { x: number; y: number };
  } | null>(null);

  // Context menu submenu state
  const [activeSubmenu, setActiveSubmenu] = useState<'addNode' | 'canvasSettings' | null>(null);

  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    node: AtlasNode;
    childCount: number;
    children: AtlasNode[];
  } | null>(null);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // --- Helpers for delete dialog ---
  const getChildrenOf = useCallback(
    (nodeId: string): AtlasNode[] => {
      return atlasNodes.filter((n) => n.parent_id === nodeId);
    },
    [atlasNodes],
  );

  const getDescendantCount = useCallback(
    (nodeId: string): number => {
      let count = 0;
      const stack = [nodeId];
      while (stack.length > 0) {
        const current = stack.pop()!;
        const children = atlasNodes.filter((n) => n.parent_id === current);
        count += children.length;
        for (const child of children) {
          stack.push(child.id);
        }
      }
      return count;
    },
    [atlasNodes],
  );

  const requestDelete = useCallback(
    (nodeId: string) => {
      const node = atlasNodes.find((n) => n.id === nodeId);
      if (!node) return;

      const directChildren = getChildrenOf(nodeId);
      const totalDescendants = getDescendantCount(nodeId);

      if (totalDescendants === 0) {
        // No children -- show simple confirm
        setDeleteDialog({
          node,
          childCount: 0,
          children: [],
        });
      } else {
        // Has children -- show full dialog
        setDeleteDialog({
          node,
          childCount: totalDescendants,
          children: directChildren,
        });
      }
    },
    [atlasNodes, getChildrenOf, getDescendantCount],
  );

  const handleDeleteWithChildren = useCallback(() => {
    if (!deleteDialog) return;
    onDeleteNode(deleteDialog.node.id, true);
    selectNode(null);
    setDeleteDialog(null);
  }, [deleteDialog, onDeleteNode, selectNode]);

  const handleDeleteOnly = useCallback(() => {
    if (!deleteDialog) return;
    onDeleteNode(deleteDialog.node.id, false);
    selectNode(null);
    setDeleteDialog(null);
  }, [deleteDialog, onDeleteNode, selectNode]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialog(null);
  }, []);

  // Handle connection -- auto-create 'contains' edge
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    onCreateEdge(connection.source, connection.target, 'contains');
  }, [onCreateEdge]);

  // Double-click node -> drill into group
  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      drillIntoGroup(node.id);
    },
    [drillIntoGroup]
  );

  // Alt+drag = duplicate the node
  const onNodeDragStart = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (_.altKey) {
        const atlasNode = atlasNodes.find((n) => n.id === node.id);
        if (atlasNode) {
          onCreateNode(atlasNode.type, atlasNode.canvas_x + 30, atlasNode.canvas_y + 30, activeGroupId);
        }
      }
    },
    [atlasNodes, onCreateNode, activeGroupId]
  );

  // Node drag — snap-to-node alignment guides
  const onNodeDrag = useCallback(
    (_: React.MouseEvent, dragNode: Node) => {
      if (!snapToNode) {
        setAlignGuides({ horizontal: [], vertical: [] });
        return;
      }

      const hGuides: number[] = [];
      const vGuides: number[] = [];
      const dragX = dragNode.position.x;
      const dragY = dragNode.position.y;
      const dragCenterX = dragX + NODE_WIDTH / 2;
      const dragCenterY = dragY + NODE_HEADER_HEIGHT / 2;

      for (const n of rfNodes) {
        if (n.id === dragNode.id) continue;
        const nx = n.position.x;
        const ny = n.position.y;
        const ncx = nx + NODE_WIDTH / 2;
        const ncy = ny + NODE_HEADER_HEIGHT / 2;

        // Left edge alignment
        if (Math.abs(dragX - nx) < SNAP_THRESHOLD) vGuides.push(nx);
        // Right edge alignment
        if (Math.abs((dragX + NODE_WIDTH) - (nx + NODE_WIDTH)) < SNAP_THRESHOLD) vGuides.push(nx + NODE_WIDTH);
        // Center X alignment
        if (Math.abs(dragCenterX - ncx) < SNAP_THRESHOLD) vGuides.push(ncx);
        // Top edge alignment
        if (Math.abs(dragY - ny) < SNAP_THRESHOLD) hGuides.push(ny);
        // Center Y alignment
        if (Math.abs(dragCenterY - ncy) < SNAP_THRESHOLD) hGuides.push(ncy);
      }

      setAlignGuides({
        horizontal: Array.from(new Set(hGuides)),
        vertical: Array.from(new Set(vGuides)),
      });
    },
    [snapToNode, rfNodes]
  );

  // Node drag stop -- save position
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onUpdateNode(node.id, {
        canvas_x: node.position.x,
        canvas_y: node.position.y,
      });
      setAlignGuides({ horizontal: [], vertical: [] });
    },
    [onUpdateNode]
  );

  // Node selection
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const nodeData = node.data as Record<string, unknown>;
      selectNode(node.id, nodeData.type as NodeType);
    },
    [selectNode]
  );

  // Sync React Flow marquee/rubber-band selection with editor store
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[]; edges: Edge[] }) => {
      if (selectedNodes.length > 1) {
        selectMultiple(selectedNodes.map((n) => n.id));
      } else if (selectedNodes.length === 1) {
        const nd = selectedNodes[0].data as Record<string, unknown>;
        selectNode(selectedNodes[0].id, nd.type as NodeType);
      }
      // Don't clear selection on empty — onPaneClick handles that
    },
    [selectNode, selectMultiple]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
    setContextMenu(null);
    setActiveSubmenu(null);
    setEdgeContextMenu(null);
  }, [selectNode]);

  // Right-click on edge -> show edge context menu
  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      event.stopPropagation();
      setEdgeContextMenu({
        x: event.clientX,
        y: event.clientY,
        edgeId: edge.id,
      });
      setContextMenu(null);
    },
    []
  );

  // Change edge type
  const changeEdgeType = useCallback(
    (edgeId: string, newType: EdgeType) => {
      onUpdateEdge(edgeId, { type: newType });
      // Also update the rfEdge immediately
      setRfEdges((eds) =>
        eds.map((e) => (e.id === edgeId ? { ...e, type: newType } : e))
      );
      setEdgeContextMenu(null);
    },
    [onUpdateEdge, setRfEdges]
  );

  // Set edge label
  const commitEdgeLabel = useCallback(
    (edgeId: string, label: string) => {
      const trimmed = label.trim();
      onUpdateEdge(edgeId, { properties: { label: trimmed } });
      setRfEdges((eds) =>
        eds.map((e) =>
          e.id === edgeId ? { ...e, data: { ...e.data, label: trimmed } } : e
        )
      );
      setEdgeLabelEdit(null);
    },
    [onUpdateEdge, setRfEdges]
  );

  // Delete edge from context menu
  const deleteEdgeFromMenu = useCallback(
    (edgeId: string) => {
      onDeleteEdge(edgeId);
      setEdgeContextMenu(null);
    },
    [onDeleteEdge]
  );

  // Drag from palette: drop handler
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!nodeType) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      onCreateNode(nodeType, position.x, position.y, activeGroupId);
    },
    [screenToFlowPosition, onCreateNode, activeGroupId]
  );

  // Right-click context menu
  const onContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        flowPos: position,
      });
      setActiveSubmenu(null);
      setEdgeContextMenu(null);
    },
    [screenToFlowPosition]
  );

  // Add pin-up note at a given flow position
  const addNoteAtPosition = useCallback(
    (flowX: number, flowY: number) => {
      addPinnedNote({
        id: uuid(),
        x: flowX,
        y: flowY,
        width: 200,
        height: 150,
        color: '#fef08a',
        text: '',
      });
    },
    [addPinnedNote],
  );

  // --- Clipboard / Copy / Paste / Duplicate helpers ---

  const copySelectedNodes = useCallback(() => {
    const ids = selectedNodeIds.length > 0 ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
    if (ids.length === 0) return;

    const nodesToCopy = atlasNodes.filter((n) => ids.includes(n.id));
    const nodeIdSet = new Set(ids);
    const edgesToCopy = atlasEdges.filter(
      (e) => nodeIdSet.has(e.source_node_id) && nodeIdSet.has(e.target_node_id)
    );
    setClipboard(nodesToCopy, edgesToCopy);
  }, [selectedNodeId, selectedNodeIds, atlasNodes, atlasEdges, setClipboard]);

  const pasteFromClipboard = useCallback(
    (offsetX = 50, offsetY = 50) => {
      if (clipboardNodes.length === 0) return;

      for (const node of clipboardNodes) {
        onCreateNode(node.type, node.canvas_x + offsetX, node.canvas_y + offsetY, activeGroupId);
      }
    },
    [clipboardNodes, onCreateNode, activeGroupId],
  );

  const duplicateSelectedNodes = useCallback(() => {
    const ids = selectedNodeIds.length > 0 ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
    if (ids.length === 0) return;

    for (const id of ids) {
      const node = atlasNodes.find((n) => n.id === id);
      if (!node) continue;
      onCreateNode(node.type, node.canvas_x + 50, node.canvas_y + 50, activeGroupId);
    }
  }, [selectedNodeId, selectedNodeIds, atlasNodes, onCreateNode, activeGroupId]);

  const wrapInGroup = useCallback(() => {
    const ids = selectedNodeIds.length > 0 ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
    if (ids.length === 0) return;

    // Compute average position for the group node
    const selected = atlasNodes.filter((n) => ids.includes(n.id));
    if (selected.length === 0) return;

    const avgX = selected.reduce((sum, n) => sum + n.canvas_x, 0) / selected.length;
    const avgY = selected.reduce((sum, n) => sum + n.canvas_y, 0) / selected.length;

    const groupNode = onCreateNode('group', avgX - 50, avgY - 50, activeGroupId);

    // Re-parent selected nodes into the new group
    for (const node of selected) {
      onUpdateNode(node.id, { parent_id: groupNode.id });
    }
  }, [selectedNodeId, selectedNodeIds, atlasNodes, onCreateNode, onUpdateNode, activeGroupId]);

  const selectAllVisible = useCallback(() => {
    const ids = visibleAtlasNodes.map((n) => n.id);
    selectMultiple(ids);
  }, [visibleAtlasNodes, selectMultiple]);

  const cycleToNextNode = useCallback(() => {
    if (visibleAtlasNodes.length === 0) return;
    const currentIndex = selectedNodeId
      ? visibleAtlasNodes.findIndex((n) => n.id === selectedNodeId)
      : -1;
    const nextIndex = (currentIndex + 1) % visibleAtlasNodes.length;
    const nextNode = visibleAtlasNodes[nextIndex];
    selectNode(nextNode.id, nextNode.type);
  }, [visibleAtlasNodes, selectedNodeId, selectNode]);

  const renameSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    window.dispatchEvent(
      new CustomEvent('node-rename-request', { detail: { nodeId: selectedNodeId } })
    );
  }, [selectedNodeId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      // Delete -> delete selected node
      if (e.key === 'Delete' && selectedNodeId) {
        e.preventDefault();
        requestDelete(selectedNodeId);
        return;
      }

      // Escape -> close menus, or drill out
      if (e.key === 'Escape') {
        if (contextMenu || activeSubmenu) {
          setContextMenu(null);
          setActiveSubmenu(null);
        } else if (activeGroupId) {
          // Drill out one level
          drillOut();
        } else {
          selectNode(null);
        }
        return;
      }

      // Ctrl+D -> duplicate selected
      if (ctrl && e.key === 'd') {
        e.preventDefault();
        duplicateSelectedNodes();
        return;
      }

      // Ctrl+G -> wrap in group
      if (ctrl && e.key === 'g') {
        e.preventDefault();
        wrapInGroup();
        return;
      }

      // Ctrl+Z -> undo
      if (ctrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        const cur = currentStateRef.current;
        const snapshot = undo({
          nodes: cur.nodes,
          edges: cur.edges,
          timestamp: Date.now(),
        });
        if (snapshot) {
          window.dispatchEvent(
            new CustomEvent('editor-restore-snapshot', { detail: snapshot })
          );
        }
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z -> redo
      if ((ctrl && e.key === 'y') || (ctrl && e.shiftKey && e.key === 'Z')) {
        e.preventDefault();
        const cur = currentStateRef.current;
        const snapshot = redo({
          nodes: cur.nodes,
          edges: cur.edges,
          timestamp: Date.now(),
        });
        if (snapshot) {
          window.dispatchEvent(
            new CustomEvent('editor-restore-snapshot', { detail: snapshot })
          );
        }
        return;
      }

      // Ctrl+A -> select all
      if (ctrl && e.key === 'a') {
        e.preventDefault();
        selectAllVisible();
        return;
      }

      // Ctrl+C -> copy
      if (ctrl && e.key === 'c') {
        e.preventDefault();
        copySelectedNodes();
        return;
      }

      // Ctrl+V -> paste
      if (ctrl && e.key === 'v') {
        e.preventDefault();
        pasteFromClipboard();
        return;
      }

      // Tab -> cycle to next node
      if (e.key === 'Tab' && !ctrl && !e.shiftKey) {
        e.preventDefault();
        cycleToNextNode();
        return;
      }

      // F2 -> rename selected node
      if (e.key === 'F2') {
        e.preventDefault();
        renameSelectedNode();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedNodeId,
    requestDelete,
    duplicateSelectedNodes,
    wrapInGroup,
    undo,
    redo,
    selectAllVisible,
    copySelectedNodes,
    pasteFromClipboard,
    cycleToNextNode,
    renameSelectedNode,
    contextMenu,
    activeSubmenu,
    activeGroupId,
    drillOut,
    selectNode,
  ]);

  // Listen for custom events from nodes
  useEffect(() => {
    const handleToggleExpand = (e: Event) => {
      const { nodeId } = (e as CustomEvent).detail;
      setRfNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, isExpanded: !n.data.isExpanded } }
            : n
        )
      );
    };

    const handleDrillIn = (e: Event) => {
      const { nodeId } = (e as CustomEvent).detail;
      drillIntoGroup(nodeId);
    };

    const handleRenameCommit = (e: Event) => {
      const { nodeId, label } = (e as CustomEvent).detail;
      onUpdateNode(nodeId, { label });
      // Also update the React Flow node data so it re-renders immediately
      setRfNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, label } }
            : n
        )
      );
    };

    const handleToggleVisibility = (e: Event) => {
      const { nodeId } = (e as CustomEvent).detail;
      const atlasNode = atlasNodes.find((n) => n.id === nodeId);
      if (!atlasNode) return;

      const currentProps = atlasNode.properties as Record<string, unknown>;
      const currentVisible = currentProps.map_visible !== false;
      const newVisible = !currentVisible;
      const newProps = { ...currentProps, map_visible: newVisible };

      // Collect all descendant IDs so children cascade
      const collectDescendants = (parentId: string): string[] => {
        const children = atlasNodes.filter((n) => n.parent_id === parentId);
        const ids: string[] = [];
        for (const child of children) {
          ids.push(child.id);
          ids.push(...collectDescendants(child.id));
        }
        return ids;
      };
      const descendantIds = collectDescendants(nodeId);

      // Update parent node
      onUpdateNode(nodeId, { properties: newProps });

      // Cascade to all descendants
      for (const descId of descendantIds) {
        const descNode = atlasNodes.find((n) => n.id === descId);
        if (!descNode) continue;
        const descProps = { ...(descNode.properties as Record<string, unknown>), map_visible: newVisible };
        onUpdateNode(descId, { properties: descProps });
      }

      // Update React Flow nodes so UI re-renders immediately
      const affectedIds = new Set([nodeId, ...descendantIds]);
      setRfNodes((nds) =>
        nds.map((n) => {
          if (!affectedIds.has(n.id)) return n;
          const updatedProps = { ...(n.data.properties as Record<string, unknown>), map_visible: newVisible };
          return { ...n, data: { ...n.data, properties: updatedProps } };
        })
      );
    };

    window.addEventListener('node-toggle-expand', handleToggleExpand);
    window.addEventListener('node-drill-into-group', handleDrillIn);
    window.addEventListener('node-rename-commit', handleRenameCommit);
    window.addEventListener('node-toggle-visibility', handleToggleVisibility);
    return () => {
      window.removeEventListener('node-toggle-expand', handleToggleExpand);
      window.removeEventListener('node-drill-into-group', handleDrillIn);
      window.removeEventListener('node-rename-commit', handleRenameCommit);
      window.removeEventListener('node-toggle-visibility', handleToggleVisibility);
    };
  }, [setRfNodes, drillIntoGroup, onUpdateNode, atlasNodes]);

  // Listen for pin-up note creation from toolbar
  useEffect(() => {
    const handleAddNote = (e: Event) => {
      const { x, y } = (e as CustomEvent).detail;
      addPinnedNote({ id: uuid(), x, y, width: 200, height: 150, color: '#fef08a', text: '' });
    };
    window.addEventListener(CANVAS_EVENTS.ADD_PINUP, handleAddNote);
    return () => window.removeEventListener(CANVAS_EVENTS.ADD_PINUP, handleAddNote);
  }, [addPinnedNote]);

  // Listen for toolbar alignment/distribute/auto-layout events
  useEffect(() => {
    const handleAlign = (e: Event) => {
      const { direction } = (e as CustomEvent).detail;
      const ids = selectedNodeIds.length > 0 ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
      if (ids.length < 2) return;

      const selectedRfNodes = rfNodes.filter((n) => ids.includes(n.id));
      if (direction === 'horizontal') {
        // Align all to average Y
        const avgY = selectedRfNodes.reduce((sum, n) => sum + n.position.y, 0) / selectedRfNodes.length;
        for (const n of selectedRfNodes) {
          onUpdateNode(n.id, { canvas_y: avgY });
        }
      } else {
        // Align all to average X
        const avgX = selectedRfNodes.reduce((sum, n) => sum + n.position.x, 0) / selectedRfNodes.length;
        for (const n of selectedRfNodes) {
          onUpdateNode(n.id, { canvas_x: avgX });
        }
      }
    };

    const handleDistribute = (e: Event) => {
      const { direction } = (e as CustomEvent).detail;
      const ids = selectedNodeIds.length > 0 ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
      if (ids.length < 3) return;

      const selectedRfNodes = rfNodes
        .filter((n) => ids.includes(n.id))
        .sort((a, b) => direction === 'horizontal' ? a.position.x - b.position.x : a.position.y - b.position.y);

      if (direction === 'horizontal') {
        const minX = selectedRfNodes[0].position.x;
        const maxX = selectedRfNodes[selectedRfNodes.length - 1].position.x;
        const step = (maxX - minX) / (selectedRfNodes.length - 1);
        selectedRfNodes.forEach((n, i) => {
          onUpdateNode(n.id, { canvas_x: minX + step * i });
        });
      } else {
        const minY = selectedRfNodes[0].position.y;
        const maxY = selectedRfNodes[selectedRfNodes.length - 1].position.y;
        const step = (maxY - minY) / (selectedRfNodes.length - 1);
        selectedRfNodes.forEach((n, i) => {
          onUpdateNode(n.id, { canvas_y: minY + step * i });
        });
      }
    };

    const handleAutoLayout = () => {
      // Simple grid auto-layout for all visible nodes
      const cols = Math.ceil(Math.sqrt(visibleAtlasNodes.length));
      const spacingX = 220;
      const spacingY = 180;
      visibleAtlasNodes.forEach((node, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        onUpdateNode(node.id, {
          canvas_x: col * spacingX + 50,
          canvas_y: row * spacingY + 50,
        });
      });
      // Fit view after layout
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
    };

    const handleToggleHandles = () => {
      // Toggle handle orientation for selected node(s) - dispatch data update
      // This changes the node data to flip handle positions
      const ids = selectedNodeIds.length > 0 ? selectedNodeIds : (selectedNodeId ? [selectedNodeId] : []);
      if (ids.length === 0) return;

      setRfNodes((nds) =>
        nds.map((n) =>
          ids.includes(n.id)
            ? { ...n, data: { ...n.data, handleOrientation: n.data.handleOrientation === 'vertical' ? 'horizontal' : 'vertical' } }
            : n
        )
      );
    };

    window.addEventListener(CANVAS_EVENTS.ALIGN, handleAlign);
    window.addEventListener(CANVAS_EVENTS.DISTRIBUTE, handleDistribute);
    window.addEventListener(CANVAS_EVENTS.AUTO_LAYOUT, handleAutoLayout);
    window.addEventListener(CANVAS_EVENTS.TOGGLE_HANDLES, handleToggleHandles);
    return () => {
      window.removeEventListener(CANVAS_EVENTS.ALIGN, handleAlign);
      window.removeEventListener(CANVAS_EVENTS.DISTRIBUTE, handleDistribute);
      window.removeEventListener(CANVAS_EVENTS.AUTO_LAYOUT, handleAutoLayout);
      window.removeEventListener(CANVAS_EVENTS.TOGGLE_HANDLES, handleToggleHandles);
    };
  }, [selectedNodeId, selectedNodeIds, rfNodes, visibleAtlasNodes, onUpdateNode, setRfNodes, fitView]);

  // --- Context menu item component ---
  const MenuItem = useCallback(
    ({
      icon,
      label,
      shortcut,
      onClick,
      disabled,
    }: {
      icon?: React.ReactNode;
      label: string;
      shortcut?: string;
      onClick: () => void;
      disabled?: boolean;
    }) => (
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onClick();
        }}
        disabled={disabled}
        className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 transition-colors ${
          disabled
            ? 'text-editor-text-muted/50 cursor-not-allowed'
            : 'text-editor-text hover:bg-editor-surface-hover'
        }`}
      >
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <span className="flex-1">{label}</span>
        {shortcut && (
          <span className="text-[10px] text-editor-text-muted ml-4 shrink-0">
            {shortcut}
          </span>
        )}
      </button>
    ),
    [],
  );

  // --- Submenu trigger component ---
  const SubMenuItem = useCallback(
    ({
      icon,
      label,
      submenuKey,
    }: {
      icon?: React.ReactNode;
      label: string;
      submenuKey: 'addNode' | 'canvasSettings';
    }) => (
      <button
        onMouseEnter={() => setActiveSubmenu(submenuKey)}
        className="w-full px-3 py-1.5 text-left text-sm text-editor-text hover:bg-editor-surface-hover flex items-center gap-2 transition-colors"
      >
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <span className="flex-1">{label}</span>
        <ChevronRight size={12} className="text-editor-text-muted shrink-0" />
      </button>
    ),
    [],
  );

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange as OnNodesChange<Node>}
        onEdgesChange={onEdgesChange as OnEdgesChange<Edge>}
        onConnect={onConnect}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onContextMenu={onContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid={snapToGrid}
        snapGrid={[16, 16]}
        deleteKeyCode={null}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1]}
        multiSelectionKeyCode="Shift"
        className="bg-editor-canvas"
      >
        {gridEnabled && (
          <Background
            variant={BackgroundVariant.Dots}
            gap={16}
            size={1}
          />
        )}
        <Controls
          showInteractive={false}
          className="!bottom-4 !left-4"
        />
        {minimapVisible && (
          <MiniMap
            nodeStrokeWidth={3}
            pannable
            zoomable
            className="!bottom-4 !right-4"
            style={{ width: 160, height: 100 }}
          />
        )}

        {/* Snap-to-node alignment guides */}
        {(alignGuides.horizontal.length > 0 || alignGuides.vertical.length > 0) && (
          <svg
            className="react-flow__alignment-guides"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1000,
            }}
          >
            {alignGuides.horizontal.map((y, i) => (
              <line
                key={`h-${i}`}
                x1="-10000"
                y1={y}
                x2="10000"
                y2={y}
                stroke="#f6d13b"
                strokeWidth={0.5}
                strokeDasharray="4 4"
                opacity={0.8}
              />
            ))}
            {alignGuides.vertical.map((x, i) => (
              <line
                key={`v-${i}`}
                x1={x}
                y1="-10000"
                x2={x}
                y2="10000"
                stroke="#f6d13b"
                strokeWidth={0.5}
                strokeDasharray="4 4"
                opacity={0.8}
              />
            ))}
          </svg>
        )}
      </ReactFlow>

      {/* Breadcrumb overlay - top left */}
      <div
        className="absolute top-3 left-3 z-40 flex items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs"
        style={{
          background: 'var(--editor-surface)',
          border: '1px solid var(--editor-border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <button
          onClick={() => drillToRoot()}
          className={`px-1 py-0.5 rounded transition-colors ${
            groupStack.length === 0
              ? 'text-[var(--editor-text)] font-medium'
              : 'text-[var(--editor-text-muted)] hover:text-[var(--editor-text)]'
          }`}
        >
          Kök
        </button>
        {groupStack.map((id, i) => {
          const node = atlasNodes.find((n) => n.id === id);
          return (
            <span key={id} className="flex items-center gap-0.5">
              <ChevronRight size={10} className="text-[var(--editor-text-muted)]" />
              <button
                onClick={() => {
                  const stepsBack = groupStack.length - i - 1;
                  for (let j = 0; j < stepsBack; j++) drillOut();
                }}
                className={`px-1 py-0.5 rounded transition-colors ${
                  i === groupStack.length - 1
                    ? 'text-[var(--editor-text)] font-medium'
                    : 'text-[var(--editor-text-muted)] hover:text-[var(--editor-text)]'
                }`}
              >
                {node?.label || 'Grup'}
              </button>
            </span>
          );
        })}
      </div>

      {/* Pin-up notes layer */}
      {pinnedNotes.map((note) => (
        <PinUpNoteComponent
          key={note.id}
          id={note.id}
          x={note.x}
          y={note.y}
          width={note.width}
          height={note.height}
          color={note.color}
          text={note.text}
          onUpdate={updatePinnedNote}
          onDelete={removePinnedNote}
        />
      ))}

      {/* Edge context menu */}
      {edgeContextMenu && (() => {
        const atlasEdge = atlasEdges.find((e) => e.id === edgeContextMenu.edgeId);
        const currentType = atlasEdge?.type || 'contains';
        const currentLabel = (atlasEdge?.properties as Record<string, unknown>)?.label as string || '';

        return (
          <div
            className="fixed z-50 bg-editor-surface border border-editor-border rounded-lg shadow-xl py-1 min-w-[200px]"
            style={{ left: edgeContextMenu.x, top: edgeContextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-editor-text-muted">
              Bağlantı Tipi
            </p>
            {EDGE_TYPES.map((type) => {
              const cfg = EDGE_TYPE_CONFIG[type];
              return (
                <button
                  key={type}
                  onClick={() => changeEdgeType(edgeContextMenu.edgeId, type)}
                  className="w-full px-3 py-1.5 text-left text-sm text-editor-text hover:bg-editor-surface-hover flex items-center gap-2 transition-colors"
                >
                  <span
                    className="w-3 h-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: cfg.color,
                      borderStyle: cfg.style === 'dashed' ? 'dashed' : cfg.style === 'dotted' ? 'dotted' : 'solid',
                    }}
                  />
                  <span className="flex-1">{cfg.label}</span>
                  {currentType === type && <Check size={12} className="text-green-400 shrink-0" />}
                </button>
              );
            })}
            <div className="border-t border-editor-border my-1" />
            <button
              onClick={() => {
                setEdgeLabelEdit({ edgeId: edgeContextMenu.edgeId, value: currentLabel });
                setEdgeContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left text-sm text-editor-text hover:bg-editor-surface-hover flex items-center gap-2 transition-colors"
            >
              <Pencil size={12} className="shrink-0" />
              <span className="flex-1">{currentLabel ? 'Etiketi Düzenle' : 'Etiket Ekle'}</span>
            </button>
            <div className="border-t border-editor-border my-1" />
            <button
              onClick={() => deleteEdgeFromMenu(edgeContextMenu.edgeId)}
              className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
            >
              <Trash2 size={12} className="shrink-0" />
              <span className="flex-1">Bağlantıyı Sil</span>
            </button>
          </div>
        );
      })()}

      {/* Edge label edit dialog */}
      {edgeLabelEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div
            className="rounded-lg shadow-xl p-4 min-w-[280px]"
            style={{
              background: 'var(--editor-surface)',
              border: '1px solid var(--editor-border)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--editor-text-secondary)' }}>
              Bağlantı Etiketi
            </p>
            <input
              type="text"
              value={edgeLabelEdit.value}
              onChange={(e) => setEdgeLabelEdit({ ...edgeLabelEdit, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdgeLabel(edgeLabelEdit.edgeId, edgeLabelEdit.value);
                if (e.key === 'Escape') setEdgeLabelEdit(null);
              }}
              className="w-full px-2 py-1.5 text-sm rounded"
              style={{
                background: 'var(--editor-bg)',
                border: '1px solid var(--editor-border)',
                color: 'var(--editor-text)',
                outline: 'none',
              }}
              placeholder="Etiket giriniz…"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setEdgeLabelEdit(null)}
                className="px-3 py-1 text-xs rounded"
                style={{ color: 'var(--editor-text-muted)' }}
              >
                İptal
              </button>
              <button
                onClick={() => commitEdgeLabel(edgeLabelEdit.edgeId, edgeLabelEdit.value)}
                className="px-3 py-1 text-xs rounded font-medium"
                style={{
                  background: EDGE_TYPE_CONFIG.contains.color,
                  color: '#fff',
                }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-editor-surface border border-editor-border rounded-lg shadow-xl py-1 min-w-[220px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => setActiveSubmenu(null)}
        >
          {/* 1. Add Node - submenu */}
          <div className="relative">
            <SubMenuItem
              icon={<span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />}
              label="Yeni Düğüm Ekle"
              submenuKey="addNode"
            />
            {activeSubmenu === 'addNode' && (
              <div
                className="absolute left-full top-0 ml-0.5 bg-editor-surface border border-editor-border rounded-lg shadow-xl py-1 min-w-[180px] max-h-[400px] overflow-y-auto"
                onMouseEnter={() => setActiveSubmenu('addNode')}
              >
                <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-editor-text-muted">
                  Düğüm Tipi
                </p>
                {Object.entries(NODE_TYPE_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => {
                      onCreateNode(key as NodeType, contextMenu.flowPos.x, contextMenu.flowPos.y, activeGroupId);
                      setContextMenu(null);
                      setActiveSubmenu(null);
                    }}
                    className="w-full px-3 py-1.5 text-left text-sm text-editor-text hover:bg-editor-surface-hover flex items-center gap-2 transition-colors"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: config.color }}
                    />
                    <span>{config.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Paste */}
          <MenuItem
            icon={<ClipboardPaste size={14} />}
            label="Yapıştır"
            shortcut="Ctrl+V"
            onClick={() => {
              pasteFromClipboard();
              setContextMenu(null);
              setActiveSubmenu(null);
            }}
            disabled={clipboardNodes.length === 0}
          />

          {/* 3. Select All */}
          <MenuItem
            icon={<MousePointer2 size={14} />}
            label="Tümünü Seç"
            shortcut="Ctrl+A"
            onClick={() => {
              selectAllVisible();
              setContextMenu(null);
              setActiveSubmenu(null);
            }}
          />

          {/* Separator */}
          <div className="border-t border-editor-border my-1" />

          {/* 5. Fit View */}
          <MenuItem
            icon={<Maximize size={14} />}
            label="Sığdır"
            onClick={() => {
              fitView({ padding: 0.2, duration: 300 });
              setContextMenu(null);
              setActiveSubmenu(null);
            }}
          />

          {/* 6. Zoom 100% */}
          <MenuItem
            icon={<ZoomIn size={14} />}
            label="Yakınlaştır %100"
            onClick={() => {
              zoomTo(1, { duration: 300 });
              setContextMenu(null);
              setActiveSubmenu(null);
            }}
          />

          {/* Separator */}
          <div className="border-t border-editor-border my-1" />

          {/* 8. Pin-up Note */}
          <MenuItem
            icon={<StickyNote size={14} className="text-amber-400" />}
            label="Not Ekle"
            onClick={() => {
              addNoteAtPosition(contextMenu.flowPos.x, contextMenu.flowPos.y);
              setContextMenu(null);
              setActiveSubmenu(null);
            }}
          />

          {/* 9. Canvas Settings - submenu */}
          <div className="relative">
            <SubMenuItem
              icon={<Settings size={14} />}
              label="Tuval Ayarları"
              submenuKey="canvasSettings"
            />
            {activeSubmenu === 'canvasSettings' && (
              <div
                className="absolute left-full top-0 ml-0.5 bg-editor-surface border border-editor-border rounded-lg shadow-xl py-1 min-w-[200px]"
                onMouseEnter={() => setActiveSubmenu('canvasSettings')}
              >
                <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-editor-text-muted">
                  Ayarlar
                </p>

                {/* Grid toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGrid();
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-editor-text hover:bg-editor-surface-hover flex items-center gap-2 transition-colors"
                >
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Grid3x3 size={14} />
                  </span>
                  <span className="flex-1">Izgara</span>
                  {gridEnabled && <Check size={14} className="text-green-400 shrink-0" />}
                </button>

                {/* Snap to Grid toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSnapToGrid();
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-editor-text hover:bg-editor-surface-hover flex items-center gap-2 transition-colors"
                >
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Magnet size={14} />
                  </span>
                  <span className="flex-1">Izgaraya Yapış</span>
                  {snapToGrid && <Check size={14} className="text-green-400 shrink-0" />}
                </button>

                {/* Snap to Node toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSnapToNode();
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-editor-text hover:bg-editor-surface-hover flex items-center gap-2 transition-colors"
                >
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Magnet size={14} className="rotate-90" />
                  </span>
                  <span className="flex-1">Düğüme Yapış</span>
                  {snapToNode && <Check size={14} className="text-green-400 shrink-0" />}
                </button>

                {/* Minimap toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMinimap();
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-editor-text hover:bg-editor-surface-hover flex items-center gap-2 transition-colors"
                >
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <Map size={14} />
                  </span>
                  <span className="flex-1">Mini Harita</span>
                  {minimapVisible && <Check size={14} className="text-green-400 shrink-0" />}
                </button>
              </div>
            )}
          </div>

          {/* Separator + Cancel */}
          <div className="border-t border-editor-border my-1" />
          <button
            onClick={() => {
              setContextMenu(null);
              setActiveSubmenu(null);
            }}
            className="w-full px-3 py-1.5 text-left text-sm text-editor-text-muted hover:bg-editor-surface-hover transition-colors"
          >
            <span className="ml-6">İptal</span>
          </button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteDialog && (
        <DeleteConfirmDialog
          node={deleteDialog.node}
          childCount={deleteDialog.childCount}
          childNodes={deleteDialog.children}
          onDeleteWithChildren={handleDeleteWithChildren}
          onDeleteOnly={handleDeleteOnly}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
}

export default function NodeCanvas(props: NodeCanvasProps) {
  return (
    <ReactFlowProvider>
      <NodeCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
