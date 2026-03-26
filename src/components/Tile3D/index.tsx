'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { Tile as TileType } from '@/types/tile';
import { useNavigationStore } from '@/stores/useNavigationStore';
import { getAncestryChain, tileMap } from '@/data/herbs';

interface Tile3DProps {
  tile: TileType;
  position: [number, number, number];
  width: number;
  height: number;
}

/** Scale factor: 100px = 1 world unit */
const SCALE = 0.01;

/** Tile thickness — thin card, just enough for shadows */
const TILE_DEPTH = 0.04;

/** Corner radius for the rounded card */
const CORNER_RADIUS = 0.03;

/** Type-based accent colors for card borders */
const TYPE_COLORS: Record<string, string> = {
  text: '#6366f1',
  raster: '#f59e0b',
  vector: '#10b981',
  container: '#8b5cf6',
};

/**
 * A single tile rendered as a flat 2D card in the Three.js scene.
 *
 * Each tile is a thin rounded card with:
 *   - Clean white surface with HTML content
 *   - Subtle shadow on the ground plane
 *   - Hover lift animation
 *
 * Interactions:
 *   - Click: select tile
 *   - Drag: move X/Y (or Shift+drag for Z)
 *   - Double-click container: drill down into children
 *   - Double-click tile: flip card
 */
export default function Tile3D({ tile, position, width, height }: Tile3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const posGroupRef = useRef<THREE.Group>(null);
  const { gl } = useThree();

  const tileState = useNavigationStore((s) => s.tileStates[tile.id]);
  const selectedTileId = useNavigationStore((s) => s.selectedTileId);
  const hoveredTileId = useNavigationStore((s) => s.hoveredTileId);
  const initTile = useNavigationStore((s) => s.initTile);
  const setTilePosition = useNavigationStore((s) => s.setTilePosition);
  const selectTile = useNavigationStore((s) => s.selectTile);
  const setHovered = useNavigationStore((s) => s.setHovered);
  const toggleFlip = useNavigationStore((s) => s.toggleFlip);
  const snapToGrid = useNavigationStore((s) => s.snapToGrid);
  const setTileDragging = useNavigationStore((s) => s.setTileDragging);
  const drillDown = useNavigationStore((s) => s.drillDown);

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; pos: [number, number, number] } | null>(null);
  const hasDragged = useRef(false);

  const w = width * SCALE;
  const h = height * SCALE;
  const isContainer = tile.type === 'container';

  // Initialize tile in store
  useEffect(() => {
    initTile(tile.id, position);
  }, [tile.id, position, initTile]);

  const isSelected = selectedTileId === tile.id;
  const isHovered = hoveredTileId === tile.id;
  const isFlipped = tileState?.isFlipped ?? false;
  const isDetached = tileState?.isDetached ?? false;
  const currentPos: [number, number, number] = tileState?.position ?? position;

  // Target rotation for flip animation
  const targetRotY = isFlipped ? Math.PI : 0;

  // Hover lift — selected/hovered tiles float up slightly
  const targetLift = isSelected ? 0.15 : isHovered ? 0.08 : 0;
  const liftRef = useRef(0);

  // Accent color for this tile type
  const accentColor = TYPE_COLORS[tile.type] || TYPE_COLORS.text;

  // Animate flip rotation and hover lift
  useFrame(() => {
    if (groupRef.current) {
      const currentRot = groupRef.current.rotation.y;
      const rotDiff = targetRotY - currentRot;
      if (Math.abs(rotDiff) > 0.001) {
        groupRef.current.rotation.y += rotDiff * 0.12;
      }
    }
    if (posGroupRef.current) {
      const liftDiff = targetLift - liftRef.current;
      if (Math.abs(liftDiff) > 0.001) {
        liftRef.current += liftDiff * 0.15;
        posGroupRef.current.position.y = currentPos[1] + liftRef.current;
      }
    }
  });

  // Pointer down — start potential drag (select only, no flip)
  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      selectTile(tile.id);
      dragStart.current = {
        x: e.nativeEvent.clientX,
        y: e.nativeEvent.clientY,
        pos: [...currentPos] as [number, number, number],
      };
      hasDragged.current = false;
      setIsDragging(true);
      setTileDragging(true);
      (e.nativeEvent.target as HTMLElement)?.setPointerCapture?.(e.nativeEvent.pointerId);
    },
    [tile.id, currentPos, selectTile, setTileDragging],
  );

  // Pointer move/up — drag tile
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: PointerEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasDragged.current = true;
      }
      if (!hasDragged.current) return;

      const shiftHeld = useNavigationStore.getState().isShiftHeld;
      const moveFactor = 0.02;

      if (shiftHeld) {
        const newZ = dragStart.current.pos[2] + dy * moveFactor;
        setTilePosition(tile.id, [dragStart.current.pos[0], dragStart.current.pos[1], newZ]);
      } else {
        const newX = dragStart.current.pos[0] + dx * moveFactor;
        const newY = dragStart.current.pos[1] - dy * moveFactor;
        setTilePosition(tile.id, [newX, newY, dragStart.current.pos[2]]);
      }
    };

    const handleUp = () => {
      setIsDragging(false);
      setTileDragging(false);
      // No flip on single click — flip is handled by double-click
      dragStart.current = null;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isDragging, tile.id, setTilePosition, setTileDragging]);

  // Double-click: containers → drill down, otherwise → flip card
  const handleDoubleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (isContainer) {
        // Build the full ancestry chain of container IDs so the breadcrumb
        // shows all intermediate levels (e.g., Root > Rosemary > Rosemary Roast Lamb).
        const ancestry = getAncestryChain(tile.id);
        // Filter to only container ancestors (skip root and non-container tiles)
        const containerAncestors = ancestry.filter((id) => {
          if (id === 'root') return false; // root is implicit, not in the stack
          const t = tileMap.get(id);
          return t?.type === 'container';
        });
        drillDown(tile.id, containerAncestors);
      } else if (isDetached) {
        snapToGrid(tile.id);
      } else {
        // Flip non-container tiles on double-click
        toggleFlip(tile.id);
      }
    },
    [tile.id, isContainer, isDetached, snapToGrid, drillDown, toggleFlip],
  );

  // Card surface color
  const cardColor = isContainer ? '#f8f9fc' : '#ffffff';
  const cardOpacity = isContainer ? 0.85 : 1.0;

  // HTML sizing: distanceFactor controls how large CSS pixels appear in 3D.
  // At distanceFactor=1.5, `width` CSS px ≈ card width in world space.
  // We use a higher distanceFactor for readable text, and scale CSS dims
  // inversely so the HTML still fits within the card boundaries.
  const distFactor = 3;
  // Empirically tuned: 0.5 only fills ~60% of card; 0.8 fills ~90%.
  const cssScale = 0.8;
  const cssW = Math.round(width * cssScale);
  const cssH = Math.round(height * cssScale);

  return (
    <group ref={posGroupRef} position={currentPos}>
      {/* Lay flat on XZ plane */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {/* Flip animation */}
        <group ref={groupRef}>

          {/* === Card body — thin rounded rectangle === */}
          <RoundedBox
            args={[w, h, TILE_DEPTH]}
            radius={CORNER_RADIUS}
            smoothness={4}
            castShadow
            receiveShadow
            onPointerDown={handlePointerDown}
            onDoubleClick={handleDoubleClick}
            onPointerEnter={(e) => {
              e.stopPropagation();
              setHovered(tile.id);
              gl.domElement.style.cursor = isContainer ? 'pointer' : 'grab';
            }}
            onPointerLeave={(e) => {
              e.stopPropagation();
              setHovered(null);
              gl.domElement.style.cursor = 'auto';
            }}
          >
            <meshPhysicalMaterial
              color={cardColor}
              transparent={isContainer}
              opacity={cardOpacity}
              roughness={0.35}
              metalness={0.0}
              clearcoat={0.1}
              clearcoatRoughness={0.4}
            />
          </RoundedBox>

          {/* Selection outline */}
          {isSelected && (
            <mesh>
              <boxGeometry args={[w + 0.04, h + 0.04, TILE_DEPTH + 0.01]} />
              <meshBasicMaterial
                color={accentColor}
                transparent
                opacity={0.15}
                side={THREE.BackSide}
              />
            </mesh>
          )}

          {/* Thin accent stripe along the left edge */}
          <mesh
            position={[-w / 2 + 0.015, 0, TILE_DEPTH / 2 + 0.001]}
          >
            <planeGeometry args={[0.03, h - 0.02]} />
            <meshBasicMaterial
              color={accentColor}
              transparent
              opacity={isContainer ? 0.4 : 0.7}
            />
          </mesh>

          {/* Container badge — small dot indicator */}
          {isContainer && !isFlipped && (
            <mesh position={[w / 2 - 0.08, h / 2 - 0.08, TILE_DEPTH / 2 + 0.002]}>
              <circleGeometry args={[0.04, 16]} />
              <meshBasicMaterial color={accentColor} transparent opacity={0.5} />
            </mesh>
          )}

          {/* Front face HTML content — only visible when NOT flipped */}
          {!isFlipped && (
            <Html
              position={[0, 0, TILE_DEPTH / 2 + 0.002]}
              transform
              distanceFactor={distFactor}
              style={{
                width: `${cssW}px`,
                height: `${cssH}px`,
                pointerEvents: 'none',
                userSelect: 'none',
                overflow: 'hidden',
              }}
              className="tile-3d-html"
            >
              <div
                className="tile-3d-content"
                style={{
                  width: `${cssW}px`,
                  height: `${cssH}px`,
                  overflow: 'hidden',
                  padding: tile.type === 'raster' ? '2px' : '4px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: '12px',
                  color: '#1a1a2e',
                  lineHeight: '1.3',
                  overflowWrap: 'break-word',
                  hyphens: 'auto',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                }}
              >
                <TileContent tile={tile} />
              </div>
            </Html>
          )}

          {/* Back face HTML content — only visible when flipped */}
          {isFlipped && (
            <Html
              position={[0, 0, -(TILE_DEPTH / 2 + 0.002)]}
              transform
              rotation={[0, Math.PI, 0]}
              distanceFactor={distFactor}
              style={{
                width: `${cssW}px`,
                height: `${cssH}px`,
                pointerEvents: 'none',
                userSelect: 'none',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${cssW}px`,
                  height: `${cssH}px`,
                  background: `linear-gradient(135deg, ${accentColor} 0%, ${shiftColor(accentColor, -30)} 100%)`,
                  borderRadius: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  color: 'white',
                  padding: '6px',
                  WebkitFontSmoothing: 'antialiased',
                }}
              >
                <span style={{ fontSize: '10px', letterSpacing: '0.1em', opacity: 0.7, fontWeight: 600 }}>
                  {tile.type.toUpperCase()}
                </span>
                {tile.label && (
                  <span style={{ fontSize: '13px', fontWeight: 600, textAlign: 'center', overflowWrap: 'break-word' }}>
                    {tile.label}
                  </span>
                )}
                <span style={{ fontSize: '9px', opacity: 0.5, marginTop: '2px' }}>
                  Double-click to flip back
                </span>
              </div>
            </Html>
          )}

          {/* Detached indicator — floating glow */}
          {isDetached && (
            <pointLight
              position={[0, -h / 2 - 0.1, 0]}
              intensity={0.3}
              distance={2}
              color="#4a7cff"
            />
          )}

        </group>{/* end flip group */}
      </group>{/* end lay-flat group */}
    </group>
  );
}

/**
 * Shift a hex color lighter or darker by an amount.
 */
function shiftColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Renders the content of a tile based on its type.
 */
function TileContent({ tile }: { tile: TileType }) {
  switch (tile.type) {
    case 'text':
      return (
        <div>
          {'content' in tile && (tile.content as { heading?: string }).heading && (
            <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 3px 0', lineHeight: 1.2 }}>
              {(tile.content as { heading?: string }).heading}
            </h3>
          )}
          {'content' in tile && (tile.content as { body?: string }).body && (
            <p style={{ margin: 0, fontSize: '11px', opacity: 0.75, lineHeight: 1.3 }}>
              {(tile.content as { body?: string }).body}
            </p>
          )}
        </div>
      );
    case 'vector':
      if ('content' in tile && (tile.content as { svgContent?: string }).svgContent) {
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: (tile.content as { fillColor?: string }).fillColor || '#333',
            }}
            dangerouslySetInnerHTML={{
              __html: `<svg viewBox="${(tile.content as { viewBox?: string }).viewBox || '0 0 24 24'}" width="32" height="32" fill="currentColor">${(tile.content as { svgContent: string }).svgContent}</svg>`,
            }}
          />
        );
      }
      return null;
    case 'raster':
      if ('content' in tile && (tile.content as { src?: string }).src) {
        return (
          <img
            src={(tile.content as { src: string; alt: string }).src}
            alt={(tile.content as { src: string; alt: string }).alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '2px',
              imageRendering: 'auto',
            }}
          />
        );
      }
      return null;
    case 'container':
      return (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: '6px',
          padding: '8px',
          overflowWrap: 'break-word',
        }}>
          {/* Folder icon hint */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span style={{
            fontSize: '27px',
            fontWeight: 700,
            color: '#3a3a5c',
            letterSpacing: '-0.02em',
          }}>
            {tile.label}
          </span>
          <span style={{
            fontSize: '10px',
            opacity: 0.35,
            fontWeight: 400,
            color: '#6b7280',
          }}>
            Double-click to open
          </span>
        </div>
      );
    default:
      return null;
  }
}
