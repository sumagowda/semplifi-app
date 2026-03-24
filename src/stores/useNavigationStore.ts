import { create } from 'zustand';

/**
 * Navigation store for the infinite canvas.
 *
 * Instead of discrete zoom levels, the canvas uses a continuous
 * scale + translate model. The camera position is defined by:
 *   - scale: zoom factor (1 = default, higher = zoomed in)
 *   - x, y: translation offset in canvas coordinates
 *
 * All content exists simultaneously on the canvas at different
 * scales. Zooming reveals nested content that was previously
 * too small to see.
 */

interface CameraState {
  /** Current zoom scale. 1 = root level, higher = zoomed in */
  scale: number;
  /** Horizontal pan offset (in screen pixels) */
  x: number;
  /** Vertical pan offset (in screen pixels) */
  y: number;
}

interface NavigationState {
  camera: CameraState;

  /** Whether the user is currently dragging to pan */
  isPanning: boolean;

  /** The tile ID that is currently flipped (showing back side) */
  flippedTileId: string | null;

  /** Minimum and maximum zoom scale */
  minScale: number;
  maxScale: number;

  /** Set the full camera state (for animated transitions) */
  setCamera: (camera: Partial<CameraState>) => void;

  /** Pan by a delta (during drag) */
  panBy: (dx: number, dy: number) => void;

  /** Zoom toward a point on the screen */
  zoomAtPoint: (scaleDelta: number, clientX: number, clientY: number) => void;

  /** Animate zoom to focus on a specific rect in canvas space */
  zoomToRect: (rect: { x: number; y: number; width: number; height: number }) => void;

  /** Set panning state */
  setIsPanning: (panning: boolean) => void;

  /** Toggle flip state of a tile */
  toggleFlip: (tileId: string) => void;

  /** Reset to initial view */
  resetView: () => void;
}

const INITIAL_CAMERA: CameraState = {
  scale: 1,
  x: 0,
  y: 0,
};

export const useNavigationStore = create<NavigationState>((set, get) => ({
  camera: { ...INITIAL_CAMERA },
  isPanning: false,
  flippedTileId: null,
  minScale: 0.1,
  maxScale: 80,

  setCamera: (partial) => {
    set((state) => ({
      camera: { ...state.camera, ...partial },
    }));
  },

  panBy: (dx, dy) => {
    set((state) => ({
      camera: {
        ...state.camera,
        x: state.camera.x + dx,
        y: state.camera.y + dy,
      },
    }));
  },

  zoomAtPoint: (scaleDelta, clientX, clientY) => {
    const { camera, minScale, maxScale } = get();
    const newScale = Math.min(Math.max(camera.scale * scaleDelta, minScale), maxScale);
    const ratio = newScale / camera.scale;

    // Zoom toward the cursor position.
    // The point under the cursor should stay fixed on screen.
    const newX = clientX - ratio * (clientX - camera.x);
    const newY = clientY - ratio * (clientY - camera.y);

    set({
      camera: {
        scale: newScale,
        x: newX,
        y: newY,
      },
    });
  },

  zoomToRect: (rect) => {
    // Calculate scale and translate to fit the rect in the viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 60; // px padding around the target

    const scaleX = (viewportWidth - padding * 2) / rect.width;
    const scaleY = (viewportHeight - padding * 2) / rect.height;
    const newScale = Math.min(scaleX, scaleY);

    // Center the rect in the viewport
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;

    const newX = viewportWidth / 2 - centerX * newScale;
    const newY = viewportHeight / 2 - centerY * newScale;

    set({
      camera: {
        scale: newScale,
        x: newX,
        y: newY,
      },
    });
  },

  setIsPanning: (panning) => {
    set({ isPanning: panning });
  },

  toggleFlip: (tileId) => {
    set((state) => ({
      flippedTileId: state.flippedTileId === tileId ? null : tileId,
    }));
  },

  resetView: () => {
    set({
      camera: { ...INITIAL_CAMERA },
      flippedTileId: null,
    });
  },
}));
