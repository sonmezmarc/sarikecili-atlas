'use client';

import { useNodes } from '@/lib/hooks/useNodes';
import NodeEditorLayout from '@/components/admin/node-editor/NodeEditorLayout';
import { Loader2 } from 'lucide-react';

export default function NodesPage() {
  const {
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
  } = useNodes();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-editor-bg">
        <div className="flex items-center gap-3 text-editor-text-muted">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading editor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-editor-bg">
        <div className="text-center">
          <p className="text-sm text-red-400 mb-2">Failed to load editor</p>
          <p className="text-xs text-editor-text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <NodeEditorLayout
      nodes={nodes}
      edges={edges}
      onCreateNode={createNode}
      onUpdateNode={updateNode}
      onDeleteNode={deleteNode}
      onCreateEdge={createEdge}
      onDeleteEdge={deleteEdge}
      onUpdateEdge={updateEdge}
    />
  );
}
