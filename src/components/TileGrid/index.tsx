'use client';

import { useMemo } from 'react';
import type { Tile as TileType, ContainerTile } from '@/types/tile';
import { GRID_DIMENSIONS } from '@/types/tile';
import { useNavigationStore } from '@/stores/useNavigationStore';
import Tile from '@/components/Tile';

interface TileGridProps {
  tiles: TileType[];
  depth: number;
  parentCanvasX: number;
  parentCanvasY: number;
}

/**
 * Renders a Fibonacci-proportioned CSS Grid of tiles.
 *
 * Container tiles render their children as nested TileGrids,
 * scaled down to fit within the container tile's bounds.
 * All levels exist simultaneously — zooming reveals deeper content.
 */
export default function TileGrid({ tiles, depth, parentCanvasX, parentCanvasY }: TileGridProps) {
  return (
    <div className="fibonacci-grid" data-depth={depth}>
      {tiles.map((tile) => {
        if (tile.type === 'container') {
          return (
            <ContainerTileWithChildren
              key={tile.id}
              tile={tile}
              depth={depth}
              parentCanvasX={parentCanvasX}
              parentCanvasY={parentCanvasY}
            />
          );
        }
        return <Tile key={tile.id} tile={tile} />;
      })}
    </div>
  );
}

/**
 * Container tile that renders both its label overlay AND
 * its nested children as a scaled-down TileGrid within.
 *
 * Label and nested content opacity are driven by the current
 * camera zoom scale — as you zoom in, the label fades out
 * and the nested content fades in.
 */
function ContainerTileWithChildren({
  tile,
  depth,
  parentCanvasX,
  parentCanvasY,
}: {
  tile: ContainerTile;
  depth: number;
  parentCanvasX: number;
  parentCanvasY: number;
}) {
  const cameraScale = useNavigationStore((s) => s.camera.scale);

  // Calculate scale to fit the full grid (919x631) within this tile's dimensions
  const scaleX = tile.position.width / GRID_DIMENSIONS.width;
  const scaleY = tile.position.height / GRID_DIMENSIONS.height;
  const nestedScale = Math.min(scaleX, scaleY) * 0.85;

  // Calculate the position of this tile in the grid
  // We need to account for the gap between tiles
  const colOffsets = [0, 89 + 55, 89 + 55 + 144 + 55, 89 + 55 + 144 + 55 + 233 + 55, 89 + 55 + 144 + 55 + 233 + 55 + 144 + 55];
  const rowOffsets = [0, 144 + 55, 144 + 55 + 233 + 55];

  const tileCanvasX = parentCanvasX + (colOffsets[tile.position.col] ?? 0);
  const tileCanvasY = parentCanvasY + (rowOffsets[tile.position.row] ?? 0);

  /**
   * Compute label and nested-content opacity based on zoom scale.
   *
   * When zoomed out: label is visible (1.0), nested is faint (0.1)
   * When zoomed in: label fades out (0.0), nested becomes full (1.0)
   *
   * The transition range depends on the depth — deeper containers
   * need more zoom to become readable.
   */
  const opacities = useMemo(() => {
    // How much zoom is needed to see this container's children clearly
    // Each nesting level requires ~4x zoom (since nestedScale ≈ 0.25)
    const zoomForThisLevel = 1 / Math.pow(nestedScale, depth + 1);

    // Transition range: start fading at 30% of needed zoom, complete at 80%
    const fadeStart = zoomForThisLevel * 0.3;
    const fadeEnd = zoomForThisLevel * 0.8;

    // Clamp t between 0 and 1
    const t = Math.min(Math.max((cameraScale - fadeStart) / (fadeEnd - fadeStart), 0), 1);

    return {
      label: 1 - t,      // fades out as we zoom in
      nested: 0.08 + t * 0.92, // goes from 0.08 to 1.0
    };
  }, [cameraScale, depth, nestedScale]);

  /**
   * On double-click, dispatch a custom event to the Canvas
   * to animate zoom-to-rect focusing on this container tile.
   */
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    window.dispatchEvent(
      new CustomEvent('semplifi:zoom-to-rect', {
        detail: {
          x: tileCanvasX,
          y: tileCanvasY,
          width: tile.position.width,
          height: tile.position.height,
        },
      }),
    );
  };

  const gridStyle: React.CSSProperties = {
    gridColumn: tile.position.col + 1,
    gridRow: tile.position.row + 1,
  };

  return (
    <div
      className="tile"
      data-type="container"
      data-tile-id={tile.id}
      style={gridStyle}
      onDoubleClick={handleDoubleClick}
    >
      {/* Label — fades out as user zooms in */}
      <div
        className="container-label"
        style={{
          opacity: opacities.label,
          pointerEvents: opacities.label < 0.3 ? 'none' : 'auto',
          transition: 'opacity 0.15s ease',
        }}
      >
        <span>{tile.label}</span>
      </div>

      {/* Nested grid — fades in as user zooms in */}
      <div
        className="nested-grid-wrapper"
        style={{
          transform: `scale(${nestedScale})`,
          transformOrigin: 'center center',
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: opacities.nested,
          pointerEvents: opacities.nested > 0.5 ? 'auto' : 'none',
          transition: 'opacity 0.15s ease',
        }}
      >
        <TileGrid
          tiles={tile.children}
          depth={depth + 1}
          parentCanvasX={tileCanvasX}
          parentCanvasY={tileCanvasY}
        />
      </div>
    </div>
  );
}
