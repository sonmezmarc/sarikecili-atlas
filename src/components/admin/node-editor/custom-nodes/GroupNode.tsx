import { memo, useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode from './BaseNode';

function GroupNode({ data, selected }: NodeProps) {
  const props = (data.properties as Record<string, unknown>) ?? {};
  const color = (props.color as string) ?? '#78716c';
  const childCount = (data.childCount as number) ?? 0;
  const description = (props.description as string) ?? '';

  // Double-click dispatches drill-into-group event
  const handleDoubleClick = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent('node-drill-into-group', { detail: { nodeId: data.id } })
    );
  }, [data.id]);

  return (
    <div onDoubleClick={handleDoubleClick}>
      <BaseNode
        data={data}
        selected={selected}
        type="group"
        compact={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ background: color }}
              />
              <span className="text-[9px]" style={{ color: 'var(--editor-text-secondary)' }}>
                {childCount} alt öğe
              </span>
            </div>
          </div>
        }
      >
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: color }}
            />
            <span className="text-[9px]" style={{ color: 'var(--editor-text-secondary)' }}>
              {childCount} öğe
            </span>
          </div>
          {description && (
            <p
              className="text-[8px] truncate"
              style={{ color: 'var(--editor-text-muted)' }}
              title={description}
            >
              {description}
            </p>
          )}
          <p className="text-[7px] uppercase tracking-widest" style={{ color: 'var(--editor-text-muted)' }}>
            girmek için çift tıkla
          </p>
        </div>
      </BaseNode>
    </div>
  );
}

export default memo(GroupNode);
