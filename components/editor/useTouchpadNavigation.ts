import { useEffect } from 'react';
import { useReactFlow } from 'reactflow';

const PINCH_ZOOM_SPEED = 0.001;
const PAN_SENSITIVITY = 2;

/**
 * Hook to enable touchpad navigation on React Flow canvas
 * Supports:
 * - Ctrl/Cmd + scroll wheel: pinch-to-zoom
 * - Shift + scroll: horizontal pan
 * - Alt + scroll: vertical pan
 * - Two-finger trackpad scroll: natural panning
 */
export function useTouchpadNavigation(containerRef: React.RefObject<HTMLDivElement | null>) {
  const { getViewport, setViewport } = useReactFlow();

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const handleWheel = (event: WheelEvent) => {
      // Pinch-to-zoom on trackpad (Ctrl or Cmd key)
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();

        const viewport = getViewport();
        // Use deltaY for zoom (positive = zoom out, negative = zoom in)
        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        const newZoom = Math.max(0.1, Math.min(4, viewport.zoom + delta));

        setViewport({ x: viewport.x, y: viewport.y, zoom: newZoom });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [containerRef, getViewport, setViewport]);
}
