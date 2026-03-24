/**
 * Core tile data types for the Semplifi grid system.
 *
 * The grid uses Fibonacci-based dimensions:
 * 89px, 144px, 233px for tile sizes
 * 55px for gaps between tiles
 *
 * Tiles are recursively nested up to 5 levels deep.
 */

export type TileContentType = 'text' | 'raster' | 'vector' | 'container';

/**
 * Padding per tile content type (from the spec "array &c.pdf"):
 * - Apprisal (text): 8px
 * - Delineat (vector): 0px
 * - Semblance (raster): 3px
 */
export const TILE_PADDING: Record<Exclude<TileContentType, 'container'>, number> = {
  text: 8,
  vector: 0,
  raster: 3,
};

/**
 * Fibonacci grid dimensions (in logical pixels).
 * On retina displays, these map to 2x actual pixels.
 */
export const FIB = {
  /** Smallest tile dimension */
  89: 89,
  /** Medium tile dimension */
  144: 144,
  /** Largest tile dimension / center tile */
  233: 233,
  /** Gap between tiles */
  55: 55,
} as const;

/**
 * Active (zoomed-in) node sizes:
 * 89 -> 233
 * 144 -> 377
 * 233 -> 610
 */
export const FIB_ACTIVE: Record<number, number> = {
  89: 233,
  144: 377,
  233: 610,
};

/** Position within the grid layout */
export interface TilePosition {
  row: number;
  col: number;
  width: number;
  height: number;
}

/** Base tile interface */
export interface TileNode {
  id: string;
  type: TileContentType;
  level: number;
  position: TilePosition;
  parentId: string | null;
  label?: string;
}

/** Text content tile */
export interface TextTile extends TileNode {
  type: 'text';
  content: {
    heading?: string;
    body?: string;
    fontSize?: number;
  };
}

/** Raster image tile */
export interface RasterTile extends TileNode {
  type: 'raster';
  content: {
    src: string;
    src2x?: string;
    alt: string;
    objectFit?: 'cover' | 'contain' | 'fill';
  };
}

/** Vector graphic tile */
export interface VectorTile extends TileNode {
  type: 'vector';
  content: {
    svgContent: string;
    viewBox?: string;
    fillColor?: string;
  };
}

/** Container tile that holds a nested grid of child tiles */
export interface ContainerTile extends TileNode {
  type: 'container';
  children: Tile[];
  label: string;
}

export type Tile = TextTile | RasterTile | VectorTile | ContainerTile;

/** The grid layout spec for a single level */
export interface GridLayout {
  /** CSS grid-template-columns value */
  columns: string;
  /** CSS grid-template-rows value */
  rows: string;
  /** CSS gap value */
  gap: number;
}

/**
 * Standard grid layout from the spec:
 * Horizontal: 89 + 55 + 144 + 55 + 233 + 55 + 144 + 55 + 89 = 919px
 * Vertical: 144 + 55 + 233 + 55 + 144 = 631px
 */
export const STANDARD_GRID: GridLayout = {
  columns: '89px 144px 233px 144px 89px',
  rows: '144px 233px 144px',
  gap: 55,
};

/** Total grid dimensions */
export const GRID_DIMENSIONS = {
  width: 919,
  height: 631,
} as const;
