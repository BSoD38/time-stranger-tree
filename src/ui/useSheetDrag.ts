import { useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';

const DISMISS_PX = 88; // drag the sheet down past this and it closes
const TAP_PX = 6; // below this the gesture is a tap, handled by onClick

/**
 * Drag-to-dismiss for the mobile bottom sheet. Attach the returned handlers to
 * the grab handle; the sheet element (`hostRef`) follows the finger downward and
 * either dismisses past a threshold or springs back. A plain tap falls through to
 * `onClick` so the handle also works with a keyboard / assistive tech.
 *
 * Positions are written straight to the DOM during the drag (no per-frame React
 * render); the class-driven CSS transition is suspended for the duration and
 * restored on release so the spring-back / dismiss animates.
 */
export function useSheetDrag<T extends HTMLElement>(
  hostRef: RefObject<T | null>,
  { enabled, onClose }: { enabled: boolean; onClose: () => void },
) {
  const drag = useRef({ active: false, startY: 0, dy: 0 });
  const suppressClick = useRef(false);

  const onPointerDown = (event: ReactPointerEvent) => {
    if (!enabled) return;
    const host = hostRef.current;
    if (!host) return;
    drag.current = { active: true, startY: event.clientY, dy: 0 };
    suppressClick.current = false;
    host.style.transition = 'none';
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const host = hostRef.current;
    if (!host) return;
    d.dy = Math.max(0, event.clientY - d.startY); // downward only
    host.style.transform = `translateY(${d.dy}px)`;
  };

  const finish = () => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    const host = hostRef.current;
    if (!host) return;
    host.style.transition = ''; // hand animation back to CSS
    if (d.dy > DISMISS_PX) {
      // let the closed-state class carry it the rest of the way down
      suppressClick.current = true;
      host.style.transform = 'translateY(100%)';
      onClose();
    } else if (d.dy > TAP_PX) {
      suppressClick.current = true; // a deliberate drag, not a tap → don't also close
      host.style.transform = '';
    } else {
      host.style.transform = '';
    }
  };

  const onClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onClose();
  };

  return { onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish, onClick };
}
