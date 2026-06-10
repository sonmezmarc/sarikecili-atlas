import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode from './BaseNode';

function AnnotationNodeComponent({ data, selected }: NodeProps) {
  const props = (data.properties as Record<string, unknown>) ?? {};
  const annotationType = (props.annotation_type as string) ?? 'text';
  const geometryType = (props.geometry_type as string) ?? 'point';
  const color = (props.color as string) ?? '#f97316';
  const behavior = (props.behavior as string) ?? 'always';

  return (
    <BaseNode
      data={data}
      selected={selected}
      type="annotation"
      compact={
        <div className="flex items-center justify-between">
          <span className="text-[9px]" style={{ color: 'var(--editor-text-secondary)' }}>
            {annotationType}
          </span>
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: color, border: '1px solid rgba(255,255,255,0.2)' }}
          />
        </div>
      }
    >
      <div className="space-y-1">
        <Row label="Tür" value={annotationType} />
        <Row label="Geo" value={geometryType} />
        <Row label="Göster" value={behavior} />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[8px] uppercase tracking-wider shrink-0" style={{ color: 'var(--editor-text-muted)' }}>
            Renk
          </span>
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: color }}
            />
            <span className="text-[8px] font-mono" style={{ color: 'var(--editor-text-muted)' }}>
              {color}
            </span>
          </div>
        </div>
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

export default memo(AnnotationNodeComponent);
