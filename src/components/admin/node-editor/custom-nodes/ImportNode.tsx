import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode from './BaseNode';

function ImportNode({ data, selected }: NodeProps) {
  const props = (data.properties as Record<string, unknown>) ?? {};
  const originalName = (props.original_name as string) ?? '';
  const resolvedType = (props.resolved_type as string) ?? '';
  const fileSize = props.file_size as number | undefined;

  // Format file size
  const sizeLabel = fileSize
    ? fileSize >= 1_000_000
      ? `${(fileSize / 1_000_000).toFixed(1)} MB`
      : fileSize >= 1_000
        ? `${(fileSize / 1_000).toFixed(0)} KB`
        : `${fileSize} B`
    : '';

  // Extract file extension from name
  const ext = originalName ? originalName.split('.').pop()?.toUpperCase() ?? '' : '';

  return (
    <BaseNode
      data={data}
      selected={selected}
      type="import"
      compact={
        <div className="space-y-0.5">
          {ext ? (
            <span
              className="text-[8px] font-semibold uppercase px-1 py-px rounded"
              style={{
                background: 'rgba(132, 204, 22, 0.15)',
                color: '#84cc16',
              }}
            >
              {ext}
            </span>
          ) : (
            <span className="text-[9px] italic" style={{ color: 'var(--editor-text-muted)' }}>
              dosya yok
            </span>
          )}
          {originalName && (
            <p className="text-[8px] truncate" style={{ color: 'var(--editor-text-muted)' }} title={originalName}>
              {originalName}
            </p>
          )}
        </div>
      }
    >
      <div className="space-y-1">
        {originalName && <Row label="Dosya" value={originalName} />}
        {resolvedType && <Row label="Tür" value={resolvedType} />}
        {sizeLabel && <Row label="Boyut" value={sizeLabel} />}
        <Row label="Oto" value={(props.auto_detect as boolean) ? 'açık' : 'kapalı'} />
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

export default memo(ImportNode);
