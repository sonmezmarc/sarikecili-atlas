import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode from './BaseNode';

function GateNode({ data, selected }: NodeProps) {
  const props = (data.properties as Record<string, unknown>) ?? {};
  const gateMode = (props.gate_mode as string) ?? 'single';
  const style = (props.style as string) ?? 'button';
  const isParallel = gateMode === 'parallel';

  return (
    <BaseNode
      data={data}
      selected={selected}
      type="gate"
      compact={
        <div className="flex items-center justify-between">
          <span
            className="text-[8px] font-semibold uppercase px-1 py-px rounded"
            style={{
              background: isParallel ? 'rgba(249, 115, 22, 0.18)' : 'rgba(148, 163, 184, 0.15)',
              color: isParallel ? '#f97316' : 'var(--editor-text-secondary)',
            }}
          >
            {gateMode}
          </span>
          <span className="text-[8px]" style={{ color: 'var(--editor-text-muted)' }}>
            {style}
          </span>
        </div>
      }
    >
      <div className="space-y-1">
        <Row label="Mod" value={gateMode} />
        <Row label="Stil" value={style} />
        <Row label="Görünür" value={(props.visibility_rule as string) ?? 'always'} />
        <Row label="Boyut" value={(props.size as string) ?? 'md'} />
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

export default memo(GateNode);
