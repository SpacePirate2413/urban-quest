import { AlertCircle, GripVertical, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { TABS } from './questValidation';

const PANEL_WIDTH = 360;
const PANEL_MARGIN = 20;

/**
 * Floating draggable card that lists all current submission-blocking errors.
 * Lives at the QuestEditor level so it persists when the creator switches
 * between Quest Info / Waypoints / Create. Clicking an error row jumps to
 * the relevant tab. The popup auto-closes when the error list goes empty.
 */
export function ValidationPanel({ errors, isOpen, onClose, onJumpToTab }) {
  // Position is in viewport pixels. Default to bottom-right; the user can
  // drag it anywhere (constrained to the viewport). Use a lazy initializer
  // so we don't have to round-trip through an effect to compute the start
  // position — the function runs exactly once on mount.
  const [pos, setPos] = useState(() => {
    if (typeof window === 'undefined') return { x: PANEL_MARGIN, y: PANEL_MARGIN };
    return {
      x: Math.max(PANEL_MARGIN, window.innerWidth - PANEL_WIDTH - PANEL_MARGIN),
      y: Math.max(PANEL_MARGIN, window.innerHeight - 320 - PANEL_MARGIN),
    };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ dx: 0, dy: 0 });
  const panelRef = useRef(null);

  // Track which error ids we've seen so newly-cleared rows can briefly
  // flash green before they unmount. (Pure UX nicety — no behavior depends on it.)
  const previousIdsRef = useRef(new Set());
  const [flashIds, setFlashIds] = useState(new Set());
  useEffect(() => {
    const currentIds = new Set(errors.map((e) => e.id));
    const cleared = [...previousIdsRef.current].filter((id) => !currentIds.has(id));
    if (cleared.length) {
      setFlashIds((prev) => {
        const next = new Set(prev);
        cleared.forEach((id) => next.add(id));
        return next;
      });
      // Clear the flash markers after the animation. We don't actually need
      // to render anything for cleared ids since they're already gone from
      // `errors`; this is just future-proofing in case the design changes.
      const t = setTimeout(() => setFlashIds(new Set()), 600);
      previousIdsRef.current = currentIds;
      return () => clearTimeout(t);
    }
    previousIdsRef.current = currentIds;
  }, [errors]);

  // Drag handlers — wired to the document so dragging stays smooth even if
  // the cursor leaves the panel header.
  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e) => {
      const { dx, dy } = dragOffsetRef.current;
      const w = panelRef.current?.offsetWidth ?? PANEL_WIDTH;
      const h = panelRef.current?.offsetHeight ?? 200;
      let x = e.clientX - dx;
      let y = e.clientY - dy;
      x = Math.max(0, Math.min(x, window.innerWidth - w));
      y = Math.max(0, Math.min(y, window.innerHeight - h));
      setPos({ x, y });
    };
    const handleUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging]);

  if (!isOpen || errors.length === 0) return null;

  const handleHeaderMouseDown = (e) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragOffsetRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    setIsDragging(true);
    e.preventDefault();
  };

  return (
    <div
      ref={panelRef}
      className="fixed z-40 bg-panel border-[1.5px] border-red-500/50 rounded-xl shadow-2xl shadow-red-500/20 overflow-hidden"
      style={{ left: pos.x, top: pos.y, width: PANEL_WIDTH, maxHeight: 360 }}
    >
      {/* ── Header (drag handle) ───────────────────────────────────── */}
      <div
        onMouseDown={handleHeaderMouseDown}
        className="px-3 py-2 bg-red-500/10 border-b border-red-500/30 flex items-center gap-2 cursor-move select-none"
      >
        <GripVertical className="w-4 h-4 text-red-400/60 flex-shrink-0" />
        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <p className="font-bangers text-sm text-red-400 uppercase flex-1">
          {errors.length} issue{errors.length === 1 ? '' : 's'} to fix
        </p>
        <button
          onClick={onClose}
          className="p-1 text-white/50 hover:text-white transition-colors"
          aria-label="Dismiss validation panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Error list ─────────────────────────────────────────────── */}
      <ul className="overflow-y-auto" style={{ maxHeight: 300 }}>
        {errors.map((err) => {
          const tabLabel = TABS[err.tab] ?? err.tab;
          const isFlashing = flashIds.has(err.id);
          return (
            <li key={err.id}>
              <button
                onClick={() => onJumpToTab?.(err.tab)}
                className={`
                  w-full text-left px-3 py-2 flex items-start gap-2 border-b border-panel-border/50
                  hover:bg-red-500/5 transition-colors
                  ${isFlashing ? 'bg-neon-green/10' : ''}
                `}
              >
                <span
                  className={`
                    text-[10px] font-bangers uppercase tracking-wider px-1.5 py-0.5 rounded
                    flex-shrink-0 mt-0.5
                    ${
                      err.tab === 'settings'
                        ? 'bg-cyan/20 text-cyan border border-cyan/40'
                        : err.tab === 'waypoints'
                          ? 'bg-yellow/20 text-yellow border border-yellow/40'
                          : 'bg-purple/20 text-purple border border-purple/40'
                    }
                  `}
                >
                  {tabLabel}
                </span>
                <span className="text-xs text-red-300 leading-relaxed flex-1">
                  {err.message}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default ValidationPanel;
