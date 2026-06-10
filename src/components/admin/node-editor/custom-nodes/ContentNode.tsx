import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import {
  Type,
  Image,
  Video,
  Volume2,
  FileImage,
  PenTool,
  FileText,
  Code,
} from 'lucide-react';
import BaseNode from './BaseNode';

const MEDIA_ICONS: Record<string, typeof Type> = {
  text: Type,
  image: Image,
  video: Video,
  audio: Volume2,
  gif: FileImage,
  drawing: PenTool,
  pdf: FileText,
  embed: Code,
};

function ContentNode({ data, selected }: NodeProps) {
  const props = (data.properties as Record<string, unknown>) ?? {};
  const mediaType = (props.media_type as string) ?? 'text';
  const caption = (props.caption as string) ?? '';
  const MediaIcon = MEDIA_ICONS[mediaType] ?? Type;

  return (
    <BaseNode
      data={data}
      selected={selected}
      type="content"
      compact={
        <div className="flex items-center gap-1.5">
          <MediaIcon size={10} strokeWidth={2} style={{ color: 'var(--editor-text-muted)' }} className="shrink-0" />
          <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--editor-text-secondary)' }}>
            {mediaType}
          </span>
        </div>
      }
    >
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <MediaIcon size={10} strokeWidth={2} style={{ color: 'var(--editor-text-muted)' }} />
          <span className="text-[9px] uppercase" style={{ color: 'var(--editor-text-secondary)' }}>
            {mediaType}
          </span>
        </div>
        {caption && (
          <p
            className="text-[9px] truncate"
            style={{ color: 'var(--editor-text-muted)' }}
            title={caption}
          >
            {caption}
          </p>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(ContentNode);
