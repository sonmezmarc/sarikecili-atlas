import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

const EDGE_COLOR = '#f97316';

function TriggerEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* SVG defs for animation */}
      <defs>
        <linearGradient id={`trigger-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={EDGE_COLOR} stopOpacity={0.4} />
          <stop offset="50%" stopColor={EDGE_COLOR} stopOpacity={1} />
          <stop offset="100%" stopColor={EDGE_COLOR} stopOpacity={0.4} />
        </linearGradient>
      </defs>

      {/* Background glow for depth */}
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          stroke: EDGE_COLOR,
          strokeWidth: 6,
          strokeOpacity: 0.1,
          strokeDasharray: '8 4',
          fill: 'none',
          ...style,
        }}
      />

      {/* Main animated dashed edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: EDGE_COLOR,
          strokeWidth: 2,
          strokeDasharray: '8 4',
          fill: 'none',
          animation: 'trigger-dash 1s linear infinite',
          ...style,
        }}
      />

      {/* Inline keyframe animation */}
      <style>
        {`
          @keyframes trigger-dash {
            to {
              stroke-dashoffset: -24;
            }
          }
        `}
      </style>

      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            className="absolute text-[10px] px-1.5 py-0.5 rounded bg-editor-surface border border-editor-border text-editor-text-secondary pointer-events-all nodrag nopan"
          >
            {data.label as string}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(TriggerEdge);
