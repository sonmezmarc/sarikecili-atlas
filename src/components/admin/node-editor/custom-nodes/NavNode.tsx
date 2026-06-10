import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode from './BaseNode';

function NavNode({ data, selected }: NodeProps) {
  const props = (data.properties as Record<string, unknown>) ?? {};
  const navType = (props.nav_type as string) ?? 'fly-to';
  const durationMs = (props.duration_ms as number) ?? 2000;
  const targetLat = props.target_lat as number | undefined;
  const targetLng = props.target_lng as number | undefined;

  const durationLabel = durationMs >= 1000
    ? `${(durationMs / 1000).toFixed(1)}s`
    : `${durationMs}ms`;

  return (
    <BaseNode
      data={data}
      selected={selected}
      type="nav"
      compact={
        <div className="space-y-0.5">
          <p className="text-[9px] leading-tight" style={{ color: 'var(--editor-text-secondary)' }}>
            {navType}
          </p>
          {targetLat !== undefined && targetLng !== undefined ? (
            <p className="text-[8px] font-mono leading-tight" style={{ color: 'var(--editor-text-muted)' }}>
              {targetLat.toFixed(2)}, {targetLng.toFixed(2)}
            </p>
          ) : (
            <p className="text-[8px] leading-tight" style={{ color: 'var(--editor-text-muted)' }}>
              {durationLabel}
            </p>
          )}
        </div>
      }
    >
      <div className="space-y-1">
        <Row label="Eylem" value={navType} />
        <Row label="Süre" value={durationLabel} />
        {targetLat !== undefined && (
          <Row label="Hedef" value={`${targetLat.toFixed(4)}, ${targetLng?.toFixed(4) ?? '--'}`} />
        )}
        <Row label="Eğri" value={(props.easing as string) ?? 'ease-in-out'} />
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

export default memo(NavNode);
