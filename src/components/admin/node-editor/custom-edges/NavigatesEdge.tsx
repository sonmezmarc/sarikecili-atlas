import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

const EDGE_COLOR = '#3b82f6';

function NavigatesEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Use a custom SVG marker for a clean arrowhead
  const markerId = `navigates-arrow-${id}`;
  const resolvedMarkerEnd = markerEnd ?? `url(#${markerId})`;

  return (
    <>
      {/* Custom arrow marker definition */}
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 12 12"
          refX="10"
          refY="6"
          markerWidth="10"
          markerHeight="10"
          orient="auto-start-reverse"
          markerUnits="strokeWidth"
        >
          <path
            d="M 2 2 L 10 6 L 2 10 z"
            fill={EDGE_COLOR}
            stroke="none"
          />
        </marker>
      </defs>

      {/* Background glow for depth */}
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          stroke: EDGE_COLOR,
          strokeWidth: 6,
          strokeOpacity: 0.1,
          fill: 'none',
          ...style,
        }}
      />

      {/* Main solid edge with arrow */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: EDGE_COLOR,
          strokeWidth: 2,
          strokeLinecap: 'round',
          fill: 'none',
          ...style,
        }}
        markerEnd={resolvedMarkerEnd}
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

export default memo(NavigatesEdge);
