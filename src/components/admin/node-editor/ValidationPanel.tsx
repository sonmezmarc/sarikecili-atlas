'use client';

import { useMemo } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { NODE_TYPE_CONFIG } from '@/lib/constants';
import type { AtlasNode, AtlasEdge, NodeType } from '@/lib/types/nodes';
import { validateAllNodes } from '@/lib/validation/nodeValidation';

interface ValidationPanelProps {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
}

const SEVERITY_CONFIG = {
  error: { icon: AlertCircle, color: '#ef4444', label: 'Hata' },
  warning: { icon: AlertTriangle, color: '#f59e0b', label: 'Uyarı' },
  info: { icon: Info, color: '#3b82f6', label: 'Bilgi' },
};

export default function ValidationPanel({ nodes, edges }: ValidationPanelProps) {
  const { selectNode } = useEditorStore();
  const warnings = useMemo(() => validateAllNodes(nodes, edges), [nodes, edges]);

  const errorCount = warnings.filter(w => w.severity === 'error').length;
  const warnCount = warnings.filter(w => w.severity === 'warning').length;
  const infoCount = warnings.filter(w => w.severity === 'info').length;

  if (warnings.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-editor-text-muted">
        Sorun bulunamadı
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Ozet bar */}
      <div className="flex gap-3 px-3 py-2 border-b border-editor-border text-[10px] shrink-0">
        {errorCount > 0 && <span className="text-red-400">{errorCount} hata</span>}
        {warnCount > 0 && <span className="text-yellow-400">{warnCount} uyarı</span>}
        {infoCount > 0 && <span className="text-blue-400">{infoCount} bilgi</span>}
      </div>
      {/* Liste */}
      <div className="flex-1 overflow-y-auto custom-scroll">
        {warnings.map((w, i) => {
          const node = nodes.find(n => n.id === w.nodeId);
          const config = node ? NODE_TYPE_CONFIG[node.type as NodeType] : null;
          const SeverityIcon = SEVERITY_CONFIG[w.severity].icon;
          return (
            <button
              key={i}
              onClick={() => selectNode(w.nodeId)}
              className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-editor-surface transition-colors border-b border-editor-border/50"
            >
              <SeverityIcon size={12} color={SEVERITY_CONFIG[w.severity].color} className="shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {config && <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: config.color }} />}
                  <span className="text-[11px] text-editor-text truncate">{node?.label || config?.label || w.nodeId.slice(0,8)}</span>
                </div>
                <p className="text-[10px] text-editor-text-muted mt-0.5">{w.message}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
