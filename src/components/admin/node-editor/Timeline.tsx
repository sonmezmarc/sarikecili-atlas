'use client';

import {
  useState, useCallback, useRef, useEffect, useMemo,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { useEditorStore } from '@/stores/editorStore';
import {
  NODE_TYPE_CONFIG, DEFAULT_BLOCK_DURATION_S, SELECTION_COLOR,
  TIMELINE_BASE_PX_PER_SEC, TIMELINE_TRACK_HEIGHT, TIMELINE_RULER_HEIGHT,
  TIMELINE_TRACK_HEADER_WIDTH, TIMELINE_MIN_BLOCK_DURATION,
} from '@/lib/constants';
import TimelineInputDialog from './TimelineInputDialog';
import type { AtlasNode, AtlasEdge, NodeType, TimelineTrack, TimelineBlock, RouteProperties, RouteWaypoint } from '@/lib/types/nodes';
import { prepareRouteGeometry, getPositionAtProgress } from '@/lib/gis/routeGeometry';
import { useRouteAnimationStore } from '@/stores/routeAnimationStore';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronDown, ChevronRight, Play, Pause, Plus, Lock, EyeOff,
  Trash2, MoreHorizontal, GripVertical,
  MapPin, Film, FileText, Cloud, Target, DoorOpen, Navigation, FolderOpen,
  Upload, BookOpen, Sparkles, PenTool, Layers, Route,
  Copy, Clock, Palette, SplitSquareHorizontal, ArrowUpDown,
  ArrowUp, ArrowDown, Pencil,
} from 'lucide-react';

/* ─── Icon Map ─── */
const ICON_MAP: Record<string, LucideIcon> = {
  MapPin, Film, FileText, Cloud, Target, DoorOpen, Navigation, FolderOpen,
  Upload, BookOpen, Sparkles, PenTool, Layers, Route,
};

/* ─── Constants (imported from @/lib/constants) ─── */
const BASE_PX_PER_SEC = TIMELINE_BASE_PX_PER_SEC;
const TRACK_HEIGHT = TIMELINE_TRACK_HEIGHT;
const RULER_HEIGHT = TIMELINE_RULER_HEIGHT;
const TRACK_HEADER_WIDTH = TIMELINE_TRACK_HEADER_WIDTH;
const MIN_BLOCK_DURATION = TIMELINE_MIN_BLOCK_DURATION;

/* ─── Utility: generate ID ─── */
let _idCounter = 0;
function genId(prefix = 'tl') {
  return `${prefix}_${Date.now().toString(36)}_${(++_idCounter).toString(36)}`;
}

/* ─── Types ─── */
type LayerKey = 'gl' | 'b' | 'd';

type TrackState = TimelineTrack;

type BlockState = TimelineBlock;

interface LayerData {
  key: LayerKey;
  label: string;
  fullLabel: string;
  tracks: TrackState[];
  blocks: BlockState[];
  nodes: AtlasNode[];
}

interface ContextMenuState {
  x: number;
  y: number;
  type: 'block' | 'track' | 'empty';
  blockId?: string;
  trackId?: string;
  layerKey?: LayerKey;
}

/* ─── Props ─── */
interface TimelineProps {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  onUpdateNode?: (id: string, changes: Partial<AtlasNode>) => void;
  onDeleteNode?: (id: string, withChildren: boolean) => void;
  onCreateNode?: (type: NodeType, x: number, y: number, parentId?: string | null) => AtlasNode;
}

const WAYPOINT_BLOCK_PREFIX = '__wp_';
const WAYPOINT_TRACK_NAME = 'Konalga';
const WAYPOINT_BLOCK_COLOR = '#f59e0b';

/* ─── Main Component ─── */
export default function Timeline({ nodes, edges, onUpdateNode }: TimelineProps) {
  const {
    selectedNodeId,
    selectNode,
    activeGroupId,
    timeline,
    setTimelineLayerMinimized,
    setTimelinePlayhead,
    setTimelineZoom,
    setTimelinePlaying,
    timelineTracks: layerTracks,
    timelineBlocks: layerBlocks,
    setTimelineTracks,
    setTimelineBlocks,
    addTimelineTrack,
    removeTimelineTrack,
    updateTimelineTrack,
    updateTimelineBlock,
    addTimelineBlock,
    removeTimelineBlock,
  } = useEditorStore();

  const pxPerSec = BASE_PX_PER_SEC * timeline.zoom;

  /* ─── Playback animation loop ─── */
  const playheadRef = useRef({ gl: timeline.gl.playheadPosition, b: timeline.b.playheadPosition, d: timeline.d.playheadPosition });
  const lastFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!timeline.isPlaying) {
      lastFrameRef.current = 0;
      return;
    }

    let animId: number;
    const tick = (timestamp: number) => {
      if (lastFrameRef.current === 0) {
        lastFrameRef.current = timestamp;
      }
      const delta = (timestamp - lastFrameRef.current) / 1000; // seconds
      lastFrameRef.current = timestamp;

      // Advance all non-minimized layer playheads
      const layers: Array<'gl' | 'b' | 'd'> = ['gl', 'b', 'd'];
      for (const key of layers) {
        if (!timeline[key].minimized) {
          const newPos = playheadRef.current[key] + delta;
          playheadRef.current[key] = newPos;
          setTimelinePlayhead(key, newPos);
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline.isPlaying, setTimelinePlayhead]);

  // Keep ref in sync when user scrubs manually
  useEffect(() => {
    playheadRef.current = {
      gl: timeline.gl.playheadPosition,
      b: timeline.b.playheadPosition,
      d: timeline.d.playheadPosition,
    };
  }, [timeline.gl.playheadPosition, timeline.b.playheadPosition, timeline.d.playheadPosition]);

  /* ─── Layer node sets ─── */
  const rootNodes = useMemo(() => nodes.filter((n) => n.parent_id === null), [nodes]);

  const contextParentId = activeGroupId || null;
  const contextNodes = useMemo(
    () => (contextParentId ? nodes.filter((n) => n.parent_id === contextParentId) : []),
    [nodes, contextParentId],
  );

  const detailNodes = useMemo(() => {
    if (!selectedNodeId) return [];
    const selectedNode = nodes.find((n) => n.id === selectedNodeId);
    if (!selectedNode) return [];

    // Collect IDs of nodes connected via edges (both directions)
    const connectedIds = new Set<string>();
    for (const edge of edges) {
      if (edge.source_node_id === selectedNodeId) connectedIds.add(edge.target_node_id);
      if (edge.target_node_id === selectedNodeId) connectedIds.add(edge.source_node_id);
    }

    // Selected node first, then connected nodes
    const result = [selectedNode];
    const connectedArr = Array.from(connectedIds);
    for (let i = 0; i < connectedArr.length; i++) {
      const id = connectedArr[i];
      if (id === selectedNodeId) continue;
      const node = nodes.find((n) => n.id === id);
      if (node) result.push(node);
    }
    return result;
  }, [nodes, edges, selectedNodeId]);

  /* ─── Per-layer track & block state (from store, persisted via localStorage) ─── */

  /* ─── Sync nodes → blocks: auto-create blocks for nodes that don't have one ─── */
  const syncNodeBlocks = useCallback(
    (layerKey: LayerKey, layerNodes: AtlasNode[]) => {
      const existing = layerBlocks[layerKey] || [];
      const existingNodeIds = new Set(existing.map((b) => b.node_id));
      const currentNodeIds = new Set(layerNodes.map((n) => n.id));

      // Remove blocks for deleted nodes
      const updated = existing.filter((b) => currentNodeIds.has(b.node_id));

      // Add blocks for new nodes
      const tracks = layerTracks[layerKey] || [];
      const firstTrackId = tracks[0]?.id;
      if (!firstTrackId) return;

      const newNodes = layerNodes.filter((n) => !existingNodeIds.has(n.id));
      if (newNodes.length === 0 && updated.length === existing.length) return;

      // Place new blocks sequentially on track 1
      const existingOnTrack1 = updated.filter((b) => b.track_id === firstTrackId);
      let nextStart = 0;
      if (existingOnTrack1.length > 0) {
        nextStart = Math.max(...existingOnTrack1.map((b) => b.start_s + b.duration_s));
      }

      for (const node of newNodes) {
        updated.push({
          id: genId('blk'),
          node_id: node.id,
          track_id: firstTrackId,
          start_s: nextStart,
          duration_s: DEFAULT_BLOCK_DURATION_S,
        });
        nextStart += DEFAULT_BLOCK_DURATION_S;
      }

      setTimelineBlocks(layerKey, updated);
    },
    [layerTracks, layerBlocks, setTimelineBlocks],
  );

  // Effect to sync
  useEffect(() => { syncNodeBlocks('gl', rootNodes); }, [rootNodes, syncNodeBlocks]);
  useEffect(() => { syncNodeBlocks('b', contextNodes); }, [contextNodes, syncNodeBlocks]);
  useEffect(() => { syncNodeBlocks('d', detailNodes); }, [detailNodes, syncNodeBlocks]);

  /* ─── Waypoint → Timeline block sync for D layer ─── */
  const syncWaypointBlocks = useCallback(() => {
    if (!selectedNodeId) return;
    const selectedNode = nodes.find((n) => n.id === selectedNodeId);
    if (!selectedNode || selectedNode.type !== 'route') return;

    const props = selectedNode.properties as unknown as RouteProperties;
    if (!props.journey?.enabled) return;

    const waypoints = props.waypoints || [];
    const durationS = props.journey?.duration_s ?? 60;
    const dTracks = layerTracks.d || [];
    const dBlocks = layerBlocks.d || [];

    // Ensure "Konalga" track exists
    let waypointTrack = dTracks.find((t) => t.name === WAYPOINT_TRACK_NAME);
    if (!waypointTrack) {
      waypointTrack = {
        id: genId('trk'),
        name: WAYPOINT_TRACK_NAME,
        locked: false,
        hidden: false,
      };
      addTimelineTrack('d', waypointTrack);
      return; // Will re-run after track is added
    }

    // Get existing waypoint blocks on this track
    const existingWpBlocks = dBlocks.filter(
      (b) => b.track_id === waypointTrack!.id && b.node_id.startsWith(WAYPOINT_BLOCK_PREFIX)
    );
    const existingWpIds = new Set(existingWpBlocks.map((b) => b.node_id.replace(WAYPOINT_BLOCK_PREFIX, '')));
    const currentWpIds = new Set(waypoints.map((wp) => wp.id));

    let changed = false;
    let updatedBlocks = [...dBlocks];

    // Remove blocks for deleted waypoints
    const beforeLen = updatedBlocks.length;
    updatedBlocks = updatedBlocks.filter(
      (b) => !(b.node_id.startsWith(WAYPOINT_BLOCK_PREFIX) && !currentWpIds.has(b.node_id.replace(WAYPOINT_BLOCK_PREFIX, '')))
    );
    if (updatedBlocks.length !== beforeLen) changed = true;

    // Add blocks for new waypoints
    for (const wp of waypoints) {
      if (!existingWpIds.has(wp.id)) {
        updatedBlocks.push({
          id: genId('wpblk'),
          node_id: WAYPOINT_BLOCK_PREFIX + wp.id,
          track_id: waypointTrack.id,
          start_s: wp.distance_pct * durationS,
          duration_s: Math.max(1, wp.pause_ms / 1000),
          color: WAYPOINT_BLOCK_COLOR,
        });
        changed = true;
      }
    }

    if (changed) {
      setTimelineBlocks('d', updatedBlocks);
    }
  }, [selectedNodeId, nodes, layerTracks.d, layerBlocks.d, addTimelineTrack, setTimelineBlocks]);

  useEffect(() => { syncWaypointBlocks(); }, [syncWaypointBlocks]);

  /* ─── Waypoint block drag/resize → update waypoint data ─── */
  const handleWaypointBlockUpdate = useCallback((blockId: string, newStart?: number, newDuration?: number) => {
    if (!selectedNodeId || !onUpdateNode) return;
    const selectedNode = nodes.find((n) => n.id === selectedNodeId);
    if (!selectedNode || selectedNode.type !== 'route') return;

    const props = selectedNode.properties as unknown as RouteProperties;
    if (!props.journey?.enabled) return;

    const dBlocks = layerBlocks.d || [];
    const block = dBlocks.find((b) => b.id === blockId);
    if (!block || !block.node_id.startsWith(WAYPOINT_BLOCK_PREFIX)) return;

    const wpId = block.node_id.replace(WAYPOINT_BLOCK_PREFIX, '');
    const waypoints = [...(props.waypoints || [])];
    const wpIndex = waypoints.findIndex((w) => w.id === wpId);
    if (wpIndex < 0) return;

    const durationS = props.journey?.duration_s ?? 60;
    const updatedWp = { ...waypoints[wpIndex] };
    let wpChanged = false;

    if (newStart !== undefined) {
      const newPct = Math.max(0, Math.min(1, newStart / durationS));
      if (Math.abs(updatedWp.distance_pct - newPct) > 0.001) {
        updatedWp.distance_pct = newPct;
        wpChanged = true;
      }
    }

    if (newDuration !== undefined) {
      const newPauseMs = Math.max(0, Math.round(newDuration * 1000));
      if (updatedWp.pause_ms !== newPauseMs) {
        updatedWp.pause_ms = newPauseMs;
        wpChanged = true;
      }
    }

    if (wpChanged) {
      waypoints[wpIndex] = updatedWp;
      onUpdateNode(selectedNode.id, {
        properties: { ...selectedNode.properties as Record<string, unknown>, waypoints },
      });

      // Update preview marker position
      if (props.geojson_data) {
        const route = prepareRouteGeometry(props.geojson_data);
        if (route) {
          const lngLat = getPositionAtProgress(route, updatedWp.distance_pct);
          useRouteAnimationStore.getState().setPreviewWaypoint(wpId, lngLat);
        }
      }
    }
  }, [selectedNodeId, nodes, layerBlocks.d, onUpdateNode]);

  /* ─── Build layer data ─── */
  const layers: LayerData[] = useMemo(() => [
    { key: 'gl' as LayerKey, label: 'GL', fullLabel: 'Global', tracks: layerTracks.gl, blocks: layerBlocks.gl, nodes: rootNodes },
    { key: 'b' as LayerKey, label: 'B', fullLabel: 'Bağlam', tracks: layerTracks.b, blocks: layerBlocks.b, nodes: contextNodes },
    { key: 'd' as LayerKey, label: 'D', fullLabel: 'Detay', tracks: layerTracks.d, blocks: layerBlocks.d, nodes: detailNodes },
  ], [layerTracks, layerBlocks, rootNodes, contextNodes, detailNodes]);

  /* ─── Context menu ─── */
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const [durationInput, setDurationInput] = useState<{ blockId: string; layerKey: LayerKey; value: string } | null>(null);
  const [colorInput, setColorInput] = useState<{ blockId: string; layerKey: LayerKey; value: string } | null>(null);
  const [renameTrack, setRenameTrack] = useState<{ trackId: string; layerKey: LayerKey; value: string } | null>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handler = () => { if (ctxMenu) setCtxMenu(null); };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [ctxMenu]);

  /* ─── Track Operations ─── */
  const addTrack = useCallback((layerKey: LayerKey) => {
    const tracks = layerTracks[layerKey] || [];
    const newTrack: TrackState = {
      id: genId('trk'),
      name: `Track ${tracks.length + 1}`,
      locked: false,
      hidden: false,
    };
    addTimelineTrack(layerKey, newTrack);
  }, [layerTracks, addTimelineTrack]);

  const deleteTrack = useCallback((layerKey: LayerKey, trackId: string) => {
    removeTimelineTrack(layerKey, trackId);
  }, [removeTimelineTrack]);

  const renameTrackAction = useCallback((layerKey: LayerKey, trackId: string, name: string) => {
    updateTimelineTrack(layerKey, trackId, { name });
  }, [updateTimelineTrack]);

  const moveTrack = useCallback((layerKey: LayerKey, trackId: string, direction: 'up' | 'down') => {
    const tracks = [...(layerTracks[layerKey] || [])];
    const idx = tracks.findIndex((t) => t.id === trackId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= tracks.length) return;
    [tracks[idx], tracks[swapIdx]] = [tracks[swapIdx], tracks[idx]];
    setTimelineTracks(layerKey, tracks);
  }, [layerTracks, setTimelineTracks]);

  const toggleTrackLock = useCallback((layerKey: LayerKey, trackId: string) => {
    const track = (layerTracks[layerKey] || []).find((t) => t.id === trackId);
    if (track) updateTimelineTrack(layerKey, trackId, { locked: !track.locked });
  }, [layerTracks, updateTimelineTrack]);

  const toggleTrackHidden = useCallback((layerKey: LayerKey, trackId: string) => {
    const track = (layerTracks[layerKey] || []).find((t) => t.id === trackId);
    if (track) updateTimelineTrack(layerKey, trackId, { hidden: !track.hidden });
  }, [layerTracks, updateTimelineTrack]);

  /* ─── Block Operations ─── */
  const deleteBlock = useCallback((layerKey: LayerKey, blockId: string) => {
    removeTimelineBlock(layerKey, blockId);
  }, [removeTimelineBlock]);

  const copyBlock = useCallback((layerKey: LayerKey, blockId: string) => {
    const block = (layerBlocks[layerKey] || []).find((b) => b.id === blockId);
    if (!block) return;
    const copy: BlockState = {
      ...block,
      id: genId('blk'),
      start_s: block.start_s + block.duration_s + 0.5,
    };
    addTimelineBlock(layerKey, copy);
  }, [layerBlocks, addTimelineBlock]);

  const setBlockDuration = useCallback((layerKey: LayerKey, blockId: string, duration: number) => {
    const clampedDur = Math.max(MIN_BLOCK_DURATION, duration);
    updateTimelineBlock(layerKey, blockId, { duration_s: clampedDur });

    // Sync waypoint pause_ms if this is a waypoint block in D layer
    if (layerKey === 'd') {
      handleWaypointBlockUpdate(blockId, undefined, clampedDur);
    }
  }, [updateTimelineBlock, handleWaypointBlockUpdate]);

  const setBlockColor = useCallback((layerKey: LayerKey, blockId: string, color: string) => {
    updateTimelineBlock(layerKey, blockId, { color });
  }, [updateTimelineBlock]);

  const moveBlockToTrack = useCallback((layerKey: LayerKey, blockId: string, trackId: string) => {
    updateTimelineBlock(layerKey, blockId, { track_id: trackId });
  }, [updateTimelineBlock]);

  const addWaitBlock = useCallback((layerKey: LayerKey, afterBlockId: string) => {
    const block = (layerBlocks[layerKey] || []).find((b) => b.id === afterBlockId);
    if (!block) return;
    const wait: BlockState = {
      id: genId('wait'),
      node_id: '__wait__',
      track_id: block.track_id,
      start_s: block.start_s + block.duration_s,
      duration_s: 2,
      color: '#475569',
    };
    addTimelineBlock(layerKey, wait);
  }, [layerBlocks, addTimelineBlock]);

  const addGateBlock = useCallback((layerKey: LayerKey, afterBlockId: string) => {
    const block = (layerBlocks[layerKey] || []).find((b) => b.id === afterBlockId);
    if (!block) return;
    const gate: BlockState = {
      id: genId('gate'),
      node_id: '__gate__',
      track_id: block.track_id,
      start_s: block.start_s + block.duration_s,
      duration_s: 1,
      color: '#f97316',
    };
    addTimelineBlock(layerKey, gate);
  }, [layerBlocks, addTimelineBlock]);

  const splitBlock = useCallback((layerKey: LayerKey, blockId: string) => {
    const blocks = [...(layerBlocks[layerKey] || [])];
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx < 0) return;
    const block = blocks[idx];
    const halfDur = block.duration_s / 2;
    blocks[idx] = { ...block, duration_s: halfDur };
    blocks.splice(idx + 1, 0, {
      ...block,
      id: genId('blk'),
      start_s: block.start_s + halfDur,
      duration_s: halfDur,
    });
    setTimelineBlocks(layerKey, blocks);
  }, [layerBlocks, setTimelineBlocks]);

  /* ─── Block drag position ─── */
  const updateBlockPosition = useCallback((layerKey: LayerKey, blockId: string, newStart: number, newTrackId?: string) => {
    const changes: Partial<TimelineBlock> = { start_s: Math.max(0, newStart) };
    if (newTrackId) changes.track_id = newTrackId;
    updateTimelineBlock(layerKey, blockId, changes);

    // Sync waypoint data if this is a waypoint block in D layer
    if (layerKey === 'd') {
      handleWaypointBlockUpdate(blockId, Math.max(0, newStart), undefined);
    }
  }, [updateTimelineBlock, handleWaypointBlockUpdate]);

  /* ─── Wheel handler for zoom/pan ─── */
  const handleWheel = useCallback(
    (e: ReactWheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        const newZoom = Math.max(0.1, Math.min(10, timeline.zoom * factor));
        setTimelineZoom(newZoom);
      }
      // Normal scroll = horizontal pan is handled natively by overflow-x
    },
    [timeline.zoom, setTimelineZoom],
  );

  /* ─── Handle block selection with waypoint preview ─── */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSelectNode = useCallback((nodeId: string, type: NodeType, layerKey?: LayerKey) => {
    // If this is a waypoint block node_id, show preview marker instead of selecting
    if (nodeId.startsWith(WAYPOINT_BLOCK_PREFIX)) {
      const wpId = nodeId.replace(WAYPOINT_BLOCK_PREFIX, '');
      const selectedNode = nodes.find((n) => n.id === selectedNodeId);
      if (selectedNode && selectedNode.type === 'route') {
        const props = selectedNode.properties as unknown as RouteProperties;
        const wp = props.waypoints?.find((w) => w.id === wpId);
        if (wp && props.geojson_data) {
          const route = prepareRouteGeometry(props.geojson_data);
          if (route) {
            const lngLat = getPositionAtProgress(route, wp.distance_pct);
            useRouteAnimationStore.getState().setPreviewWaypoint(wpId, lngLat);
          }
        }
      }
      return;
    }
    // Clear preview when selecting a non-waypoint block
    useRouteAnimationStore.getState().setPreviewWaypoint(null, null);
    selectNode(nodeId, type);
  }, [nodes, selectedNodeId, selectNode]);

  return (
    <div className="flex flex-col h-full select-none" onWheel={handleWheel}>
      {layers.map((layer) => (
        <TimelineLayer
          key={layer.key}
          layer={layer}
          minimized={timeline[layer.key].minimized}
          playhead={timeline[layer.key].playheadPosition}
          isPlaying={timeline.isPlaying}
          pxPerSec={pxPerSec}
          selectedNodeId={selectedNodeId}
          activeGroupId={activeGroupId}
          allNodes={nodes}
          onToggleMinimize={() => setTimelineLayerMinimized(layer.key, !timeline[layer.key].minimized)}
          onPlayheadChange={(pos) => setTimelinePlayhead(layer.key, pos)}
          onTogglePlay={() => setTimelinePlaying(!timeline.isPlaying)}
          onSelectNode={(id, type) => handleSelectNode(id, type, layer.key)}
          onAddTrack={() => addTrack(layer.key)}
          onDeleteTrack={(trackId) => deleteTrack(layer.key, trackId)}
          onRenameTrack={(trackId, name) => renameTrackAction(layer.key, trackId, name)}
          onMoveTrack={(trackId, dir) => moveTrack(layer.key, trackId, dir)}
          onToggleTrackLock={(trackId) => toggleTrackLock(layer.key, trackId)}
          onToggleTrackHidden={(trackId) => toggleTrackHidden(layer.key, trackId)}
          onDeleteBlock={(blockId) => deleteBlock(layer.key, blockId)}
          onCopyBlock={(blockId) => copyBlock(layer.key, blockId)}
          onSetBlockDuration={(blockId, dur) => setBlockDuration(layer.key, blockId, dur)}
          onSetBlockColor={(blockId, color) => setBlockColor(layer.key, blockId, color)}
          onMoveBlockToTrack={(blockId, trackId) => moveBlockToTrack(layer.key, blockId, trackId)}
          onAddWaitBlock={(blockId) => addWaitBlock(layer.key, blockId)}
          onAddGateBlock={(blockId) => addGateBlock(layer.key, blockId)}
          onSplitBlock={(blockId) => splitBlock(layer.key, blockId)}
          onUpdateBlockPosition={(blockId, start, trackId) => updateBlockPosition(layer.key, blockId, start, trackId)}
        />
      ))}

      {/* Duration input modal */}
      {durationInput && (
        <TimelineInputDialog
          type="number"
          label="Süre (saniye)"
          value={durationInput.value}
          min={0.1}
          step={0.5}
          onConfirm={(v) => {
            const dur = parseFloat(v);
            if (!isNaN(dur) && dur > 0) {
              setBlockDuration(durationInput.layerKey, durationInput.blockId, dur);
            }
            setDurationInput(null);
          }}
          onCancel={() => setDurationInput(null)}
        />
      )}

      {/* Color input modal */}
      {colorInput && (
        <TimelineInputDialog
          type="color"
          label="Renk"
          value={colorInput.value}
          onConfirm={(v) => {
            setBlockColor(colorInput.layerKey, colorInput.blockId, v);
            setColorInput(null);
          }}
          onCancel={() => setColorInput(null)}
        />
      )}

      {/* Rename track modal */}
      {renameTrack && (
        <TimelineInputDialog
          type="text"
          label="Track Adı"
          value={renameTrack.value}
          onConfirm={(v) => {
            if (v.trim()) renameTrackAction(renameTrack.layerKey, renameTrack.trackId, v.trim());
            setRenameTrack(null);
          }}
          onCancel={() => setRenameTrack(null)}
        />
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TimelineLayer — one of GL / B / D
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface TimelineLayerProps {
  layer: LayerData;
  minimized: boolean;
  playhead: number;
  isPlaying: boolean;
  pxPerSec: number;
  selectedNodeId: string | null;
  activeGroupId: string | null;
  allNodes: AtlasNode[];
  onToggleMinimize: () => void;
  onPlayheadChange: (pos: number) => void;
  onTogglePlay: () => void;
  onSelectNode: (id: string, type: NodeType) => void;
  onAddTrack: () => void;
  onDeleteTrack: (trackId: string) => void;
  onRenameTrack: (trackId: string, name: string) => void;
  onMoveTrack: (trackId: string, direction: 'up' | 'down') => void;
  onToggleTrackLock: (trackId: string) => void;
  onToggleTrackHidden: (trackId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onCopyBlock: (blockId: string) => void;
  onSetBlockDuration: (blockId: string, dur: number) => void;
  onSetBlockColor: (blockId: string, color: string) => void;
  onMoveBlockToTrack: (blockId: string, trackId: string) => void;
  onAddWaitBlock: (afterBlockId: string) => void;
  onAddGateBlock: (afterBlockId: string) => void;
  onSplitBlock: (blockId: string) => void;
  onUpdateBlockPosition: (blockId: string, start: number, trackId?: string) => void;
}

function TimelineLayer({
  layer,
  minimized,
  playhead,
  isPlaying,
  pxPerSec,
  selectedNodeId,
  allNodes,
  onToggleMinimize,
  onPlayheadChange,
  onTogglePlay,
  onSelectNode,
  onAddTrack,
  onDeleteTrack,
  onRenameTrack,
  onMoveTrack,
  onToggleTrackLock,
  onToggleTrackHidden,
  onDeleteBlock,
  onCopyBlock,
  onSetBlockDuration,
  onSetBlockColor,
  onMoveBlockToTrack,
  onAddWaitBlock,
  onAddGateBlock,
  onSplitBlock,
  onUpdateBlockPosition,
}: TimelineLayerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const [durationInput, setDurationInput] = useState<{ blockId: string; value: string } | null>(null);
  const [colorInput, setColorInput] = useState<{ blockId: string; value: string } | null>(null);
  const [trackRename, setTrackRename] = useState<{ trackId: string; value: string } | null>(null);

  // Playhead scrubbing
  const [isScrubbing, setIsScrubbing] = useState(false);
  const scrubRef = useRef(false);

  const getTimeFromMouseX = useCallback(
    (clientX: number): number => {
      if (!scrollContainerRef.current) return 0;
      const rect = scrollContainerRef.current.getBoundingClientRect();
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const x = clientX - rect.left + scrollLeft - TRACK_HEADER_WIDTH;
      return Math.max(0, x / pxPerSec);
    },
    [pxPerSec],
  );

  const handleScrubStart = useCallback(
    (e: ReactMouseEvent) => {
      // Only scrub on ruler area or empty track area
      const time = getTimeFromMouseX(e.clientX);
      onPlayheadChange(time);
      setIsScrubbing(true);
      scrubRef.current = true;

      const onMove = (ev: globalThis.MouseEvent) => {
        if (!scrubRef.current) return;
        const t = getTimeFromMouseX(ev.clientX);
        onPlayheadChange(t);
      };
      const onUp = () => {
        scrubRef.current = false;
        setIsScrubbing(false);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [getTimeFromMouseX, onPlayheadChange],
  );

  // Close context menu on outside click
  useEffect(() => {
    const handler = () => {
      if (ctxMenu) setCtxMenu(null);
    };
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [ctxMenu]);

  // Compute total duration for the ruler
  const totalDuration = useMemo(() => {
    if (layer.blocks.length === 0) return 30;
    const maxEnd = Math.max(...layer.blocks.map((b) => b.start_s + b.duration_s));
    return Math.max(30, maxEnd + 10);
  }, [layer.blocks]);

  const totalWidth = totalDuration * pxPerSec;
  const tracksContentHeight = layer.tracks.length * TRACK_HEIGHT;

  /* ─── Minimized state ─── */
  if (minimized) {
    return (
      <div
        className="flex items-center border-b shrink-0 cursor-pointer group"
        style={{ borderColor: 'var(--editor-border-subtle)', background: 'var(--editor-toolbar-bg)' }}
        onClick={onToggleMinimize}
      >
        <div className="flex items-center gap-1.5 px-3 py-1 w-full">
          <ChevronRight size={10} className="text-[var(--editor-text-muted)] group-hover:text-[var(--editor-text)] transition-colors" />
          <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--editor-text-muted)' }}>
            {layer.label}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--editor-text-muted)', opacity: 0.6 }}>
            {layer.fullLabel}
          </span>
          <span className="text-[9px] ml-auto tabular-nums" style={{ color: 'var(--editor-text-muted)' }}>
            {layer.nodes.length} düğüm / {layer.tracks.length} track
          </span>
        </div>
      </div>
    );
  }

  /* ─── Expanded layer ─── */
  return (
    <div
      className="flex-1 flex flex-col border-b min-h-[60px] overflow-hidden"
      style={{ borderColor: 'var(--editor-border-subtle)' }}
    >
      {/* Layer Header Bar */}
      <div
        className="flex items-center gap-1 px-2 shrink-0"
        style={{
          height: 26,
          borderBottom: '1px solid var(--editor-border-subtle)',
          background: 'var(--editor-toolbar-bg)',
        }}
      >
        {/* Minimize toggle */}
        <button
          onClick={onToggleMinimize}
          className="flex items-center gap-1 hover:opacity-80 transition-opacity"
        >
          <ChevronDown size={10} style={{ color: 'var(--editor-text-muted)' }} />
          <span
            className="text-[10px] uppercase tracking-wider font-bold"
            style={{ color: 'var(--editor-text-secondary)' }}
          >
            {layer.label}
          </span>
        </button>

        <span className="text-[9px]" style={{ color: 'var(--editor-text-muted)' }}>
          {layer.fullLabel}
        </span>

        <span className="text-[9px] tabular-nums ml-1" style={{ color: 'var(--editor-text-muted)', opacity: 0.6 }}>
          ({layer.nodes.length})
        </span>

        <div className="flex-1" />

        {/* Add Channel button */}
        <button
          onClick={onAddTrack}
          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] transition-colors"
          style={{ color: 'var(--editor-text-muted)', background: 'transparent' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--editor-surface-hover)';
            e.currentTarget.style.color = 'var(--editor-text)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--editor-text-muted)';
          }}
          title="Kanal Ekle"
        >
          <Plus size={10} />
          <span>Kanal</span>
        </button>

        {/* Play/Pause */}
        <button
          onClick={onTogglePlay}
          className="w-5 h-5 flex items-center justify-center rounded transition-colors"
          style={{ color: isPlaying ? SELECTION_COLOR : 'var(--editor-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--editor-surface-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          title={isPlaying ? 'Duraklat' : 'Oynat'}
        >
          {isPlaying ? <Pause size={11} /> : <Play size={11} />}
        </button>

        {/* Playhead time display */}
        <span className="text-[9px] tabular-nums w-10 text-right" style={{ color: 'var(--editor-text-muted)' }}>
          {formatTime(playhead)}
        </span>
      </div>

      {/* Track body = header column + scrollable timeline */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto relative"
        style={{ cursor: isScrubbing ? 'ew-resize' : 'default' }}
      >
        <div className="flex min-h-full" style={{ width: TRACK_HEADER_WIDTH + totalWidth }}>
          {/* Track headers (fixed column) */}
          <div
            className="shrink-0 flex flex-col sticky left-0 z-20"
            style={{
              width: TRACK_HEADER_WIDTH,
              background: 'var(--editor-panel-bg)',
              borderRight: '1px solid var(--editor-border)',
            }}
          >
            {/* Ruler header cell */}
            <div
              style={{
                height: RULER_HEIGHT,
                borderBottom: '1px solid var(--editor-border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="text-[8px] uppercase tracking-widest" style={{ color: 'var(--editor-text-muted)', opacity: 0.5 }}>
                Kanallar
              </span>
            </div>

            {/* Track headers */}
            {layer.tracks.map((track) => (
              <TrackHeader
                key={track.id}
                track={track}
                tracks={layer.tracks}
                layerKey={layer.key}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCtxMenu({ x: e.clientX, y: e.clientY, type: 'track', trackId: track.id, layerKey: layer.key });
                }}
                onToggleLock={() => onToggleTrackLock(track.id)}
                onToggleHidden={() => onToggleTrackHidden(track.id)}
              />
            ))}
          </div>

          {/* Timeline content area */}
          <div className="flex-1 relative" style={{ width: totalWidth }}>
            {/* Time ruler */}
            <div
              className="sticky top-0 z-10"
              style={{
                height: RULER_HEIGHT,
                borderBottom: '1px solid var(--editor-border-subtle)',
                background: 'var(--editor-toolbar-bg)',
                cursor: 'crosshair',
              }}
              onMouseDown={handleScrubStart}
            >
              <TimeRuler totalDuration={totalDuration} pxPerSec={pxPerSec} />
            </div>

            {/* Track rows */}
            {layer.tracks.map((track, trackIdx) => (
              <TrackRow
                key={track.id}
                track={track}
                trackIdx={trackIdx}
                blocks={layer.blocks.filter((b) => b.track_id === track.id)}
                allBlocks={layer.blocks}
                allTracks={layer.tracks}
                layerKey={layer.key}
                nodes={layer.nodes}
                allNodes={allNodes}
                pxPerSec={pxPerSec}
                selectedNodeId={selectedNodeId}
                onSelectNode={onSelectNode}
                onContextMenuBlock={(e, blockId) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCtxMenu({ x: e.clientX, y: e.clientY, type: 'block', blockId, layerKey: layer.key });
                }}
                onScrubStart={handleScrubStart}
                onUpdateBlockPosition={onUpdateBlockPosition}
                onSetBlockDuration={onSetBlockDuration}
              />
            ))}

            {/* Playhead line (spans full height) */}
            <div
              className="absolute top-0 pointer-events-none z-30"
              style={{
                left: playhead * pxPerSec,
                height: RULER_HEIGHT + tracksContentHeight,
                width: 0,
              }}
            >
              {/* Head triangle */}
              <div
                style={{
                  width: 10,
                  height: 10,
                  marginLeft: -5,
                  background: SELECTION_COLOR,
                  clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                }}
              />
              {/* Line */}
              <div
                style={{
                  width: 1,
                  height: '100%',
                  marginLeft: 0,
                  background: SELECTION_COLOR,
                  opacity: 0.9,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Context Menus ─── */}

      {/* Block context menu */}
      {ctxMenu?.type === 'block' && ctxMenu.blockId && (
        <ContextMenuOverlay x={ctxMenu.x} y={ctxMenu.y} onClose={() => setCtxMenu(null)}>
          <CtxItem
            icon={<Trash2 size={12} />}
            label="Sil"
            danger
            onClick={() => { onDeleteBlock(ctxMenu.blockId!); setCtxMenu(null); }}
          />
          <CtxItem
            icon={<Copy size={12} />}
            label="Kopyala"
            onClick={() => { onCopyBlock(ctxMenu.blockId!); setCtxMenu(null); }}
          />
          <CtxDivider />
          <CtxItem
            icon={<Clock size={12} />}
            label="Süre Değiştir"
            onClick={() => {
              const block = layer.blocks.find((b) => b.id === ctxMenu.blockId);
              setDurationInput({ blockId: ctxMenu.blockId!, value: String(block?.duration_s ?? DEFAULT_BLOCK_DURATION_S) });
              setCtxMenu(null);
            }}
          />
          <CtxItem
            icon={<Palette size={12} />}
            label="Renk Değiştir"
            onClick={() => {
              const block = layer.blocks.find((b) => b.id === ctxMenu.blockId);
              const node = layer.nodes.find((n) => n.id === block?.node_id) || allNodes.find((n) => n.id === block?.node_id);
              const defaultColor = node ? (NODE_TYPE_CONFIG[node.type as NodeType]?.color || '#64748b') : '#64748b';
              setColorInput({ blockId: ctxMenu.blockId!, value: block?.color || defaultColor });
              setCtxMenu(null);
            }}
          />
          <CtxDivider />
          <CtxItem
            icon={<Pause size={12} />}
            label="Bekleme bloğu ekle"
            onClick={() => { onAddWaitBlock(ctxMenu.blockId!); setCtxMenu(null); }}
          />
          <CtxItem
            icon={<DoorOpen size={12} />}
            label="Kapı ekle"
            onClick={() => { onAddGateBlock(ctxMenu.blockId!); setCtxMenu(null); }}
          />
          <CtxItem
            icon={<SplitSquareHorizontal size={12} />}
            label="Bölme noktası ekle"
            onClick={() => { onSplitBlock(ctxMenu.blockId!); setCtxMenu(null); }}
          />
          <CtxDivider />
          {/* Track submenu */}
          <CtxSubmenu
            icon={<ArrowUpDown size={12} />}
            label="Track'e taşı"
          >
            {layer.tracks.map((t) => (
              <CtxItem
                key={t.id}
                label={t.name}
                onClick={() => { onMoveBlockToTrack(ctxMenu.blockId!, t.id); setCtxMenu(null); }}
              />
            ))}
          </CtxSubmenu>
        </ContextMenuOverlay>
      )}

      {/* Track header context menu */}
      {ctxMenu?.type === 'track' && ctxMenu.trackId && (
        <ContextMenuOverlay x={ctxMenu.x} y={ctxMenu.y} onClose={() => setCtxMenu(null)}>
          <CtxItem
            icon={<Pencil size={12} />}
            label="Track'i Yeniden Adlandır"
            onClick={() => {
              const track = layer.tracks.find((t) => t.id === ctxMenu.trackId);
              setTrackRename({ trackId: ctxMenu.trackId!, value: track?.name || '' });
              setCtxMenu(null);
            }}
          />
          <CtxItem
            icon={<Trash2 size={12} />}
            label="Track'i Sil"
            danger
            disabled={layer.tracks.length <= 1}
            onClick={() => {
              if (layer.tracks.length > 1) {
                onDeleteTrack(ctxMenu.trackId!);
              }
              setCtxMenu(null);
            }}
          />
          <CtxDivider />
          <CtxItem
            icon={<ArrowUp size={12} />}
            label="Track'i Yukarı Taşı"
            onClick={() => { onMoveTrack(ctxMenu.trackId!, 'up'); setCtxMenu(null); }}
          />
          <CtxItem
            icon={<ArrowDown size={12} />}
            label="Track'i Aşağı Taşı"
            onClick={() => { onMoveTrack(ctxMenu.trackId!, 'down'); setCtxMenu(null); }}
          />
          <CtxDivider />
          <CtxItem
            icon={<Lock size={12} />}
            label="Track'i Kilitle"
            onClick={() => { onToggleTrackLock(ctxMenu.trackId!); setCtxMenu(null); }}
          />
          <CtxItem
            icon={<EyeOff size={12} />}
            label="Track'i Gizle"
            onClick={() => { onToggleTrackHidden(ctxMenu.trackId!); setCtxMenu(null); }}
          />
        </ContextMenuOverlay>
      )}

      {/* Duration input inline dialog */}
      {durationInput && (
        <TimelineInputDialog
          type="number"
          label="Süre (saniye)"
          value={durationInput.value}
          min={0.1}
          step={0.5}
          onConfirm={(v) => {
            const dur = parseFloat(v);
            if (!isNaN(dur) && dur > 0) onSetBlockDuration(durationInput.blockId, dur);
            setDurationInput(null);
          }}
          onCancel={() => setDurationInput(null)}
        />
      )}

      {/* Color input inline dialog */}
      {colorInput && (
        <TimelineInputDialog
          type="color"
          label="Renk"
          value={colorInput.value}
          onConfirm={(v) => {
            onSetBlockColor(colorInput.blockId, v);
            setColorInput(null);
          }}
          onCancel={() => setColorInput(null)}
        />
      )}

      {/* Track rename inline dialog */}
      {trackRename && (
        <TimelineInputDialog
          type="text"
          label="Track Adı"
          value={trackRename.value}
          onConfirm={(v) => {
            if (v.trim()) onRenameTrack(trackRename.trackId, v.trim());
            setTrackRename(null);
          }}
          onCancel={() => setTrackRename(null)}
        />
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TrackHeader — left column cell for one track
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface TrackHeaderProps {
  track: TrackState;
  tracks: TrackState[];
  layerKey: LayerKey;
  onContextMenu: (e: ReactMouseEvent) => void;
  onToggleLock: () => void;
  onToggleHidden: () => void;
}

function TrackHeader({ track, onContextMenu, onToggleLock, onToggleHidden }: TrackHeaderProps) {
  return (
    <div
      className="flex items-center gap-1 px-1.5 group"
      style={{
        height: TRACK_HEIGHT,
        borderBottom: '1px solid var(--editor-border-subtle)',
        opacity: track.hidden ? 0.4 : 1,
      }}
      onContextMenu={onContextMenu}
    >
      {/* Grip handle */}
      <GripVertical
        size={10}
        className="shrink-0 opacity-0 group-hover:opacity-40 transition-opacity cursor-grab"
        style={{ color: 'var(--editor-text-muted)' }}
      />

      {/* Track name */}
      <span
        className="text-[10px] font-medium truncate flex-1 min-w-0"
        style={{ color: track.hidden ? 'var(--editor-text-muted)' : 'var(--editor-text-secondary)' }}
        title={track.name}
      >
        {track.name}
      </span>

      {/* Status icons */}
      {track.locked && (
        <span title="Kilitli">
          <Lock
            size={9}
            className="shrink-0 cursor-pointer"
            style={{ color: SELECTION_COLOR, opacity: 0.8 }}
            onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
          />
        </span>
      )}
      {track.hidden && (
        <span title="Gizli">
          <EyeOff
            size={9}
            className="shrink-0 cursor-pointer"
            style={{ color: 'var(--editor-text-muted)', opacity: 0.6 }}
            onClick={(e) => { e.stopPropagation(); onToggleHidden(); }}
          />
        </span>
      )}

      {/* More menu button */}
      <button
        onClick={onContextMenu}
        className="w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
        style={{ color: 'var(--editor-text-muted)' }}
      >
        <MoreHorizontal size={10} />
      </button>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TrackRow — one horizontal track with its blocks
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface TrackRowProps {
  track: TrackState;
  trackIdx: number;
  blocks: BlockState[];
  allBlocks: BlockState[];
  allTracks: TrackState[];
  layerKey: LayerKey;
  nodes: AtlasNode[];
  allNodes: AtlasNode[];
  pxPerSec: number;
  selectedNodeId: string | null;
  onSelectNode: (id: string, type: NodeType) => void;
  onContextMenuBlock: (e: ReactMouseEvent, blockId: string) => void;
  onScrubStart: (e: ReactMouseEvent) => void;
  onUpdateBlockPosition: (blockId: string, start: number, trackId?: string) => void;
  onSetBlockDuration: (blockId: string, dur: number) => void;
}

function TrackRow({
  track,
  trackIdx,
  blocks,
  allTracks,
  nodes,
  allNodes,
  pxPerSec,
  selectedNodeId,
  onSelectNode,
  onContextMenuBlock,
  onScrubStart,
  onUpdateBlockPosition,
  onSetBlockDuration,
}: TrackRowProps) {
  return (
    <div
      className="relative"
      style={{
        height: TRACK_HEIGHT,
        borderBottom: '1px solid var(--editor-border-subtle)',
        opacity: track.hidden ? 0.25 : 1,
      }}
      onMouseDown={(e) => {
        // Click on empty area = scrub playhead
        if (e.target === e.currentTarget) {
          onScrubStart(e);
        }
      }}
    >
      {/* Track background alternation */}
      {trackIdx % 2 === 1 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'var(--editor-surface)', opacity: 0.3 }}
        />
      )}

      {/* Blocks */}
      {!track.hidden && blocks.map((block) => (
        <TimelineBlock
          key={block.id}
          block={block}
          track={track}
          allTracks={allTracks}
          nodes={nodes}
          allNodes={allNodes}
          pxPerSec={pxPerSec}
          isSelected={selectedNodeId === block.node_id}
          onSelect={() => {
            const node = nodes.find((n) => n.id === block.node_id) || allNodes.find((n) => n.id === block.node_id);
            if (node) onSelectNode(node.id, node.type as NodeType);
          }}
          onContextMenu={(e) => onContextMenuBlock(e, block.id)}
          onUpdatePosition={(start, trackId) => onUpdateBlockPosition(block.id, start, trackId)}
          onResizeDuration={(dur) => onSetBlockDuration(block.id, dur)}
          isLocked={track.locked}
        />
      ))}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TimelineBlock — draggable, resizable block
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

interface TimelineBlockProps {
  block: BlockState;
  track: TrackState;
  allTracks: TrackState[];
  nodes: AtlasNode[];
  allNodes: AtlasNode[];
  pxPerSec: number;
  isSelected: boolean;
  onSelect: () => void;
  onContextMenu: (e: ReactMouseEvent) => void;
  onUpdatePosition: (start: number, trackId?: string) => void;
  onResizeDuration: (dur: number) => void;
  isLocked: boolean;
}

function TimelineBlock(props: TimelineBlockProps) {
  const {
    block,
    allTracks,
    nodes,
    allNodes,
    pxPerSec,
    isSelected,
    onSelect,
    onContextMenu,
    onUpdatePosition,
    onResizeDuration,
    isLocked,
  } = props;
  const blockRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  // Resolve node info
  const node = nodes.find((n) => n.id === block.node_id) || allNodes.find((n) => n.id === block.node_id);
  const isSpecial = block.node_id === '__wait__' || block.node_id === '__gate__';
  const isWaypoint = block.node_id.startsWith(WAYPOINT_BLOCK_PREFIX);
  const config = node ? NODE_TYPE_CONFIG[node.type as NodeType] : null;
  const Icon = config ? ICON_MAP[config.icon] : null;
  const blockColor = block.color || config?.color || '#64748b';

  // Resolve waypoint label from route node
  let blockLabel: string;
  if (isWaypoint) {
    const wpId = block.node_id.replace(WAYPOINT_BLOCK_PREFIX, '');
    // Find the route node in allNodes that has this waypoint
    let wpLabel = 'Konalga';
    for (const n of allNodes) {
      if (n.type === 'route') {
        const rProps = n.properties as unknown as RouteProperties;
        const wp = rProps.waypoints?.find((w: RouteWaypoint) => w.id === wpId);
        if (wp) { wpLabel = wp.label || 'Konalga'; break; }
      }
    }
    blockLabel = wpLabel;
  } else if (isSpecial) {
    blockLabel = block.node_id === '__wait__' ? 'Bekle' : 'Kapı';
  } else {
    blockLabel = node?.label || config?.label || 'Bilinmiyor';
  }

  const left = block.start_s * pxPerSec;
  const width = Math.max(block.duration_s * pxPerSec, 20);

  /* ─── Drag to reposition ─── */
  const handleDragStart = useCallback(
    (e: ReactMouseEvent) => {
      if (isLocked) return;
      e.stopPropagation();
      e.preventDefault();
      onSelect();

      const startX = e.clientX;
      const startY = e.clientY;
      const startLeft = block.start_s;
      setIsDragging(true);

      const onMove = (ev: globalThis.MouseEvent) => {
        const dx = ev.clientX - startX;
        const newStart = Math.max(0, startLeft + dx / pxPerSec);

        // Check vertical movement for track switching
        const dy = ev.clientY - startY;
        const trackDelta = Math.round(dy / TRACK_HEIGHT);

        if (trackDelta !== 0 && allTracks.length > 1) {
          const currentTrackIdx = allTracks.findIndex((t) => t.id === block.track_id);
          const newTrackIdx = Math.max(0, Math.min(allTracks.length - 1, currentTrackIdx + trackDelta));
          if (newTrackIdx !== currentTrackIdx) {
            onUpdatePosition(newStart, allTracks[newTrackIdx].id);
            return;
          }
        }

        onUpdatePosition(newStart);
      };

      const onUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [block.start_s, block.track_id, pxPerSec, onUpdatePosition, onSelect, isLocked, allTracks],
  );

  /* ─── Resize left edge ─── */
  const handleResizeLeft = useCallback(
    (e: ReactMouseEvent) => {
      if (isLocked) return;
      e.stopPropagation();
      e.preventDefault();

      const startX = e.clientX;
      const origStart = block.start_s;
      const origDur = block.duration_s;
      setIsResizingLeft(true);

      const onMove = (ev: globalThis.MouseEvent) => {
        const dx = ev.clientX - startX;
        const shift = dx / pxPerSec;
        const newStart = Math.max(0, origStart + shift);
        const newDur = Math.max(MIN_BLOCK_DURATION, origDur - (newStart - origStart));
        onUpdatePosition(newStart);
        onResizeDuration(newDur);
      };

      const onUp = () => {
        setIsResizingLeft(false);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [block.start_s, block.duration_s, pxPerSec, onUpdatePosition, onResizeDuration, isLocked],
  );

  /* ─── Resize right edge ─── */
  const handleResizeRight = useCallback(
    (e: ReactMouseEvent) => {
      if (isLocked) return;
      e.stopPropagation();
      e.preventDefault();

      const startX = e.clientX;
      const origDur = block.duration_s;
      setIsResizingRight(true);

      const onMove = (ev: globalThis.MouseEvent) => {
        const dx = ev.clientX - startX;
        const newDur = Math.max(MIN_BLOCK_DURATION, origDur + dx / pxPerSec);
        onResizeDuration(newDur);
      };

      const onUp = () => {
        setIsResizingRight(false);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [block.duration_s, pxPerSec, onResizeDuration, isLocked],
  );

  return (
    <div
      ref={blockRef}
      className="absolute flex items-center overflow-hidden"
      style={{
        left,
        width,
        top: 3,
        height: TRACK_HEIGHT - 6,
        borderRadius: 4,
        background: blockColor,
        cursor: isLocked ? 'default' : (isDragging ? 'grabbing' : 'grab'),
        boxShadow: isSelected
          ? `0 0 0 2px ${SELECTION_COLOR}, 0 1px 3px rgba(0,0,0,0.3)`
          : '0 1px 2px rgba(0,0,0,0.2)',
        transition: isDragging || isResizingLeft || isResizingRight ? 'none' : 'box-shadow 0.15s ease',
        zIndex: isDragging ? 50 : (isSelected ? 10 : 1),
        opacity: isDragging ? 0.85 : 1,
        userSelect: 'none',
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onContextMenu={onContextMenu}
      onMouseDown={handleDragStart}
      title={`${blockLabel} - ${block.duration_s.toFixed(1)}s`}
    >
      {/* Left resize handle */}
      {!isLocked && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[5px] cursor-ew-resize z-10"
          style={{ background: 'transparent' }}
          onMouseDown={handleResizeLeft}
        >
          <div
            className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full opacity-0 hover:opacity-60 transition-opacity"
            style={{ background: 'rgba(255,255,255,0.7)' }}
          />
        </div>
      )}

      {/* Block content */}
      <div className="flex items-center gap-1 px-1.5 min-w-0 flex-1 pointer-events-none">
        {isWaypoint ? (
          <MapPin size={10} className="shrink-0 text-white/90" />
        ) : isSpecial ? (
          block.node_id === '__wait__' ? (
            <Pause size={10} className="shrink-0 text-white/80" />
          ) : (
            <DoorOpen size={10} className="shrink-0 text-white/80" />
          )
        ) : (
          Icon && <Icon size={10} className="shrink-0 text-white/90" />
        )}
        <span className="text-[9px] font-medium text-white truncate leading-none">
          {blockLabel}
        </span>
        {width > 60 && (
          <span className="text-[8px] text-white/50 ml-auto shrink-0 tabular-nums">
            {block.duration_s.toFixed(1)}s
          </span>
        )}
      </div>

      {/* Right resize handle */}
      {!isLocked && (
        <div
          className="absolute right-0 top-0 bottom-0 w-[5px] cursor-ew-resize z-10"
          style={{ background: 'transparent' }}
          onMouseDown={handleResizeRight}
        >
          <div
            className="absolute right-0 top-1 bottom-1 w-[2px] rounded-full opacity-0 hover:opacity-60 transition-opacity"
            style={{ background: 'rgba(255,255,255,0.7)' }}
          />
        </div>
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TimeRuler — tick marks every second
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function TimeRuler({ totalDuration, pxPerSec }: { totalDuration: number; pxPerSec: number }) {
  // Adaptive tick interval
  let interval = 1;
  if (pxPerSec < 20) interval = 5;
  else if (pxPerSec < 40) interval = 2;
  else if (pxPerSec > 200) interval = 0.5;

  const ticks: number[] = [];
  for (let t = 0; t <= totalDuration; t += interval) {
    ticks.push(t);
  }

  return (
    <div className="relative w-full h-full">
      {ticks.map((t) => {
        const isWhole = Number.isInteger(t);
        const isMajor = t % 5 === 0;
        return (
          <div
            key={t}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: t * pxPerSec }}
          >
            <div
              style={{
                width: 1,
                height: isMajor ? 10 : (isWhole ? 6 : 4),
                background: isMajor ? 'var(--editor-text-muted)' : 'var(--editor-border)',
                opacity: isMajor ? 0.5 : 0.4,
              }}
            />
            {isWhole && pxPerSec >= 15 && (
              <span
                className="text-[7px] tabular-nums mt-px select-none"
                style={{ color: 'var(--editor-text-muted)', opacity: isMajor ? 0.7 : 0.4 }}
              >
                {t}s
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Context Menu Components
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function ContextMenuOverlay({
  x, y, children, onClose,
}: {
  x: number; y: number; children: React.ReactNode; onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  // Adjust position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const adjustedX = (x + rect.width > window.innerWidth) ? window.innerWidth - rect.width - 8 : x;
      const adjustedY = (y + rect.height > window.innerHeight) ? window.innerHeight - rect.height - 8 : y;
      setPos({ x: adjustedX, y: adjustedY });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, y]);

  return (
    <div
      className="fixed inset-0 z-[9999]"
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      onContextMenu={(e) => { e.preventDefault(); onClose(); }}
    >
      <div
        ref={menuRef}
        className="absolute rounded-md py-1 shadow-xl"
        style={{
          left: pos.x,
          top: pos.y,
          background: 'var(--editor-surface)',
          border: '1px solid var(--editor-border)',
          minWidth: 180,
          maxWidth: 260,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function CtxItem({
  icon, label, onClick, danger, disabled,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] transition-colors disabled:opacity-30"
      style={{
        color: danger ? '#ef4444' : 'var(--editor-text)',
        background: 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = 'var(--editor-surface-hover)';
      }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      disabled={disabled}
    >
      {icon && <span className="w-4 flex items-center justify-center shrink-0 opacity-60">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

function CtxDivider() {
  return <div className="my-1 mx-2" style={{ height: 1, background: 'var(--editor-border-subtle)' }} />;
}

function CtxSubmenu({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] cursor-default transition-colors"
        style={{
          color: 'var(--editor-text)',
          background: open ? 'var(--editor-surface-hover)' : 'transparent',
        }}
      >
        {icon && <span className="w-4 flex items-center justify-center shrink-0 opacity-60">{icon}</span>}
        <span className="flex-1">{label}</span>
        <ChevronRight size={10} className="opacity-40" />
      </div>

      {open && (
        <div
          className="absolute left-full top-0 rounded-md py-1 shadow-xl z-10"
          style={{
            background: 'var(--editor-surface)',
            border: '1px solid var(--editor-border)',
            minWidth: 140,
            marginLeft: 2,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Helpers
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  if (m > 0) return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
  return `${s}.${ms}s`;
}
