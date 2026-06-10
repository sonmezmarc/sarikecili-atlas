import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode from './BaseNode';

function EffectNode({ data, selected }: NodeProps) {
  const props = (data.properties as Record<string, unknown>) ?? {};
  const effectType = (props.effect_type as string) ?? 'fade';
  const durationMs = (props.duration_ms as number) ?? 400;
  const easing = (props.easing as string) ?? 'ease-in-out';

  const durationLabel =
    durationMs >= 1000
      ? `${(durationMs / 1000).toFixed(1)}s`
      : `${durationMs}ms`;

  return (
    <BaseNode
      data={data}
      selected={selected}
      type="effect"
      compact={
        <div className="flex items-center justify-between">
          <span className="text-[9px]" style={{ color: 'var(--editor-text-secondary)' }}>
            {effectType}
          </span>
          <span className="text-[8px] font-mono" style={{ color: 'var(--editor-text-muted)' }}>
            {durationLabel}
          </span>
        </div>
      }
    >
      <div className="space-y-1">
        <Row label="Efekt" value={effectType} />
        <Row label="Süre" value={durationLabel} />
        <Row label="Gecikme" value={`${(props.delay_ms as number) ?? 0}ms`} />
        <Row label="Eğri" value={easing} />
        <Row label="Hedef" value={(props.target_property as string) ?? 'opacity'} />
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

export default memo(EffectNode);
