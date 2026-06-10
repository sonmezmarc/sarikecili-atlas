import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode from './BaseNode';

function AnchorNode({ data, selected }: NodeProps) {
  const props = (data.properties as Record<string, unknown>) ?? {};
  const lat = props.lat as number | undefined;
  const lng = props.lng as number | undefined;
  const iconStyle = (props.icon_style as string) ?? 'heritage';

  return (
    <BaseNode
      data={data}
      selected={selected}
      type="anchor"
      compact={
        <div className="space-y-0.5">
          {lat !== undefined && lng !== undefined ? (
            <p className="text-[9px] font-mono leading-tight" style={{ color: 'var(--editor-text-secondary)' }}>
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </p>
          ) : (
            <p className="text-[9px] italic leading-tight" style={{ color: 'var(--editor-text-muted)' }}>
              koordinat yok
            </p>
          )}
          <p className="text-[8px] uppercase tracking-wider leading-tight" style={{ color: 'var(--editor-text-muted)' }}>
            {iconStyle}
          </p>
        </div>
      }
    >
      <div className="space-y-1">
        <Row label="Enlem" value={lat?.toFixed(6) ?? '--'} />
        <Row label="Boylam" value={lng?.toFixed(6) ?? '--'} />
        <Row label="İkon" value={iconStyle} />
        <Row label="Boyut" value={(props.marker_size as string) ?? 'md'} />
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

export default memo(AnchorNode);
