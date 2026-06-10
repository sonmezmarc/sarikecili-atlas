'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AtlasNode, AtlasEdge, NodeType, EdgeType } from '@/lib/types/nodes';
import { getDefaultProperties } from '@/lib/types/nodes';
import { useEditorStore } from '@/stores/editorStore';
import { v4 as uuid } from 'uuid';

interface UseNodesReturn {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  isLoading: boolean;
  error: string | null;
  createNode: (type: NodeType, canvasX: number, canvasY: number, parentId?: string | null, label?: string) => AtlasNode;
  updateNode: (id: string, changes: Partial<AtlasNode>) => void;
  deleteNode: (id: string, withChildren: boolean) => void;
  createEdge: (sourceId: string, targetId: string, type: EdgeType) => AtlasEdge;
  deleteEdge: (id: string) => void;
  updateEdge: (id: string, changes: Partial<AtlasEdge>) => void;
  refresh: () => Promise<void>;
}

export function useNodes(): UseNodesReturn {
  const [nodes, setNodes] = useState<AtlasNode[]>([]);
  const [edges, setEdges] = useState<AtlasEdge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setDirty, setSaving, setLastSaved, pushUndo } = useEditorStore();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdatesRef = useRef<Map<string, Partial<AtlasNode>>>(new Map());

  // Snapshot helper — captures current state for undo
  const takeSnapshot = useCallback(() => {
    pushUndo({
      nodes: [...nodes],
      edges: [...edges],
      timestamp: Date.now(),
    });
  }, [nodes, edges, pushUndo]);

  // Listen for undo/redo restore events (dispatched from NodeCanvas keyboard handler)
  useEffect(() => {
    const handleRestore = (e: Event) => {
      const { nodes: snapNodes, edges: snapEdges } = (e as CustomEvent).detail;
      setNodes(snapNodes);
      setEdges(snapEdges);
    };
    window.addEventListener('editor-restore-snapshot', handleRestore);
    return () => window.removeEventListener('editor-restore-snapshot', handleRestore);
  }, []);

  // Fetch all nodes and edges
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [nodesRes, edgesRes] = await Promise.all([
        fetch('/api/nodes'),
        fetch('/api/edges'),
      ]);

      if (!nodesRes.ok || !edgesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [nodesData, edgesData] = await Promise.all([
        nodesRes.json(),
        edgesRes.json(),
      ]);

      setNodes(nodesData);
      setEdges(edgesData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounced save for node updates
  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setDirty(true);

    saveTimeoutRef.current = setTimeout(async () => {
      const updates = new Map(pendingUpdatesRef.current);
      pendingUpdatesRef.current.clear();

      if (updates.size === 0) return;

      setSaving(true);
      try {
        await Promise.all(
          Array.from(updates.entries()).map(([id, changes]) =>
            fetch('/api/nodes', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, ...changes }),
            })
          )
        );
        setLastSaved(Date.now());
      } catch {
        setError('Failed to save changes');
      } finally {
        setSaving(false);
      }
    }, 2000);
  }, [setDirty, setSaving, setLastSaved]);

  // Create node (optimistic)
  const createNode = useCallback(
    (type: NodeType, canvasX: number, canvasY: number, parentId?: string | null, label?: string): AtlasNode => {
      takeSnapshot();
      const newNode: AtlasNode = {
        id: uuid(),
        type,
        parent_id: parentId || null,
        label: label || '',
        properties: getDefaultProperties(type),
        canvas_x: canvasX,
        canvas_y: canvasY,
        seasons: ['all'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setNodes((prev) => [...prev, newNode]);

      // Save to server
      fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNode),
      }).catch(() => {
        // Revert on failure
        setNodes((prev) => prev.filter((n) => n.id !== newNode.id));
        setError('Failed to create node');
      });

      return newNode;
    },
    [takeSnapshot]
  );

  // Update node (optimistic + debounced save)
  const updateNode = useCallback(
    (id: string, changes: Partial<AtlasNode>) => {
      // Take a single undo snapshot at the start of each debounce batch
      if (pendingUpdatesRef.current.size === 0) {
        takeSnapshot();
      }

      setNodes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, ...changes, updated_at: new Date().toISOString() } : n
        )
      );

      pendingUpdatesRef.current.set(id, {
        ...pendingUpdatesRef.current.get(id),
        ...changes,
      });

      scheduleSave();
    },
    [scheduleSave, takeSnapshot]
  );

  // Delete node
  const deleteNode = useCallback(
    (id: string, withChildren: boolean) => {
      const nodeToDelete = nodes.find((n) => n.id === id);
      if (!nodeToDelete) return;

      takeSnapshot();

      // Optimistic removal
      if (withChildren) {
        const descendantIds = getDescendantIds(nodes, id);
        const allIds = new Set([id, ...descendantIds]);
        setNodes((prev) => prev.filter((n) => !allIds.has(n.id)));
        setEdges((prev) =>
          prev.filter(
            (e) => !allIds.has(e.source_node_id) && !allIds.has(e.target_node_id)
          )
        );
      } else {
        setNodes((prev) =>
          prev
            .filter((n) => n.id !== id)
            .map((n) =>
              n.parent_id === id ? { ...n, parent_id: nodeToDelete.parent_id } : n
            )
        );
        setEdges((prev) =>
          prev.filter(
            (e) => e.source_node_id !== id && e.target_node_id !== id
          )
        );
      }

      fetch(`/api/nodes?id=${id}&with_children=${withChildren}`, {
        method: 'DELETE',
      }).catch(() => {
        fetchData(); // Revert by refetching
        setError('Failed to delete node');
      });
    },
    [nodes, fetchData, takeSnapshot]
  );

  // Create edge (optimistic)
  const createEdge = useCallback(
    (sourceId: string, targetId: string, type: EdgeType): AtlasEdge => {
      takeSnapshot();
      const newEdge: AtlasEdge = {
        id: uuid(),
        source_node_id: sourceId,
        target_node_id: targetId,
        type,
        properties: {},
        created_at: new Date().toISOString(),
      };

      setEdges((prev) => [...prev, newEdge]);

      fetch('/api/edges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEdge),
      }).catch(() => {
        setEdges((prev) => prev.filter((e) => e.id !== newEdge.id));
        setError('Failed to create edge');
      });

      return newEdge;
    },
    [takeSnapshot]
  );

  // Delete edge
  const deleteEdge = useCallback(
    (id: string) => {
      takeSnapshot();
      setEdges((prev) => prev.filter((e) => e.id !== id));

      fetch(`/api/edges?id=${id}`, { method: 'DELETE' }).catch(() => {
        fetchData();
        setError('Failed to delete edge');
      });
    },
    [fetchData, takeSnapshot]
  );

  // Update edge
  const updateEdge = useCallback(
    (id: string, changes: Partial<AtlasEdge>) => {
      takeSnapshot();
      setEdges((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...changes } : e))
      );

      fetch('/api/edges', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...changes }),
      }).catch(() => {
        fetchData();
        setError('Failed to update edge');
      });
    },
    [fetchData, takeSnapshot]
  );

  return {
    nodes,
    edges,
    isLoading,
    error,
    createNode,
    updateNode,
    deleteNode,
    createEdge,
    deleteEdge,
    updateEdge,
    refresh: fetchData,
  };
}

// Helper: get all descendant IDs (with depth limit to prevent stack overflow on cycles)
function getDescendantIds(nodes: AtlasNode[], parentId: string, depth = 0, maxDepth = 20): string[] {
  if (depth >= maxDepth) return [];
  const children = nodes.filter((n) => n.parent_id === parentId);
  return children.flatMap((c) => [c.id, ...getDescendantIds(nodes, c.id, depth + 1, maxDepth)]);
}
