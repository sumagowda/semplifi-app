'use client';

import type { Tile as TileType, ContainerTile } from '@/types/tile';
import Tile3D from '@/components/Tile3D';

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
 * This layout makes tiles look like physical cards laying on
 * a table, with nested content hovering above parent containers.
 * The angled camera reveals all three axes clearly.
 */
export default function TileGrid3D({
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
          <group key={tile.id}>
            <Tile3D
              tile={tile}
              position={pos}
              width={tile.position.width}
              height={tile.position.height}
            />

            {/* Render container children at the next Y-level */}
            {tile.type === 'container' && (
              <TileGrid3D
                tiles={(tile as ContainerTile).children}
                depth={depth + 1}
                offsetX={pixelX}
                offsetY={pixelZ}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}
