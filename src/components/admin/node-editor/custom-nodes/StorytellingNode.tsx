import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode from './BaseNode';

function StorytellingNode({ data, selected }: NodeProps) {
  const props = (data.properties as Record<string, unknown>) ?? {};
  const chapters = (props.chapters as unknown[]) ?? [];
  const dimension = (props.dimension as string) ?? '2d';
  const title = (props.title as string) ?? '';

  return (
    <BaseNode
      data={data}
      selected={selected}
      type="storytelling"
      compact={
        <div className="flex items-center justify-between">
          <span className="text-[9px]" style={{ color: 'var(--editor-text-secondary)' }}>
            {chapters.length} böl.
          </span>
          <span
            className="text-[8px] font-semibold uppercase px-1 py-px rounded"
            style={{
              background: 'rgba(236, 72, 153, 0.15)',
              color: '#ec4899',
            }}
          >
            {dimension}
          </span>
        </div>
      }
    >
      <div className="space-y-1">
        {title && <Row label="Başlık" value={title} />}
        <Row label="Bölümler" value={String(chapters.length)} />
        <Row label="Boyut" value={dimension.toUpperCase()} />
        <Row label="Hız" value={`${(props.scroll_speed as number) ?? 1.0}x`} />
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

export default memo(StorytellingNode);
