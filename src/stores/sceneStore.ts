import { create } from 'zustand';

interface NavigationEntry {
  nodeId: string;
  label: string;
}

interface SceneState {
  // Active scene
  activeSceneId: string | null;

  // Navigation stack (breadcrumb)
  navigationStack: NavigationEntry[];

  // Right panel
  rightPanelOpen: boolean;
  rightPanelWidth: number;

  // Discover overlay
  discoverOpen: boolean;

  // Splash screen
  splashDone: boolean;

  // Actions
  openScene: (nodeId: string, label: string) => void;
  goBack: () => void;
  goToRoot: () => void;
  goToStackIndex: (index: number) => void;
  setRightPanelOpen: (open: boolean) => void;
  setRightPanelWidth: (width: number) => void;
  setDiscoverOpen: (open: boolean) => void;
  setSplashDone: (done: boolean) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  activeSceneId: null,
  navigationStack: [],
  rightPanelOpen: false,
  rightPanelWidth: 400,
  discoverOpen: false,
  splashDone: false,

  openScene: (nodeId, label) =>
    set((state) => ({
      activeSceneId: nodeId,
      navigationStack: [...state.navigationStack, { nodeId, label }],
      rightPanelOpen: true,
    })),

  goBack: () =>
    set((state) => {
      const newStack = state.navigationStack.slice(0, -1);
      const previous = newStack.length > 0 ? newStack[newStack.length - 1] : null;
      return {
        navigationStack: newStack,
        activeSceneId: previous?.nodeId ?? null,
        rightPanelOpen: previous !== null,
      };
    }),

  goToRoot: () =>
    set({
      navigationStack: [],
      activeSceneId: null,
      rightPanelOpen: false,
    }),

  goToStackIndex: (index) =>
    set((state) => {
      const newStack = state.navigationStack.slice(0, index + 1);
      const target = newStack[newStack.length - 1];
      return {
        navigationStack: newStack,
        activeSceneId: target?.nodeId ?? null,
        rightPanelOpen: target !== undefined,
      };
    }),

  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: width }),
  setDiscoverOpen: (open) => set({ discoverOpen: open }),
  setSplashDone: (done) => set({ splashDone: done }),
}));
