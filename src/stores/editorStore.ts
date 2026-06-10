'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NodeType, AtlasNode, AtlasEdge, PinUpNote, TimelineTrack, TimelineBlock } from '@/lib/types/nodes';

export type EditorTheme = 'dark' | 'light';

interface TimelineLayerState {
  minimized: boolean;
  playheadPosition: number; // seconds
}

interface TimelineState {
  gl: TimelineLayerState;
  b: TimelineLayerState;
  d: TimelineLayerState;
  zoom: number;
  isPlaying: boolean;
}

interface EditorSnapshot {
  nodes: AtlasNode[];
  edges: AtlasEdge[];
  timestamp: number;
}

interface EditorState {
  // Theme
  theme: EditorTheme;
  toggleTheme: () => void;

  // Selected node in editor
  selectedNodeId: string | null;
  selectedNodeType: NodeType | null;
  selectedNodeIds: string[]; // multi-select

  // Graph state
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;

  // Group navigation (drill-in)
  activeGroupId: string | null;
  groupStack: string[];

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Canvas settings
  gridEnabled: boolean;
  snapToGrid: boolean;
  snapToNode: boolean;
  minimapVisible: boolean;

  // Clipboard
  clipboardNodes: AtlasNode[];
  clipboardEdges: AtlasEdge[];

  // Pin-up notes
  pinnedNotes: PinUpNote[];

  // Timeline
  timeline: TimelineState;

  // Timeline tracks & blocks (persisted)
  timelineTracks: Record<string, TimelineTrack[]>;
  timelineBlocks: Record<string, TimelineBlock[]>;

  // Undo/Redo
  undoStack: EditorSnapshot[];
  redoStack: EditorSnapshot[];

  // Right panel tab
  rightPanelTab: 'preview' | 'property' | 'validation';

  // Actions
  selectNode: (id: string | null, type?: NodeType | null) => void;
  selectMultiple: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  clearSelection: () => void;
  setDirty: (dirty: boolean) => void;
  setSaving: (saving: boolean) => void;
  setLastSaved: (timestamp: number) => void;
  drillIntoGroup: (groupId: string) => void;
  drillOut: () => void;
  drillToRoot: () => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  toggleSnapToNode: () => void;
  toggleMinimap: () => void;
  setClipboard: (nodes: AtlasNode[], edges: AtlasEdge[]) => void;
  addPinnedNote: (note: PinUpNote) => void;
  updatePinnedNote: (id: string, updates: Partial<PinUpNote>) => void;
  removePinnedNote: (id: string) => void;
  setTimelineLayerMinimized: (layer: 'gl' | 'b' | 'd', minimized: boolean) => void;
  setTimelinePlayhead: (layer: 'gl' | 'b' | 'd', position: number) => void;
  setTimelineZoom: (zoom: number) => void;
  setTimelinePlaying: (playing: boolean) => void;

  // Timeline tracks & blocks actions
  setTimelineTracks: (layerKey: string, tracks: TimelineTrack[]) => void;
  setTimelineBlocks: (layerKey: string, blocks: TimelineBlock[]) => void;
  addTimelineTrack: (layerKey: string, track: TimelineTrack) => void;
  removeTimelineTrack: (layerKey: string, trackId: string) => void;
  updateTimelineTrack: (layerKey: string, trackId: string, changes: Partial<TimelineTrack>) => void;
  updateTimelineBlock: (layerKey: string, blockId: string, changes: Partial<TimelineBlock>) => void;
  addTimelineBlock: (layerKey: string, block: TimelineBlock) => void;
  removeTimelineBlock: (layerKey: string, blockId: string) => void;

  pushUndo: (snapshot: EditorSnapshot) => void;
  undo: (currentState: EditorSnapshot) => EditorSnapshot | null;
  redo: (currentState: EditorSnapshot) => EditorSnapshot | null;
  setRightPanelTab: (tab: 'preview' | 'property' | 'validation') => void;
}

const MAX_UNDO_STACK = 50;

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
  // Theme
  theme: 'dark',
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  // Selection
  selectedNodeId: null,
  selectedNodeType: null,
  selectedNodeIds: [],

  // Graph
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,

  // Drill-in
  activeGroupId: null,
  groupStack: [],

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Canvas
  gridEnabled: true,
  snapToGrid: true,
  snapToNode: true,
  minimapVisible: true,

  // Clipboard
  clipboardNodes: [],
  clipboardEdges: [],

  // Notes
  pinnedNotes: [],

  // Timeline
  timeline: {
    gl: { minimized: false, playheadPosition: 0 },
    b: { minimized: false, playheadPosition: 0 },
    d: { minimized: false, playheadPosition: 0 },
    zoom: 1,
    isPlaying: false,
  },

  // Timeline tracks & blocks (persisted)
  timelineTracks: {
    gl: [{ id: 'trk_default_gl', name: 'Track 1', locked: false, hidden: false }],
    b: [{ id: 'trk_default_b', name: 'Track 1', locked: false, hidden: false }],
    d: [{ id: 'trk_default_d', name: 'Track 1', locked: false, hidden: false }],
  },
  timelineBlocks: {
    gl: [],
    b: [],
    d: [],
  },

  // Undo/Redo
  undoStack: [],
  redoStack: [],

  // Right panel
  rightPanelTab: 'property',

  // Actions
  selectNode: (id, type = null) =>
    set({
      selectedNodeId: id,
      selectedNodeType: type,
      selectedNodeIds: id ? [id] : [],
    }),

  selectMultiple: (ids) =>
    set({
      selectedNodeIds: ids,
      selectedNodeId: ids.length > 0 ? ids[ids.length - 1] : null,
      selectedNodeType: null,
    }),

  addToSelection: (id) =>
    set((state) => {
      const ids = state.selectedNodeIds.includes(id)
        ? state.selectedNodeIds.filter((i) => i !== id)
        : [...state.selectedNodeIds, id];
      return {
        selectedNodeIds: ids,
        selectedNodeId: ids.length > 0 ? ids[ids.length - 1] : null,
      };
    }),

  clearSelection: () =>
    set({
      selectedNodeId: null,
      selectedNodeType: null,
      selectedNodeIds: [],
    }),

  setDirty: (dirty) => set({ isDirty: dirty }),
  setSaving: (saving) => set({ isSaving: saving }),
  setLastSaved: (timestamp) => set({ lastSavedAt: timestamp, isDirty: false }),

  drillIntoGroup: (groupId) =>
    set((state) => ({
      activeGroupId: groupId,
      groupStack: [...state.groupStack, groupId],
      selectedNodeId: null,
      selectedNodeType: null,
      selectedNodeIds: [],
    })),

  drillOut: () =>
    set((state) => {
      const newStack = state.groupStack.slice(0, -1);
      return {
        groupStack: newStack,
        activeGroupId: newStack.length > 0 ? newStack[newStack.length - 1] : null,
        selectedNodeId: null,
        selectedNodeType: null,
        selectedNodeIds: [],
      };
    }),

  drillToRoot: () =>
    set({
      activeGroupId: null,
      groupStack: [],
      selectedNodeId: null,
      selectedNodeType: null,
      selectedNodeIds: [],
    }),

  toggleGrid: () => set((s) => ({ gridEnabled: !s.gridEnabled })),
  toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
  toggleSnapToNode: () => set((s) => ({ snapToNode: !s.snapToNode })),
  toggleMinimap: () => set((s) => ({ minimapVisible: !s.minimapVisible })),

  setClipboard: (nodes, edges) =>
    set({ clipboardNodes: nodes, clipboardEdges: edges }),

  addPinnedNote: (note) =>
    set((s) => ({ pinnedNotes: [...s.pinnedNotes, note] })),
  updatePinnedNote: (id, updates) =>
    set((s) => ({
      pinnedNotes: s.pinnedNotes.map((n) =>
        n.id === id ? { ...n, ...updates } : n
      ),
    })),
  removePinnedNote: (id) =>
    set((s) => ({ pinnedNotes: s.pinnedNotes.filter((n) => n.id !== id) })),

  setTimelineLayerMinimized: (layer, minimized) =>
    set((s) => ({
      timeline: {
        ...s.timeline,
        [layer]: { ...s.timeline[layer], minimized },
      },
    })),
  setTimelinePlayhead: (layer, position) =>
    set((s) => ({
      timeline: {
        ...s.timeline,
        [layer]: { ...s.timeline[layer], playheadPosition: position },
      },
    })),
  setTimelineZoom: (zoom) =>
    set((s) => ({ timeline: { ...s.timeline, zoom } })),
  setTimelinePlaying: (playing) =>
    set((s) => ({ timeline: { ...s.timeline, isPlaying: playing } })),

  // Timeline tracks & blocks actions
  setTimelineTracks: (layerKey, tracks) =>
    set((s) => ({ timelineTracks: { ...s.timelineTracks, [layerKey]: tracks } })),

  setTimelineBlocks: (layerKey, blocks) =>
    set((s) => ({ timelineBlocks: { ...s.timelineBlocks, [layerKey]: blocks } })),

  addTimelineTrack: (layerKey, track) =>
    set((s) => ({
      timelineTracks: {
        ...s.timelineTracks,
        [layerKey]: [...(s.timelineTracks[layerKey] || []), track],
      },
    })),

  removeTimelineTrack: (layerKey, trackId) =>
    set((s) => {
      const tracks = s.timelineTracks[layerKey] || [];
      if (tracks.length <= 1) return s; // can't delete last track
      const remaining = tracks.filter((t) => t.id !== trackId);
      const fallbackId = remaining[0].id;
      // Move blocks on deleted track to fallback
      const updatedBlocks = (s.timelineBlocks[layerKey] || []).map((b) =>
        b.track_id === trackId ? { ...b, track_id: fallbackId } : b,
      );
      return {
        timelineTracks: { ...s.timelineTracks, [layerKey]: remaining },
        timelineBlocks: { ...s.timelineBlocks, [layerKey]: updatedBlocks },
      };
    }),

  updateTimelineTrack: (layerKey, trackId, changes) =>
    set((s) => ({
      timelineTracks: {
        ...s.timelineTracks,
        [layerKey]: (s.timelineTracks[layerKey] || []).map((t) =>
          t.id === trackId ? { ...t, ...changes } : t,
        ),
      },
    })),

  updateTimelineBlock: (layerKey, blockId, changes) =>
    set((s) => ({
      timelineBlocks: {
        ...s.timelineBlocks,
        [layerKey]: (s.timelineBlocks[layerKey] || []).map((b) =>
          b.id === blockId ? { ...b, ...changes } : b,
        ),
      },
    })),

  addTimelineBlock: (layerKey, block) =>
    set((s) => ({
      timelineBlocks: {
        ...s.timelineBlocks,
        [layerKey]: [...(s.timelineBlocks[layerKey] || []), block],
      },
    })),

  removeTimelineBlock: (layerKey, blockId) =>
    set((s) => ({
      timelineBlocks: {
        ...s.timelineBlocks,
        [layerKey]: (s.timelineBlocks[layerKey] || []).filter((b) => b.id !== blockId),
      },
    })),

  pushUndo: (snapshot) =>
    set((s) => ({
      undoStack: [...s.undoStack.slice(-MAX_UNDO_STACK + 1), snapshot],
      redoStack: [],
    })),

  undo: (currentState) => {
    const state = get();
    if (state.undoStack.length === 0) return null;
    const snapshot = state.undoStack[state.undoStack.length - 1];
    set({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, currentState],
    });
    return snapshot;
  },

  redo: (currentState) => {
    const state = get();
    if (state.redoStack.length === 0) return null;
    const snapshot = state.redoStack[state.redoStack.length - 1];
    set({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, currentState],
    });
    return snapshot;
  },

  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
    }),
    {
      name: 'sarikecili-editor',
      partialize: (state) => ({
        timelineTracks: state.timelineTracks,
        timelineBlocks: state.timelineBlocks,
      }),
    },
  ),
);
