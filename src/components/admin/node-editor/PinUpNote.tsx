'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { PinUpNote } from '@/lib/types/nodes';
import { PIN_UP_COLORS } from '@/lib/constants';
import { X } from 'lucide-react';

interface PinUpNoteProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  text: string;
  onUpdate: (id: string, updates: Partial<PinUpNote>) => void;
  onDelete: (id: string) => void;
}

export default function PinUpNoteComponent({
  id,
  x,
  y,
  width,
  height,
  color,
  text,
  onUpdate,
  onDelete,
}: PinUpNoteProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const noteRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, noteX: 0, noteY: 0 });
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });

  // --- Drag logic ---
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      // Ignore if clicking on interactive elements
      if (
        (e.target as HTMLElement).closest('[data-no-drag]') ||
        (e.target as HTMLElement).getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, noteX: x, noteY: y };
    },
    [x, y],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      onUpdate(id, {
        x: dragStartRef.current.noteX + dx,
        y: dragStartRef.current.noteY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, id, onUpdate]);

  // --- Resize logic ---
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        width,
        height,
      };
    },
    [width, height],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStartRef.current.mouseX;
      const dy = e.clientY - resizeStartRef.current.mouseY;
      const newWidth = Math.max(120, resizeStartRef.current.width + dx);
      const newHeight = Math.max(80, resizeStartRef.current.height + dy);
      onUpdate(id, { width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, id, onUpdate]);

  // --- Text editing ---
  const handleTextBlur = useCallback(() => {
    if (editableRef.current) {
      const newText = editableRef.current.innerText;
      if (newText !== text) {
        onUpdate(id, { text: newText });
      }
    }
  }, [id, text, onUpdate]);

  // Prevent enter from inserting divs, use plain line breaks instead
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertLineBreak');
    }
  }, []);

  // --- Color picking ---
  const handleColorSelect = useCallback(
    (newColor: string) => {
      onUpdate(id, { color: newColor });
      setShowColorPicker(false);
    },
    [id, onUpdate],
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowColorPicker((prev) => !prev);
  }, []);

  // Compute a darkened border color from the note color
  const borderColor = adjustBrightness(color, -40);
  const headerColor = adjustBrightness(color, -15);

  return (
    <div
      ref={noteRef}
      onMouseDown={handleDragStart}
      onContextMenu={handleContextMenu}
      className="absolute select-none group"
      style={{
        left: x,
        top: y,
        width,
        height,
        zIndex: isDragging || isResizing ? 1000 : 50,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {/* Note body */}
      <div
        className="w-full h-full rounded-md flex flex-col overflow-hidden"
        style={{
          backgroundColor: `${color}e6`, // slightly transparent
          border: `1px solid ${borderColor}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-2 py-1 shrink-0"
          style={{ backgroundColor: headerColor }}
        >
          {/* Color dots */}
          <div className="flex items-center gap-1" data-no-drag>
            {showColorPicker && (
              <div
                className="flex items-center gap-1 mr-1 animate-in fade-in slide-in-from-left-2 duration-150"
                data-no-drag
              >
                {PIN_UP_COLORS.filter((c) => c !== color).map((c) => (
                  <button
                    key={c}
                    onClick={() => handleColorSelect(c)}
                    className="w-4 h-4 rounded-full border border-black/20 hover:scale-125 transition-transform"
                    style={{ backgroundColor: c }}
                    title={`${c} rengine geç`}
                    data-no-drag
                  />
                ))}
              </div>
            )}
            <button
              onClick={() => setShowColorPicker((prev) => !prev)}
              className="w-4 h-4 rounded-full border border-black/20 hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              title="Renk değiştir"
              data-no-drag
            />
          </div>

          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10 text-black/40 hover:text-black/70 opacity-0 group-hover:opacity-100 transition-all"
            title="Notu sil"
            data-no-drag
          >
            <X size={12} />
          </button>
        </div>

        {/* Editable text area */}
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleTextBlur}
          onKeyDown={handleKeyDown}
          data-no-drag
          className="flex-1 px-2.5 py-2 text-sm leading-relaxed overflow-auto focus:outline-none whitespace-pre-wrap break-words"
          style={{
            color: '#1a1a1a',
            cursor: 'text',
            minHeight: 0,
          }}
        >
          {text}
        </div>
      </div>

      {/* Resize handle — bottom-right corner */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
        data-no-drag
        style={{ zIndex: 10 }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" className="text-black/30">
          <path d="M14 16L16 14M10 16L16 10M6 16L16 6" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
    </div>
  );
}

/** Adjust hex color brightness by an amount (-255 to 255). */
function adjustBrightness(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(h.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(h.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(h.substring(4, 6), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
