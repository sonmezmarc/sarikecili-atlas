import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode from './BaseNode';

function HotspotNode({ data, selected }: NodeProps) {
  const props = (data.properties as Record<string, unknown>) ?? {};
  const hsLabel = (props.label as string) ?? 'Etkin Nokta';
  const iconType = (props.icon as string) ?? 'info';
  const popupStyle = (props.popup_style as string) ?? 'tooltip';

  return (
    <BaseNode
      data={data}
      selected={selected}
      type="hotspot"
      compact={
        <div className="space-y-0.5">
          <p className="text-[9px] leading-tight truncate" style={{ color: 'var(--editor-text-secondary)' }} title={hsLabel}>
            {hsLabel}
          </p>
          <p className="text-[8px] leading-tight" style={{ color: 'var(--editor-text-muted)' }}>
            {iconType}
          </p>
        </div>
      }
    >
      <div className="space-y-1">
        <Row label="Etiket" value={hsLabel} />
        <Row label="İkon" value={iconType} />
        <Row label="Açılır" value={popupStyle} />
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

export default memo(HotspotNode);
