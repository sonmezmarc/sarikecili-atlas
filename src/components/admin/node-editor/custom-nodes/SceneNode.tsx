import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode from './BaseNode';

function SceneNode({ data, selected }: NodeProps) {
  const props = (data.properties as Record<string, unknown>) ?? {};
  const layout = (props.layout as string) ?? 'right-panel';
  const enterAnim = (props.enter_animation as string) ?? 'fade';
  const background = (props.background as string) ?? 'map';

  // Shorten layout name for compact display
  const shortLayout = layout.replace('map-with-', '').replace(/-/g, ' ');

  return (
    <BaseNode
      data={data}
      selected={selected}
      type="scene"
      compact={
        <div className="space-y-0.5">
          <p className="text-[9px] leading-tight truncate" style={{ color: 'var(--editor-text-secondary)' }}>
            {shortLayout}
          </p>
          <p className="text-[8px] leading-tight" style={{ color: 'var(--editor-text-muted)' }}>
            {enterAnim} / {background}
          </p>
        </div>
      }
    >
      <div className="space-y-1">
        <Row label="Yerleşim" value={layout} />
        <Row label="Giriş" value={enterAnim} />
        <Row label="Çıkış" value={(props.exit_animation as string) ?? 'fade'} />
        <Row label="Arka Plan" value={background} />
        <Row label="Süre" value={`${(props.animation_duration_ms as number) ?? 400}ms`} />
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

export default memo(SceneNode);
