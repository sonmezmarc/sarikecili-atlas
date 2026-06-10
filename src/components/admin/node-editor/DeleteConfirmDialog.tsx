'use client';

import { useEffect, useCallback, useRef } from 'react';
import type { AtlasNode } from '@/lib/types/nodes';
import { NODE_TYPE_CONFIG } from '@/lib/constants';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
  node: AtlasNode;
  childCount: number;
  childNodes: AtlasNode[]; // first few children for display
  onDeleteWithChildren: () => void;
  onDeleteOnly: () => void;
  onCancel: () => void;
}

const MAX_VISIBLE_CHILDREN = 5;

export default function DeleteConfirmDialog({
  node,
  childCount,
  childNodes,
  onDeleteWithChildren,
  onDeleteOnly,
  onCancel,
}: DeleteConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // ESC key closes the dialog
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    },
    [onCancel],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Click outside closes
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) {
        onCancel();
      }
    },
    [onCancel],
  );

  const nodeConfig = NODE_TYPE_CONFIG[node.type];
  const remaining = childCount - MAX_VISIBLE_CHILDREN;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
    >
      <div className="w-full max-w-md mx-4 rounded-xl border border-[#2a2a3a] bg-[#1a1a2e] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-[#e4e4f0]">
                Sil{' '}
                <span
                  className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-sm font-medium"
                  style={{
                    backgroundColor: `${nodeConfig.color}20`,
                    color: nodeConfig.color,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: nodeConfig.color }}
                  />
                  {node.label}
                </span>
                ?
              </h3>

              {childCount > 0 && (
                <p className="mt-1.5 text-sm text-[#9090a8]">
                  Bu düğümün{' '}
                  <span className="font-medium text-[#c4c4d8]">{childCount}</span>{' '}
                  alt düğümü var
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Affected children list */}
        {childCount > 0 && (
          <div className="mx-5 mb-4">
            <div className="rounded-lg border border-[#2a2a3a] bg-[#12121e] overflow-hidden">
              <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-[#6a6a82] border-b border-[#2a2a3a]">
                Etkilenen Düğümler
              </div>
              <ul className="py-1">
                {childNodes.slice(0, MAX_VISIBLE_CHILDREN).map((child) => {
                  const childConfig = NODE_TYPE_CONFIG[child.type];
                  return (
                    <li
                      key={child.id}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm"
                    >
                      <span
                        className="w-2 h-2 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: childConfig.color }}
                      />
                      <span className="text-[#b0b0c8] truncate">{child.label}</span>
                      <span className="ml-auto text-[10px] text-[#6a6a82]">
                        {childConfig.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {remaining > 0 && (
                <div className="px-3 py-1.5 text-xs text-[#6a6a82] border-t border-[#2a2a3a]">
                  ve {remaining} tane daha…
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          {childCount > 0 && (
            <>
              <button
                onClick={onDeleteWithChildren}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                  bg-red-600 hover:bg-red-500 text-white active:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/40"
              >
                <Trash2 size={14} />
                Tümünü Sil
              </button>
              <button
                onClick={onDeleteOnly}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                  bg-[#2a2a3a] hover:bg-[#353548] text-[#c4c4d8] active:bg-[#404058] focus:outline-none focus:ring-2 focus:ring-[#4a4a60]/40"
              >
                Sadece Bunu Sil
              </button>
            </>
          )}

          {childCount === 0 && (
            <button
              onClick={onDeleteOnly}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                bg-red-600 hover:bg-red-500 text-white active:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/40"
            >
              <Trash2 size={14} />
              Sil
            </button>
          )}

          <button
            onClick={onCancel}
            className="w-full flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors
              text-[#9090a8] hover:text-[#c4c4d8] hover:bg-[#1e1e30] focus:outline-none"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}
