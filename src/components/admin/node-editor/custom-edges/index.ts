import type { EdgeTypes } from '@xyflow/react';

import TriggerEdge from './TriggerEdge';
import ContainsEdge from './ContainsEdge';
import NavigatesEdge from './NavigatesEdge';
import ReferencesEdge from './ReferencesEdge';

export const edgeTypes: EdgeTypes = {
  trigger: TriggerEdge,
  contains: ContainsEdge,
  navigates: NavigatesEdge,
  references: ReferencesEdge,
};

export { TriggerEdge, ContainsEdge, NavigatesEdge, ReferencesEdge };
