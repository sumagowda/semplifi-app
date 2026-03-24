'use client';

import type { TextTile as TextTileType } from '@/types/tile';

interface TextTileProps {
  tile: TextTileType;
}

export default function TextTile({ tile }: TextTileProps) {
  const { heading, body, fontSize } = tile.content;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {heading && (
        <h3
          className="font-semibold leading-tight mb-1"
          style={{
            fontSize: fontSize ? fontSize + 2 : 14,
            color: 'var(--text-primary)',
          }}
        >
          {heading}
        </h3>
      )}
      {body && (
        <p
          className="leading-snug whitespace-pre-line"
          style={{
            fontSize: fontSize ?? 11,
            color: 'var(--text-secondary)',
            lineHeight: 1.45,
          }}
        >
          {body}
        </p>
      )}
    </div>
  );
}
