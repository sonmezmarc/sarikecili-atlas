import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode from './BaseNode';

function LayerNode({ data, selected }: NodeProps) {
  const props = (data.properties as Record<string, unknown>) ?? {};
  const layerName = (props.layer_name as string) ?? 'Katman';
  const color = (props.color as string) ?? '#3b82f6';
  const visible = (props.visibility_default as boolean) ?? true;

  return (
    <BaseNode
      data={data}
      selected={selected}
      type="layer"
      compact={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: color, border: '1px solid rgba(255,255,255,0.2)' }}
            />
            <span className="text-[9px] truncate" style={{ color: 'var(--editor-text-secondary)' }} title={layerName}>
              {layerName}
            </span>
          </div>
        </div>
      }
    >
      <div className="space-y-1">
        <Row label="Ad" value={layerName} />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[8px] uppercase tracking-wider shrink-0" style={{ color: 'var(--editor-text-muted)' }}>
            Renk
          </span>
          <div className="flex items-center gap-1">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: color }}
            />
            <span className="text-[8px] font-mono" style={{ color: 'var(--editor-text-muted)' }}>
              {color}
            </span>
          </div>
        </div>
        <Row label="Görünür" value={visible ? 'açık' : 'kapalı'} />
        <Row label="Sıra" value={String((props.sort_order as number) ?? 0)} />
      </div>
    </BaseNode>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[8px] uppercase tracking-wider shrink-0" style={{ color: 'var(--editor-text-muted)' }}>
        {label}
      </span>
      <span className="text-[9px] truncate" style={{ color: 'var(--editor-text-secondary)' }}>
        {value}
      </span>
    </div>
  );
}

export default memo(LayerNode);
