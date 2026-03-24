'use client';

import type { VectorTile as VectorTileType } from '@/types/tile';

interface VectorTileProps {
  tile: VectorTileType;
}

/**
 * Renders an inline SVG vector graphic tile.
 * SVGs scale perfectly at any zoom level — no pixelation.
 * No padding applied per spec (Delineat: 0px).
 */
export default function VectorTile({ tile }: VectorTileProps) {
  const { svgContent, viewBox = '0 0 24 24', fillColor } = tile.content;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        viewBox={viewBox}
        className="w-3/4 h-3/4"
        style={{ color: fillColor }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
}
