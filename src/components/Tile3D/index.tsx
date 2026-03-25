'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
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

/** Tile thickness — chunky enough to clearly look 3D */
const TILE_DEPTH = 0.25;

/** Type-based color scheme for tile sides */
const TYPE_COLORS: Record<string, { top: string; side: string; bottom: string }> = {
  text: { top: '#ffffff', side: '#6366f1', bottom: '#e0e0e8' },
  raster: { top: '#ffffff', side: '#f59e0b', bottom: '#e0e0e8' },
  vector: { top: '#ffffff', side: '#10b981', bottom: '#e0e0e8' },
  container: { top: '#f0f2f8', side: '#8b5cf6', bottom: '#d8dae4' },
};

/**
 * A single tile rendered as a solid 3D box in the Three.js scene.
 *
 * Each tile is a thick box with:
 *   - White/light top face with HTML content
 *   - Colored side walls (color-coded by tile type)
 *   - Darker bottom face
 *   - Rounded corners and physical material
 *
 * Interactions:
 *   - Click: select tile
 *   - Drag: move X/Y (or Shift+drag for Z)
 *   - Double-click container: drill down into children
 *   - Double-click detached tile: snap back to grid
 */
export default function Tile3D({ tile, position, width, height }: Tile3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
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
  const targetLift = isSelected ? 0.2 : isHovered ? 0.1 : 0;
  const liftRef = useRef(0);

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

  // Color scheme based on tile type
  const colors = TYPE_COLORS[tile.type] || TYPE_COLORS.text;
  const topColor = isSelected ? '#ffffff' : isHovered ? '#fafbfd' : colors.top;
  const sideColor = isSelected ? '#4a7cff' : isHovered ? colors.side : colors.side;
  const bottomColor = colors.bottom;
  const meshOpacity = isContainer ? 0.5 : 1.0;

  return (
    <group ref={posGroupRef} position={currentPos}>
      {/* Lay flat on XZ plane */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {/* Flip animation */}
        <group ref={groupRef}>

          {/* === TOP FACE — white card surface === */}
          <mesh
            position={[0, 0, TILE_DEPTH / 2]}
            castShadow
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
            <planeGeometry args={[w, h]} />
            <meshPhysicalMaterial
              color={topColor}
              transparent={isContainer}
              opacity={meshOpacity}
              roughness={0.3}
              metalness={0.0}
              clearcoat={0.15}
              clearcoatRoughness={0.3}
            />
          </mesh>

          {/* === BOTTOM FACE — darker underside === */}
          <mesh position={[0, 0, -TILE_DEPTH / 2]} rotation={[Math.PI, 0, 0]}>
            <planeGeometry args={[w, h]} />
            <meshStandardMaterial
              color={bottomColor}
              transparent={isContainer}
              opacity={meshOpacity}
              roughness={0.8}
            />
          </mesh>

          {/* === SIDE WALLS — colored edges (4 sides) === */}
          {/* Left side */}
          <mesh position={[-w / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} castShadow>
            <planeGeometry args={[TILE_DEPTH, h]} />
            <meshStandardMaterial
              color={sideColor}
              transparent={isContainer}
              opacity={isContainer ? 0.4 : 0.85}
              roughness={0.5}
            />
          </mesh>
          {/* Right side */}
          <mesh position={[w / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <planeGeometry args={[TILE_DEPTH, h]} />
            <meshStandardMaterial
              color={sideColor}
              transparent={isContainer}
              opacity={isContainer ? 0.4 : 0.85}
              roughness={0.5}
            />
          </mesh>
          {/* Front side */}
          <mesh position={[0, -h / 2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <planeGeometry args={[w, TILE_DEPTH]} />
            <meshStandardMaterial
              color={sideColor}
              transparent={isContainer}
              opacity={isContainer ? 0.4 : 0.85}
              roughness={0.5}
            />
          </mesh>
          {/* Back side */}
          <mesh position={[0, h / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
            <planeGeometry args={[w, TILE_DEPTH]} />
            <meshStandardMaterial
              color={sideColor}
              transparent={isContainer}
              opacity={isContainer ? 0.4 : 0.85}
              roughness={0.5}
            />
          </mesh>

          {/* Selection glow ring */}
          {isSelected && (
            <mesh>
              <boxGeometry args={[w + 0.06, h + 0.06, TILE_DEPTH + 0.02]} />
              <meshBasicMaterial
                color="#4a7cff"
                transparent
                opacity={0.12}
                side={THREE.BackSide}
              />
            </mesh>
          )}

          {/* Container icon indicator — show it has children */}
          {isContainer && !isFlipped && (
            <mesh position={[w / 2 - 0.12, h / 2 - 0.12, TILE_DEPTH / 2 + 0.003]}>
              <circleGeometry args={[0.06, 16]} />
              <meshBasicMaterial color={colors.side} transparent opacity={0.6} />
            </mesh>
          )}

          {/* Front face HTML content — only visible when NOT flipped */}
          {!isFlipped && (
            <Html
              position={[0, 0, TILE_DEPTH / 2 + 0.003]}
              transform
              distanceFactor={1.5}
              style={{
                width: `${width}px`,
                height: `${height}px`,
                pointerEvents: 'none',
                userSelect: 'none',
              }}
              className="tile-3d-html"
            >
              <div
                className="tile-3d-content"
                style={{
                  width: `${width}px`,
                  height: `${height}px`,
                  overflow: 'hidden',
                  padding: tile.type === 'text' ? '8px' : tile.type === 'raster' ? '3px' : '0',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: '13px',
                  color: '#1a1a2e',
                  lineHeight: '1.4',
                }}
              >
                <TileContent tile={tile} />
              </div>
            </Html>
          )}

          {/* Back face HTML content — only visible when flipped */}
          {isFlipped && (
            <Html
              position={[0, 0, -(TILE_DEPTH / 2 + 0.003)]}
              transform
              rotation={[0, Math.PI, 0]}
              distanceFactor={1.5}
              style={{
                width: `${width}px`,
                height: `${height}px`,
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              <div
                style={{
                  width: `${width}px`,
                  height: `${height}px`,
                  background: `linear-gradient(135deg, ${colors.side} 0%, ${shiftColor(colors.side, -30)} 100%)`,
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  color: 'white',
                  padding: '12px',
                }}
              >
                <span style={{ fontSize: '10px', letterSpacing: '0.15em', opacity: 0.7, fontWeight: 600 }}>
                  {tile.type.toUpperCase()}
                </span>
                {tile.label && (
                  <span style={{ fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
                    {tile.label}
                  </span>
                )}
                <span style={{ fontSize: '9px', opacity: 0.5, marginTop: '4px' }}>
                  Click to flip back
                </span>
              </div>
            </Html>
          )}

          {/* Detached indicator — floating glow */}
          {isDetached && (
            <pointLight
              position={[0, -h / 2 - 0.1, 0]}
              intensity={0.5}
              distance={3}
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
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px 0' }}>
              {(tile.content as { heading?: string }).heading}
            </h3>
          )}
          {'content' in tile && (tile.content as { body?: string }).body && (
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
              {(tile.content as { body?: string }).body}
            </p>
          )}
        </div>
      );
    case 'vector':
      if ('content' in tile && (tile.content as { svgContent?: string }).svgContent) {
        return (
          <div
            style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            dangerouslySetInnerHTML={{ __html: (tile.content as { svgContent: string }).svgContent }}
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
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
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
          fontSize: '13px',
          fontWeight: 600,
          color: '#4a4a6a',
          textAlign: 'center',
          gap: '4px',
        }}>
          <span>{tile.label}</span>
          <span style={{ fontSize: '9px', opacity: 0.4, fontWeight: 400 }}>
            Double-click to open
          </span>
        </div>
      );
    default:
      return null;
  }
}
