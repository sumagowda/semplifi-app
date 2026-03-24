'use client';

import { motion } from 'framer-motion';
import type { Tile as TileType } from '@/types/tile';
import { useNavigationStore } from '@/stores/useNavigationStore';
import TextTile from './TextTile';
import RasterTile from './RasterTile';
import VectorTile from './VectorTile';

interface TileProps {
  tile: TileType;
}

/**
 * Renders a single non-container tile in the grid.
 *
 * Supports card flip interaction: click to flip a tile and
 * see its back side (label/type info). Uses CSS 3D perspective
 * and rotateY transform.
 *
 * Grid placement is handled via grid-column/grid-row.
 */
export default function Tile({ tile }: TileProps) {
  const flippedTileId = useNavigationStore((s) => s.flippedTileId);
  const toggleFlip = useNavigationStore((s) => s.toggleFlip);

  const isFlipped = flippedTileId === tile.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFlip(tile.id);
  };

  const gridStyle: React.CSSProperties = {
    gridColumn: tile.position.col + 1,
    gridRow: tile.position.row + 1,
    perspective: '600px',
  };

  const renderContent = () => {
    switch (tile.type) {
      case 'text':
        return <TextTile tile={tile} />;
      case 'raster':
        return <RasterTile tile={tile} />;
      case 'vector':
        return <VectorTile tile={tile} />;
      default:
        return null;
    }
  };

  return (
    <div style={gridStyle} data-tile-id={tile.id}>
      <motion.div
        className="tile-flipper"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
        }}
        style={{
          transformStyle: 'preserve-3d',
          width: '100%',
          height: '100%',
          cursor: 'pointer',
        }}
        onClick={handleClick}
      >
        {/* Front face */}
        <div
          className="tile"
          data-type={tile.type}
          style={{
            backfaceVisibility: 'hidden',
            position: 'absolute',
            inset: 0,
          }}
        >
          {renderContent()}
        </div>

        {/* Back face */}
        <div
          className="tile tile-back"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
          }}
        >
          <span className="tile-back-type">{tile.type.toUpperCase()}</span>
          {tile.label && <span className="tile-back-label">{tile.label}</span>}
          {'content' in tile && 'heading' in (tile.content as Record<string, unknown>) && (
            <span className="tile-back-heading">
              {(tile.content as { heading?: string }).heading}
            </span>
          )}
          <span className="tile-back-hint">Click to flip back</span>
        </div>
      </motion.div>
    </div>
  );
}
