'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigationStore } from '@/stores/useNavigationStore';
import { rootTiles } from '@/data/herbs';
import TileGrid from '@/components/TileGrid';

/**
 * Canvas — infinite zoomable viewport.
 *
 * All content exists simultaneously at different scales on a single
 * continuous canvas. The camera (scale + translate) determines what
 * is visible. Zooming reveals nested content that was too small to
 * see from the outer level.
 *
 * Interactions:
 *   - Scroll wheel: zoom in/out toward cursor position
 *   - Pinch (trackpad): zoom in/out
 *   - Click + drag: pan the canvas
 *   - Double-click a container tile: animate zoom to fit it
 *   - Escape: reset to initial view
 *
 * Uses direct DOM transform updates for maximum performance.
 * Animated transitions use requestAnimationFrame-based spring.
 */

interface Camera {
  scale: number;
  x: number;
  y: number;
}

export default function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<Camera>({ scale: 1, x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);

  // Force re-render when camera changes (for opacity calculations in children)
  const [, setRenderTick] = useState(0);

  const { minScale, maxScale } = useNavigationStore.getState();

  /**
   * Apply the current camera transform to the DOM directly.
   */
  const applyTransform = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    const { scale, x, y } = cameraRef.current;
    world.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }, []);

  /**
   * Sync camera state to zustand store (for opacity calculations in TileGrid).
   */
  const syncToStore = useCallback(() => {
    const { scale, x, y } = cameraRef.current;
    useNavigationStore.getState().setCamera({ scale, x, y });
    setRenderTick((t) => t + 1);
  }, []);

  /**
   * Center the grid in the viewport on mount.
   */
  useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gridW = 919;
    const gridH = 631;

    cameraRef.current = {
      scale: 1,
      x: (vw - gridW) / 2,
      y: (vh - gridH) / 2,
    };
    applyTransform();
    syncToStore();
  }, [applyTransform, syncToStore]);

  /**
   * Zoom toward a point on the screen.
   * The point under the cursor remains fixed.
   */
  const zoomAtPoint = useCallback(
    (scaleDelta: number, clientX: number, clientY: number) => {
      const cam = cameraRef.current;
      const newScale = Math.min(Math.max(cam.scale * scaleDelta, minScale), maxScale);
      const ratio = newScale / cam.scale;

      cameraRef.current = {
        scale: newScale,
        x: clientX - ratio * (clientX - cam.x),
        y: clientY - ratio * (clientY - cam.y),
      };
      applyTransform();
      syncToStore();
    },
    [applyTransform, syncToStore, minScale, maxScale],
  );

  /**
   * Smoothly animate the camera to a target state using spring physics.
   */
  const animateTo = useCallback(
    (target: Camera) => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      const start = { ...cameraRef.current };
      const startTime = performance.now();
      const duration = 600; // ms

      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);

        cameraRef.current = {
          scale: start.scale + (target.scale - start.scale) * eased,
          x: start.x + (target.x - start.x) * eased,
          y: start.y + (target.y - start.y) * eased,
        };
        applyTransform();
        syncToStore();

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(step);
        } else {
          animationRef.current = null;
        }
      };

      animationRef.current = requestAnimationFrame(step);
    },
    [applyTransform, syncToStore],
  );

  /**
   * Handle wheel zoom (scroll + trackpad pinch).
   */
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      const isPinch = e.ctrlKey;
      const zoomIntensity = isPinch ? 0.01 : 0.003;
      const delta = -e.deltaY * zoomIntensity;
      const scaleDelta = Math.exp(delta);

      zoomAtPoint(scaleDelta, e.clientX, e.clientY);
    },
    [zoomAtPoint],
  );

  /**
   * Handle pointer down — start panning.
   */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;

    // Don't start pan if clicking a button or tile
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    if (target.closest('[data-tile-id]')) return;

    isDragging.current = true;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  /**
   * Handle pointer move — pan the canvas.
   */
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;

      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };

      cameraRef.current.x += dx;
      cameraRef.current.y += dy;
      applyTransform();
      syncToStore();
    },
    [applyTransform, syncToStore],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  /**
   * Handle keyboard shortcuts.
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        animateTo({
          scale: 1,
          x: (vw - 919) / 2,
          y: (vh - 631) / 2,
        });
      }
    },
    [animateTo],
  );

  /**
   * Attach event listeners.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleWheel, handleKeyDown]);

  /**
   * Listen for zoom-to-rect events from container tiles (double-click).
   */
  useEffect(() => {
    const handler = (e: Event) => {
      const { x, y, width, height } = (e as CustomEvent).detail;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const padding = 80;

      const scaleX = (vw - padding * 2) / width;
      const scaleY = (vh - padding * 2) / height;
      const targetScale = Math.min(scaleX, scaleY);

      const centerX = x + width / 2;
      const centerY = y + height / 2;

      animateTo({
        scale: targetScale,
        x: vw / 2 - centerX * targetScale,
        y: vh / 2 - centerY * targetScale,
      });
    };

    window.addEventListener('semplifi:zoom-to-rect', handler);
    return () => window.removeEventListener('semplifi:zoom-to-rect', handler);
  }, [animateTo]);

  return (
    <div
      ref={containerRef}
      className="canvas-viewport"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div
        ref={worldRef}
        className="canvas-world"
        style={{ transformOrigin: '0 0' }}
      >
        <TileGrid tiles={rootTiles} depth={0} parentCanvasX={0} parentCanvasY={0} />
      </div>

      {/* Zoom controls */}
      <div className="canvas-controls">
        <button
          className="canvas-control-btn"
          onClick={(e) => {
            e.stopPropagation();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            zoomAtPoint(1.5, vw / 2, vh / 2);
          }}
          title="Zoom in"
        >
          +
        </button>
        <button
          className="canvas-control-btn"
          onClick={(e) => {
            e.stopPropagation();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            zoomAtPoint(0.67, vw / 2, vh / 2);
          }}
          title="Zoom out"
        >
          -
        </button>
        <button
          className="canvas-control-btn"
          onClick={(e) => {
            e.stopPropagation();
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            animateTo({
              scale: 1,
              x: (vw - 919) / 2,
              y: (vh - 631) / 2,
            });
          }}
          title="Reset view (Esc)"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
