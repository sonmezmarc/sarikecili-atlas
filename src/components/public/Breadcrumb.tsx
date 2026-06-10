'use client';

import { useSceneStore } from '@/stores/sceneStore';

export default function Breadcrumb() {
  const { navigationStack, goToRoot, goToStackIndex } = useSceneStore();

  if (navigationStack.length === 0) return null;

  return (
    <div className="fixed top-4 left-[276px] z-30 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-md text-sm">
      <button
        onClick={goToRoot}
        className="text-stone-500 hover:text-stone-800 transition-colors"
      >
        Harita
      </button>
      {navigationStack.map((entry, index) => (
        <span key={`${entry.nodeId}-${index}`} className="flex items-center gap-1">
          <span className="text-stone-300">/</span>
          <button
            onClick={() => goToStackIndex(index)}
            className={`transition-colors ${
              index === navigationStack.length - 1
                ? 'text-stone-800 font-medium'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {entry.label}
          </button>
        </span>
      ))}
    </div>
  );
}
