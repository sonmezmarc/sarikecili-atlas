'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SELECTION_COLOR } from '@/lib/constants';

/* ─── Props ─── */
export interface TimelineInputDialogProps {
  type: 'number' | 'text' | 'color';
  label: string;
  value: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  position?: { x: number; y: number }; // inline positioning icin
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

/**
 * Generic input dialog for Timeline -- replaces DurationModal, ColorModal,
 * RenameModal and the inline duration/color/rename dialogs with a single
 * reusable component.
 *
 * Supports three input types:
 *  - number : numeric input with optional min/max/step
 *  - text   : plain text input
 *  - color  : color picker + hex text input
 *
 * Behaviours:
 *  - Enter  -> confirm
 *  - Escape -> cancel
 *  - Click on backdrop -> cancel
 */
export default function TimelineInputDialog({
  type,
  label,
  value: initialValue,
  onConfirm,
  onCancel,
  position,
  min,
  max,
  step,
  placeholder,
}: TimelineInputDialogProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on mount
  useEffect(() => {
    // Small timeout so the element is rendered before we focus
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, []);

  // Global escape listener (covers cases where input is not focused)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  const handleConfirm = useCallback(() => {
    onConfirm(value);
  }, [onConfirm, value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
      // Escape is handled by the global listener above,
      // but we also stop propagation here so parent handlers don't fire twice.
      if (e.key === 'Escape') {
        e.stopPropagation();
      }
    },
    [handleConfirm],
  );

  /* ─── Determine wrapper style ─── */
  const isInline = !!position;

  const backdropClass = isInline
    ? 'absolute inset-0 z-[999] flex items-center justify-center'
    : 'fixed inset-0 z-[10000] flex items-center justify-center';

  const backdropBg = isInline ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.3)';

  /* ─── Render input section by type ─── */
  const renderInput = () => {
    switch (type) {
      case 'number':
        return (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="number"
              min={min ?? 0.1}
              max={max}
              step={step ?? 0.5}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-20 px-2 py-1 text-[12px] rounded"
              style={{
                background: 'var(--editor-surface)',
                border: '1px solid var(--editor-border)',
                color: 'var(--editor-text)',
                outline: 'none',
              }}
            />
            <button
              onClick={handleConfirm}
              className="px-3 py-1 rounded text-[11px] font-medium"
              style={{ background: SELECTION_COLOR, color: '#000' }}
            >
              Tamam
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1 rounded text-[11px]"
              style={{ color: 'var(--editor-text-muted)' }}
            >
              İptal
            </button>
          </div>
        );

      case 'text':
        return (
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-32 px-2 py-1 text-[12px] rounded"
              style={{
                background: 'var(--editor-surface)',
                border: '1px solid var(--editor-border)',
                color: 'var(--editor-text)',
                outline: 'none',
              }}
            />
            <button
              onClick={handleConfirm}
              className="px-3 py-1 rounded text-[11px] font-medium"
              style={{ background: SELECTION_COLOR, color: '#000' }}
            >
              Tamam
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1 rounded text-[11px]"
              style={{ color: 'var(--editor-text-muted)' }}
            >
              İptal
            </button>
          </div>
        );

      case 'color':
        return (
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0"
              style={{ background: 'transparent' }}
            />
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder ?? '#000000'}
              className="w-24 px-2 py-1 text-[11px] rounded font-mono"
              style={{
                background: 'var(--editor-surface)',
                border: '1px solid var(--editor-border)',
                color: 'var(--editor-text)',
                outline: 'none',
              }}
            />
            <button
              onClick={handleConfirm}
              className="px-3 py-1 rounded text-[11px] font-medium"
              style={{ background: SELECTION_COLOR, color: '#000' }}
            >
              Tamam
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1 rounded text-[11px]"
              style={{ color: 'var(--editor-text-muted)' }}
            >
              İptal
            </button>
          </div>
        );
    }
  };

  return (
    <div
      className={backdropClass}
      style={{ background: backdropBg }}
      onClick={onCancel}
    >
      <div
        className="rounded-lg p-4 shadow-2xl"
        style={{
          background: 'var(--editor-panel-bg)',
          border: '1px solid var(--editor-border)',
          minWidth: 220,
          ...(isInline && position
            ? { position: 'absolute' as const, left: position.x, top: position.y }
            : {}),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <label
          className="text-[11px] mb-2 block font-medium"
          style={{ color: 'var(--editor-text)' }}
        >
          {label}
        </label>
        {renderInput()}
      </div>
    </div>
  );
}
