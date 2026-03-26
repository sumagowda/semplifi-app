'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { Tile as TileType } from '@/types/tile';
import { useNavigationStore } from '@/stores/useNavigationStore';

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
 *   - Double-click detached tile: snap back to grid
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

  // Pointer down — start potential drag
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

  // Pointer move/up — drag tile or click
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
      const moveFactor = 0.01;

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
      if (!hasDragged.current) {
        toggleFlip(tile.id);
      }
      dragStart.current = null;
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isDragging, tile.id, setTilePosition, toggleFlip, setTileDragging]);

  // Double-click: containers → drill down, detached tiles → snap back
  const handleDoubleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (isContainer) {
        drillDown(tile.id);
      } else if (isDetached) {
        snapToGrid(tile.id);
      }
    },
    [tile.id, isContainer, isDetached, snapToGrid, drillDown],
  );

  // Card surface color
  const cardColor = isContainer ? '#f8f9fc' : '#ffffff';
  const cardOpacity = isContainer ? 0.85 : 1.0;

  // HTML content scale — render at 2x for retina-sharp text
  const htmlScale = 2;

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
              distanceFactor={0.72}
              style={{
                width: `${width * htmlScale}px`,
                height: `${height * htmlScale}px`,
                transform: `scale(${1 / htmlScale})`,
                transformOrigin: 'center center',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
              className="tile-3d-html"
            >
              <div
                className="tile-3d-content"
                style={{
                  width: `${width * htmlScale}px`,
                  height: `${height * htmlScale}px`,
                  overflow: 'hidden',
                  padding: tile.type === 'text'
                    ? `${16}px`
                    : tile.type === 'raster'
                      ? `${6}px`
                      : '0',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: `${26}px`,
                  color: '#1a1a2e',
                  lineHeight: '1.4',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                }}
              >
                <TileContent tile={tile} scale={htmlScale} />
              </div>
            </Html>
          )}

          {/* Back face HTML content — only visible when flipped */}
          {isFlipped && (
            <Html
              position={[0, 0, -(TILE_DEPTH / 2 + 0.002)]}
              transform
              rotation={[0, Math.PI, 0]}
              distanceFactor={0.72}
              style={{
                width: `${width * htmlScale}px`,
                height: `${height * htmlScale}px`,
                transform: `scale(${1 / htmlScale})`,
                transformOrigin: 'center center',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              <div
                style={{
                  width: `${width * htmlScale}px`,
                  height: `${height * htmlScale}px`,
                  background: `linear-gradient(135deg, ${accentColor} 0%, ${shiftColor(accentColor, -30)} 100%)`,
                  borderRadius: `${16}px`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: `${12}px`,
                  color: 'white',
                  padding: `${24}px`,
                  WebkitFontSmoothing: 'antialiased',
                }}
              >
                <span style={{ fontSize: `${20}px`, letterSpacing: '0.15em', opacity: 0.7, fontWeight: 600 }}>
                  {tile.type.toUpperCase()}
                </span>
                {tile.label && (
                  <span style={{ fontSize: `${26}px`, fontWeight: 600, textAlign: 'center' }}>
                    {tile.label}
                  </span>
                )}
                <span style={{ fontSize: `${18}px`, opacity: 0.5, marginTop: `${8}px` }}>
                  Click to flip back
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
 * Content is rendered at 2x scale for crisp retina text.
 */
function TileContent({ tile, scale }: { tile: TileType; scale: number }) {
  switch (tile.type) {
    case 'text':
      return (
        <div>
          {'content' in tile && (tile.content as { heading?: string }).heading && (
            <h3 style={{ fontSize: `${28}px`, fontWeight: 700, margin: `0 0 ${8}px 0` }}>
              {(tile.content as { heading?: string }).heading}
            </h3>
          )}
          {'content' in tile && (tile.content as { body?: string }).body && (
            <p style={{ margin: 0, fontSize: `${24}px`, opacity: 0.75, lineHeight: 1.45 }}>
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
              __html: `<svg viewBox="${(tile.content as { viewBox?: string }).viewBox || '0 0 24 24'}" width="${64 * scale}" height="${64 * scale}" fill="currentColor">${(tile.content as { svgContent: string }).svgContent}</svg>`,
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
              borderRadius: `${8}px`,
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
          fontSize: `${26}px`,
          fontWeight: 600,
          color: '#4a4a6a',
          textAlign: 'center',
          gap: `${8}px`,
        }}>
          <span>{tile.label}</span>
          <span style={{ fontSize: `${18}px`, opacity: 0.4, fontWeight: 400 }}>
            Double-click to open
          </span>
        </div>
      );
    default:
      return null;
  }
}
