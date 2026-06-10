'use client';

import { useState, useCallback, useRef } from 'react';
import HierarchyTree from './HierarchyTree';
import NodePalette from './NodePalette';
import NodeCanvas from './NodeCanvas';
import PropertyPanel from './PropertyPanel';
import Timeline from './Timeline';
import CanvasToolbar from './CanvasToolbar';
import type { AtlasNode, AtlasEdge, NodeType, EdgeType } from '@/lib/types/nodes';

interface NodeEditorLayoutProps {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  onCreateNode: (type: NodeType, x: number, y: number, parentId?: string | null) => AtlasNode;
  onUpdateNode: (id: string, changes: Partial<AtlasNode>) => void;
  onDeleteNode: (id: string, withChildren: boolean) => void;
  onCreateEdge: (sourceId: string, targetId: string, type: EdgeType) => AtlasEdge;
  onDeleteEdge: (id: string) => void;
  onUpdateEdge: (id: string, changes: Partial<AtlasEdge>) => void;
}

export default function NodeEditorLayout({
  nodes,
  edges,
  onCreateNode,
  onUpdateNode,
  onDeleteNode,
  onCreateEdge,
  onDeleteEdge,
  onUpdateEdge,
}: NodeEditorLayoutProps) {
  // Panel sizes
  const [treeWidth, setTreeWidth] = useState(240);
  const [propertyWidth, setPropertyWidth] = useState(320);
  const [timelineHeight, setTimelineHeight] = useState(200);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);

  // Splitter drag handlers
  const containerRef = useRef<HTMLDivElement>(null);

  const onTreeSplitterDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = treeWidth;

    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startX;
      setTreeWidth(Math.max(180, Math.min(400, startWidth + delta)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [treeWidth]);

  const onPropertySplitterDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = propertyWidth;

    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX;
      setPropertyWidth(Math.max(260, Math.min(500, startWidth + delta)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [propertyWidth]);

  const onTimelineSplitterDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = timelineHeight;

    const onMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      setTimelineHeight(Math.max(100, Math.min(500, startHeight + delta)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [timelineHeight]);

  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-hidden">
      {/* Top area: Tree + Canvas + Property */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Hierarchy Tree + Palette */}
        <div
          className="flex flex-col border-r border-editor-border bg-editor-panel shrink-0"
          style={{ width: treeWidth }}
        >
          <div className="flex-1 overflow-hidden">
            <HierarchyTree
              nodes={nodes}
              edges={edges}
              onCreateNode={onCreateNode}
              onUpdateNode={onUpdateNode}
              onDeleteNode={onDeleteNode}
            />
          </div>
          <NodePalette
            collapsed={paletteCollapsed}
            onToggle={() => setPaletteCollapsed(!paletteCollapsed)}
          />
        </div>

        {/* Tree ↔ Canvas splitter */}
        <div
          className="w-1 cursor-col-resize splitter shrink-0"
          onMouseDown={onTreeSplitterDrag}
        />

        {/* Center: Toolbar + Canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          <CanvasToolbar nodes={nodes} />
          <div className="flex-1 min-h-0">
            <NodeCanvas
              nodes={nodes}
              edges={edges}
              onCreateNode={onCreateNode}
              onUpdateNode={onUpdateNode}
              onDeleteNode={onDeleteNode}
              onCreateEdge={onCreateEdge}
              onDeleteEdge={onDeleteEdge}
              onUpdateEdge={onUpdateEdge}
            />
          </div>
        </div>

        {/* Canvas ↔ Property splitter */}
        <div
          className="w-1 cursor-col-resize splitter shrink-0"
          onMouseDown={onPropertySplitterDrag}
        />

        {/* Right: Property / Preview */}
        <div
          className="border-l border-editor-border bg-editor-panel shrink-0 overflow-hidden"
          style={{ width: propertyWidth }}
        >
          <PropertyPanel
            nodes={nodes}
            edges={edges}
            onUpdateNode={onUpdateNode}
          />
        </div>
      </div>

      {/* Timeline ↔ Canvas splitter */}
      <div
        className="h-1 cursor-row-resize splitter shrink-0"
        onMouseDown={onTimelineSplitterDrag}
      />

      {/* Bottom: Timeline */}
      <div
        className="border-t border-editor-border bg-editor-panel shrink-0 overflow-hidden"
        style={{ height: timelineHeight }}
      >
        <Timeline
          nodes={nodes}
          edges={edges}
          onUpdateNode={onUpdateNode}
          onDeleteNode={onDeleteNode}
          onCreateNode={onCreateNode}
        />
      </div>
    </div>
  );
}
