'use client';

import type { Tile as TileType, ContainerTile } from '@/types/tile';
import Tile3D from '@/components/Tile3D';
import { tileMap } from '@/data/herbs';
import { useNavigationStore } from '@/stores/useNavigationStore';

// ContainerTile is used in the drill-down logic of TileGrid3D

interface TileGrid3DProps {
  tiles: TileType[];
  depth: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Scale factor for converting pixel dimensions to 3D world units.
 * 100px = 1 world unit, so the 919px grid ~ 9.19 world units wide.
 */
const SCALE = 0.01;

/**
 * Y-spacing between depth levels (world units).
 * Each nesting level stacks upward so deeper content
 * floats above the parent, clearly visible from the
 * angled camera view.
 */
const Y_LAYER_SPACING = 1.5;

/**
 * Column X-offsets in pixels (cumulative with gaps).
 * Columns: 89|55|144|55|233|55|144|55|89
 */
const COL_OFFSETS = [0, 144, 343, 631, 830];

/**
 * Row Z-offsets in pixels (cumulative with gaps).
 * Rows: 144|55|233|55|144
 * Mapped to Z-axis so rows go "into" the screen.
 */
const ROW_OFFSETS = [0, 199, 487];

/**
 * Arranges tiles in the Fibonacci grid layout on the XZ horizontal plane.
 *
 * - X axis = columns (left/right)
 * - Z axis = rows (near/far, into the screen)
 * - Y axis = nesting depth (stacked upward)
 *
 * When a container is focused (drilled into), only that container's
 * children are rendered, laid out as if they were the root level.
 */
export default function TileGrid3D({
  tiles,
  depth,
  offsetX,
  offsetY,
}: TileGrid3DProps) {
  const focusedContainerId = useNavigationStore((s) => s.focusedContainerId);

  // If we're at the top-level call (depth === 0) and a container is focused,
  // render only that container's children at the root level
  if (depth === 0 && focusedContainerId) {
    const focused = tileMap.get(focusedContainerId);
    if (focused && focused.type === 'container') {
      return (
        <TileGrid3DInner
          tiles={(focused as ContainerTile).children}
          depth={0}
          offsetX={0}
          offsetY={0}
        />
      );
    }
  }

  return (
    <TileGrid3DInner
      tiles={tiles}
      depth={depth}
      offsetX={offsetX}
      offsetY={offsetY}
    />
  );
}

/**
 * Inner grid renderer — does the actual Fibonacci layout.
 */
function TileGrid3DInner({
  tiles,
  depth,
  offsetX,
  offsetY,
}: TileGrid3DProps) {
  // Each nesting level floats higher
  const layerY = depth * Y_LAYER_SPACING;

  return (
    <group>
      {tiles.map((tile) => {
        const col = tile.position.col;
        const row = tile.position.row;

        // Center the grid around origin
        const gridCenterX = (919 * SCALE) / 2;
        const gridCenterZ = (631 * SCALE) / 2;

        const pixelX = offsetX + COL_OFFSETS[col];
        const pixelZ = offsetY + ROW_OFFSETS[row];

        // Convert to world coords on the XZ plane
        // X goes left-right, Z goes near-far (rows go into screen)
        const worldX = pixelX * SCALE - gridCenterX + (tile.position.width * SCALE) / 2;
        const worldZ = pixelZ * SCALE - gridCenterZ + (tile.position.height * SCALE) / 2;
        const worldY = layerY;

        const pos: [number, number, number] = [worldX, worldY, worldZ];

        return (
          <Tile3D
            key={tile.id}
            tile={tile}
            position={pos}
            width={tile.position.width}
            height={tile.position.height}
          />
        );
      })}
    </group>
  );
}
