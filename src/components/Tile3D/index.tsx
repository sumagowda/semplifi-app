'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
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

/** Tile thickness — thick enough to see from an angle */
const TILE_DEPTH = 0.12;

/** Corner radius for rounded box */
const CORNER_RADIUS = 0.04;

/**
 * A single tile rendered as a 3D card in the Three.js scene.
 *
 * Uses RoundedBox for a thick, physical card appearance with
 * visible edges and shadows. HTML content is projected onto
 * the front face via drei's <Html> component.
 */
export default function Tile3D({ tile, position, width, height }: Tile3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
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

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; pos: [number, number, number] } | null>(null);
  const hasDragged = useRef(false);

  const w = width * SCALE;
  const h = height * SCALE;

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

  // Outer group for position + hover lift
  const posGroupRef = useRef<THREE.Group>(null);

  // Hover lift — selected/hovered tiles float up slightly
  const targetLift = isSelected ? 0.15 : isHovered ? 0.08 : 0;
  const liftRef = useRef(0);

  // Animate flip rotation and hover lift smoothly
  useFrame(() => {
    // Flip rotation (on the inner group, which spins on its local Y)
    if (groupRef.current) {
      const currentRot = groupRef.current.rotation.y;
      const rotDiff = targetRotY - currentRot;
      if (Math.abs(rotDiff) > 0.001) {
        groupRef.current.rotation.y += rotDiff * 0.12;
      }
    }

    // Hover lift (on the outer positioning group, world Y = up)
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

  // Pointer move/up — drag tile in X/Y or Z
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
        // Z-axis movement (Shift+drag)
        const newZ = dragStart.current.pos[2] + dy * moveFactor;
        setTilePosition(tile.id, [
          dragStart.current.pos[0],
          dragStart.current.pos[1],
          newZ,
        ]);
      } else {
        // X/Y movement
        const newX = dragStart.current.pos[0] + dx * moveFactor;
        const newY = dragStart.current.pos[1] - dy * moveFactor;
        setTilePosition(tile.id, [
          newX,
          newY,
          dragStart.current.pos[2],
        ]);
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
  }, [isDragging, tile.id, setTilePosition, toggleFlip]);

  // Double-click to snap back to grid
  const handleDoubleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (isDetached) {
        snapToGrid(tile.id);
      }
    },
    [tile.id, isDetached, snapToGrid],
  );

  // Visual styling
  const isContainer = tile.type === 'container';

  // Front face color (white-ish card)
  const frontColor = isSelected
    ? '#ffffff'
    : isHovered
      ? '#fafbfc'
      : isContainer
        ? '#f0f2f6'
        : '#f8f9fb';

  // Side/edge color (darker to show 3D depth)
  const sideColor = isSelected
    ? '#4a7cff'
    : isDetached
      ? '#8b9aff'
      : isContainer
        ? '#c8cdd6'
        : '#d4d8e0';

  const meshOpacity = isContainer ? 0.4 : 1.0;

  return (
    <group
      ref={posGroupRef}
      position={currentPos}
    >
      {/* Middle group: lay the card flat on the XZ plane */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
      {/* Inner group: flip animation (rotation.y) */}
      <group ref={groupRef}>

      {/* 3D card body — RoundedBox for visible thickness */}
      <RoundedBox
        ref={meshRef}
        args={[w, h, TILE_DEPTH]}
        radius={CORNER_RADIUS}
        smoothness={4}
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHovered(tile.id);
          gl.domElement.style.cursor = 'grab';
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          setHovered(null);
          gl.domElement.style.cursor = 'auto';
        }}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial
          color={frontColor}
          transparent={isContainer}
          opacity={meshOpacity}
          depthWrite={!isContainer}
          roughness={0.35}
          metalness={0.0}
          clearcoat={0.1}
          clearcoatRoughness={0.4}
          side={THREE.DoubleSide}
        />
      </RoundedBox>

      {/* Side edge highlight — thin colored border around the tile edges */}
      <mesh castShadow>
        <boxGeometry args={[w + 0.02, h + 0.02, TILE_DEPTH + 0.005]} />
        <meshStandardMaterial
          color={sideColor}
          transparent
          opacity={isContainer ? 0.25 : 0.6}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Selection glow ring */}
      {isSelected && (
        <mesh>
          <boxGeometry args={[w + 0.06, h + 0.06, TILE_DEPTH + 0.01]} />
          <meshBasicMaterial
            color="#4a7cff"
            transparent
            opacity={0.15}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Front face HTML content — only visible when NOT flipped */}
      {!isFlipped && (
        <Html
          position={[0, 0, TILE_DEPTH / 2 + 0.002]}
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
          position={[0, 0, -(TILE_DEPTH / 2 + 0.002)]}
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
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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

      </group>{/* end inner flip group */}
      </group>{/* end middle lay-flat group */}
    </group>
  );
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
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          fontWeight: 600,
          color: '#4a4a6a',
          textAlign: 'center',
          background: 'rgba(0,0,0,0.03)',
          borderRadius: '6px',
        }}>
          {tile.label}
        </div>
      );
    default:
      return null;
  }
}
