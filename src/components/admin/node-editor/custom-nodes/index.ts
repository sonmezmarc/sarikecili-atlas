import type { NodeTypes } from '@xyflow/react';

import AnchorNode from './AnchorNode';
import SceneNode from './SceneNode';
import ContentNode from './ContentNode';
import PointCloudNode from './PointCloudNode';
import HotspotNode from './HotspotNode';
import GateNode from './GateNode';
import NavNode from './NavNode';
import GroupNode from './GroupNode';
import ImportNode from './ImportNode';
import StorytellingNode from './StorytellingNode';
import EffectNode from './EffectNode';
import AnnotationNodeComponent from './AnnotationNodeComponent';
import LayerNode from './LayerNode';
import RouteNode from './RouteNode';

export const nodeTypes: NodeTypes = {
  anchor: AnchorNode,
  scene: SceneNode,
  content: ContentNode,
  pointcloud: PointCloudNode,
  hotspot: HotspotNode,
  gate: GateNode,
  nav: NavNode,
  group: GroupNode,
  import: ImportNode,
  storytelling: StorytellingNode,
  effect: EffectNode,
  annotation: AnnotationNodeComponent,
  layer: LayerNode,
  route: RouteNode,
};

export {
  AnchorNode,
  SceneNode,
  ContentNode,
  PointCloudNode,
  HotspotNode,
  GateNode,
  NavNode,
  GroupNode,
  ImportNode,
  StorytellingNode,
  EffectNode,
  AnnotationNodeComponent,
  LayerNode,
  RouteNode,
};

export { default as BaseNode } from './BaseNode';
export type { BaseNodeProps } from './BaseNode';
