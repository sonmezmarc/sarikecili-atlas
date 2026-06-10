import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode from './BaseNode';

function PointCloudNode({ data, selected }: NodeProps) {
  const props = (data.properties as Record<string, unknown>) ?? {};
  const format = (props.format as string) ?? 'ply';
  const pointBudget = (props.point_budget as number) ?? 1_000_000;
  const pointSize = (props.point_size as number) ?? 1.0;

  const budgetLabel =
    pointBudget >= 1_000_000
      ? `${(pointBudget / 1_000_000).toFixed(1)}M`
      : `${(pointBudget / 1_000).toFixed(0)}K`;

  return (
    <BaseNode
      data={data}
      selected={selected}
      type="pointcloud"
      compact={
        <div className="flex items-center justify-between">
          <span
            className="text-[8px] font-semibold uppercase px-1 py-px rounded"
            style={{
              background: 'rgba(6, 182, 212, 0.15)',
              color: '#06b6d4',
            }}
          >
            {format}
          </span>
          <span className="text-[9px] font-mono" style={{ color: 'var(--editor-text-muted)' }}>
            {budgetLabel}
          </span>
        </div>
      }
    >
      <div className="space-y-1">
        <Row label="Format" value={format.toUpperCase()} />
        <Row label="Bütçe" value={`${budgetLabel} nkt`} />
        <Row label="Nkt Boy" value={pointSize.toFixed(1)} />
        <Row label="Stil" value={(props.transition_style as string) ?? 'dive-in'} />
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
      <span className="text-[9px] font-mono truncate" style={{ color: 'var(--editor-text-secondary)' }}>
        {value}
      </span>
    </div>
  );
}

export default memo(PointCloudNode);
