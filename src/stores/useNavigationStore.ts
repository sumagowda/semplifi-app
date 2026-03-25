import { create } from 'zustand';

/**
 * Navigation store for the 3D tile workspace.
 *
 * Each tile has an independent 3D position (x, y, z) and rotation.
 * Tiles start in the Fibonacci grid layout but can be "detached"
 * and dragged freely in 3D space, then snapped back to the grid.
 *
 * Supports drill-down navigation: double-clicking a container
 * zooms the camera into that container's children. A navigation
 * stack tracks the drill-down path for back-navigation.
 */

export interface TileState3D {
  /** World-space position */
  position: [number, number, number];
  /** Grid-assigned position (for snapping back) */
  gridPosition: [number, number, number];
  /** Rotation in radians [x, y, z] */
  rotation: [number, number, number];
  /** Whether the tile is detached from the grid */
  isDetached: boolean;
  /** Whether the card is flipped */
  isFlipped: boolean;
}

interface NavigationState {
  /** Per-tile 3D state, keyed by tile ID */
  tileStates: Record<string, TileState3D>;

  /** Currently selected tile ID (for highlighting/dragging) */
  selectedTileId: string | null;

  /** Currently hovered tile ID */
  hoveredTileId: string | null;

  /** Whether Shift is held (Z-axis drag mode) */
  isShiftHeld: boolean;

  /** Whether a tile is currently being dragged (disables orbit controls) */
  isTileDragging: boolean;

  /** The container tile we've drilled into (null = root level) */
  focusedContainerId: string | null;

  /** Stack of container IDs for back-navigation (breadcrumb trail) */
  navigationStack: string[];

  /** Initialize a tile's 3D state from its grid position */
  initTile: (tileId: string, gridPos: [number, number, number]) => void;

  /** Set a tile's world position (during drag) */
  setTilePosition: (tileId: string, pos: [number, number, number]) => void;

  /** Toggle a tile's flipped state */
  toggleFlip: (tileId: string) => void;

  /** Select a tile */
  selectTile: (tileId: string | null) => void;

  /** Set hovered tile */
  setHovered: (tileId: string | null) => void;

  /** Detach a tile from the grid (free-floating mode) */
  detachTile: (tileId: string) => void;

  /** Snap a tile back to its grid position */
  snapToGrid: (tileId: string) => void;

  /** Set shift key state */
  setShiftHeld: (held: boolean) => void;

  /** Set tile dragging state */
  setTileDragging: (dragging: boolean) => void;

  /** Drill down into a container tile */
  drillDown: (containerId: string) => void;

  /** Go back one level (pop navigation stack) */
  drillUp: () => void;

  /** Reset all tiles to grid positions and return to root */
  resetAll: () => void;
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  tileStates: {},
  selectedTileId: null,
  hoveredTileId: null,
  isShiftHeld: false,
  isTileDragging: false,
  focusedContainerId: null,
  navigationStack: [],

  initTile: (tileId, gridPos) => {
    set((state) => {
      // Don't overwrite if already exists
      if (state.tileStates[tileId]) return state;
      return {
        tileStates: {
          ...state.tileStates,
          [tileId]: {
            position: [...gridPos] as [number, number, number],
            gridPosition: [...gridPos] as [number, number, number],
            rotation: [0, 0, 0],
            isDetached: false,
            isFlipped: false,
          },
        },
      };
    });
  },

  setTilePosition: (tileId, pos) => {
    set((state) => {
      const tile = state.tileStates[tileId];
      if (!tile) return state;
      return {
        tileStates: {
          ...state.tileStates,
          [tileId]: { ...tile, position: pos, isDetached: true },
        },
      };
    });
  },

  toggleFlip: (tileId) => {
    set((state) => {
      const tile = state.tileStates[tileId];
      if (!tile) return state;
      return {
        tileStates: {
          ...state.tileStates,
          [tileId]: {
            ...tile,
            isFlipped: !tile.isFlipped,
            rotation: [
              tile.rotation[0],
              tile.isFlipped ? 0 : Math.PI, // flip 180° on Y
              tile.rotation[2],
            ],
          },
        },
      };
    });
  },

  selectTile: (tileId) => {
    set({ selectedTileId: tileId });
  },

  setHovered: (tileId) => {
    set({ hoveredTileId: tileId });
  },

  detachTile: (tileId) => {
    set((state) => {
      const tile = state.tileStates[tileId];
      if (!tile) return state;
      return {
        tileStates: {
          ...state.tileStates,
          [tileId]: { ...tile, isDetached: true },
        },
      };
    });
  },

  snapToGrid: (tileId) => {
    set((state) => {
      const tile = state.tileStates[tileId];
      if (!tile) return state;
      return {
        tileStates: {
          ...state.tileStates,
          [tileId]: {
            ...tile,
            position: [...tile.gridPosition] as [number, number, number],
            rotation: [0, 0, 0],
            isDetached: false,
            isFlipped: false,
          },
        },
      };
    });
  },

  setShiftHeld: (held) => {
    set({ isShiftHeld: held });
  },

  setTileDragging: (dragging) => {
    set({ isTileDragging: dragging });
  },

  drillDown: (containerId) => {
    set((state) => ({
      focusedContainerId: containerId,
      navigationStack: [...state.navigationStack, containerId],
      selectedTileId: null,
      // Clear tile states so children re-initialize at new positions
      tileStates: {},
    }));
  },

  drillUp: () => {
    set((state) => {
      const stack = [...state.navigationStack];
      stack.pop(); // Remove current level
      const parent = stack.length > 0 ? stack[stack.length - 1] : null;
      return {
        focusedContainerId: parent,
        navigationStack: stack,
        selectedTileId: null,
        // Clear tile states so tiles re-initialize at correct positions
        tileStates: {},
      };
    });
  },

  resetAll: () => {
    set({
      // Clear all tile states so they re-initialize at root positions
      tileStates: {},
      selectedTileId: null,
      focusedContainerId: null,
      navigationStack: [],
    });
  },
}));
