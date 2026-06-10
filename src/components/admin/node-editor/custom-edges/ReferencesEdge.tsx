import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

const EDGE_COLOR = '#22c55e';

function ReferencesEdge({
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
      {/* Background glow for depth */}
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          stroke: EDGE_COLOR,
          strokeWidth: 6,
          strokeOpacity: 0.08,
          strokeDasharray: '3 3',
          fill: 'none',
          ...style,
        }}
      />

      {/* Main dotted edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: EDGE_COLOR,
          strokeWidth: 2,
          strokeDasharray: '3 3',
          strokeLinecap: 'round',
          fill: 'none',
          ...style,
        }}
      />

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

export default memo(ReferencesEdge);
