import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode from './BaseNode';

function RouteNode({ data, selected }: NodeProps) {
  const props = (data.properties as Record<string, unknown>) ?? {};
  const routeType = (props.route_type as string) ?? 'migration';
  const color = (props.color as string) ?? '#ef4444';
  const animation = (props.animation as boolean) ?? false;
  const direction = (props.direction as string) ?? 'forward';
  const journey = (props.journey as Record<string, unknown>) ?? {};
  const journeyEnabled = (journey.enabled as boolean) ?? false;
  const waypoints = (props.waypoints as Array<unknown>) ?? [];

  return (
    <BaseNode
      data={data}
      selected={selected}
      type="route"
      compact={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: color, border: '1px solid rgba(255,255,255,0.2)' }}
            />
            <span className="text-[9px]" style={{ color: 'var(--editor-text-secondary)' }}>
              {routeType}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {journeyEnabled && (
              <span className="text-[7px] uppercase tracking-wider px-1 py-0.5 rounded" style={{ color: '#d97706', background: 'rgba(217,119,6,0.15)' }}>
                goc
              </span>
            )}
            {animation && (
              <span className="text-[7px] uppercase tracking-wider" style={{ color: 'var(--editor-text-muted)' }}>
                anim
              </span>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-1">
        <Row label="Tür" value={routeType} />
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
        <Row label="Genişlik" value={`${(props.width as number) ?? 3}px`} />
        <Row label="Yön" value={direction} />
        <Row label="Anim" value={animation ? 'açık' : 'kapalı'} />
        {journeyEnabled && (
          <>
            <Row label="Yolculuk" value={`${(journey.duration_s as number) ?? 60}sn`} />
            <Row label="Duraklar" value={`${waypoints.length}`} />
          </>
        )}
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

export default memo(RouteNode);
