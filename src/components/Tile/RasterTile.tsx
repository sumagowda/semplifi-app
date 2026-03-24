'use client';

import type { RasterTile as RasterTileType } from '@/types/tile';

interface RasterTileProps {
  tile: RasterTileType;
}

/**
 * Renders a raster image tile with retina support.
 * Uses srcSet for 2x displays when a high-res source is provided.
 * CSS image-rendering ensures crisp display at native resolution.
 */
export default function RasterTile({ tile }: RasterTileProps) {
  const { src, src2x, alt, objectFit = 'cover' } = tile.content;

  return (
    <div className="w-full h-full overflow-hidden">
      <img
        src={src}
        srcSet={src2x ? `${src} 1x, ${src2x} 2x` : undefined}
        alt={alt}
        className="w-full h-full"
        style={{
          objectFit,
          imageRendering: 'auto',
        }}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
