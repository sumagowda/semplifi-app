'use client';

import { useEffect, useCallback, Suspense, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  Environment,
  ContactShadows,
} from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { rootTiles } from '@/data/herbs';
import { useNavigationStore } from '@/stores/useNavigationStore';
import TileGrid3D from '@/components/TileGrid3D';

/**
 * Scene3D — the main Three.js/R3F 3D workspace.
 *
 * Renders tiles as 3D card objects on a visible ground plane
 * with an angled camera to reveal depth and 3D structure.
 *
 * The camera starts at a 3/4 angle looking down at the workspace,
 * giving an isometric-like view that clearly shows Z-depth.
 */
export default function Scene3D() {
  const setShiftHeld = useNavigationStore((s) => s.setShiftHeld);
  const resetAll = useNavigationStore((s) => s.resetAll);
  const selectTile = useNavigationStore((s) => s.selectTile);

  // Track Shift key for Z-axis drag mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true);
      if (e.key === 'Escape') resetAll();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setShiftHeld, resetAll]);

  // Click on empty space to deselect
  const handleMissed = useCallback(() => {
    selectTile(null);
  }, [selectTile]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#e8ecf0' }}>
      <Canvas
        camera={{
          // Angled 3/4 view — looking down and to the side
          // This reveals the Z-depth between tile layers
          position: [7, 6, 10],
          fov: 45,
          near: 0.1,
          far: 200,
        }}
        shadows="soft"
        onPointerMissed={handleMissed}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
      >
        {/* Environment lighting for realistic reflections and ambient */}
        <Environment preset="city" background={false} />

        {/* Key light — main directional light with shadows */}
        <directionalLight
          position={[8, 12, 8]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={60}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
          shadow-bias={-0.001}
          color="#fff8f0"
        />

        {/* Fill light — softer, from the opposite side */}
        <directionalLight
          position={[-5, 6, -3]}
          intensity={0.4}
          color="#e0e8ff"
        />

        {/* Ambient fill for shadow areas */}
        <ambientLight intensity={0.3} />

        {/* Hemisphere light for sky/ground color variation */}
        <hemisphereLight
          args={['#b1e1ff', '#b97a20', 0.25]}
        />

        {/* Camera controls — disabled while a tile is being dragged */}
        <CameraControls />

        {/* Ground plane — visible floor that receives shadows */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -4, 0]}
          receiveShadow
        >
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial
            color="#f0f0f4"
            roughness={0.9}
            metalness={0.0}
          />
        </mesh>

        {/* Contact shadows for soft, realistic shadow under tiles */}
        <ContactShadows
          position={[0, -3.99, 0]}
          opacity={0.35}
          scale={30}
          blur={2.5}
          far={10}
          color="#334155"
        />

        {/* Reference grid on the floor */}
        <Grid
          position={[0, -3.98, 0]}
          args={[50, 50]}
          cellSize={1}
          cellThickness={0.6}
          cellColor="#d0d4dc"
          sectionSize={5}
          sectionThickness={1.2}
          sectionColor="#b8bcc8"
          fadeDistance={30}
          fadeStrength={1.5}
          infiniteGrid
        />

        {/* Tiles — rendered as 3D objects above the ground plane */}
        <Suspense fallback={null}>
          <group position={[0, 0, 0]}>
            <TileGrid3D
              tiles={rootTiles}
              depth={0}
              offsetX={0}
              offsetY={0}
            />
          </group>
        </Suspense>
      </Canvas>

      {/* HUD overlay */}
      <HUD />
    </div>
  );
}

/**
 * Camera orbit/pan/zoom controls.
 *
 * Left-drag on empty space orbits the camera.
 * Right-drag or two-finger drag pans.
 * Scroll/pinch zooms.
 *
 * Controls are automatically disabled while a tile is being
 * dragged to prevent camera movement during tile manipulation.
 */
function CameraControls() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const isTileDragging = useNavigationStore((s) => s.isTileDragging);

  // Disable orbit controls when a tile is being dragged
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = !isTileDragging;
    }
  }, [isTileDragging]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={50}
      target={[0, 0, 0]}
      // Left-drag = orbit, right-drag = pan, middle = pan
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.PAN,
      }}
      // Touch: one finger = orbit, two fingers = pan + dolly (zoom)
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
      enableRotate={true}
      // Limit vertical angle (don't go fully underneath)
      maxPolarAngle={Math.PI * 0.48}
      minPolarAngle={Math.PI * 0.05}
      // Smoother pan
      panSpeed={0.8}
      rotateSpeed={0.6}
    />
  );
}

/**
 * Heads-up display with controls and status info.
 */
function HUD() {
  const selectedTileId = useNavigationStore((s) => s.selectedTileId);
  const isShiftHeld = useNavigationStore((s) => s.isShiftHeld);
  const resetAll = useNavigationStore((s) => s.resetAll);
  const snapToGrid = useNavigationStore((s) => s.snapToGrid);
  const tileState = useNavigationStore((s) =>
    selectedTileId ? s.tileStates[selectedTileId] : null,
  );

  return (
    <>
      {/* Controls legend */}
      <div className="scene3d-legend">
        <div><strong>Controls</strong></div>
        <div>Drag empty: Orbit</div>
        <div>Right-drag: Pan</div>
        <div>Scroll/Pinch: Zoom</div>
        <div>Click tile: Select & flip</div>
        <div>Drag tile: Move X/Y</div>
        <div>Shift+drag: Move Z</div>
        <div>Double-click: Snap back</div>
        <div>Esc: Reset all</div>
      </div>

      {/* Selected tile info */}
      {selectedTileId && tileState && (
        <div className="scene3d-info">
          <div><strong>Selected:</strong> {selectedTileId}</div>
          <div>
            Position: [{tileState.position.map((v) => v.toFixed(2)).join(', ')}]
          </div>
          <div>Detached: {tileState.isDetached ? 'Yes' : 'No'}</div>
          {tileState.isDetached && (
            <button
              className="scene3d-btn"
              onClick={() => snapToGrid(selectedTileId)}
            >
              Snap to Grid
            </button>
          )}
        </div>
      )}

      {/* Shift mode indicator */}
      {isShiftHeld && (
        <div className="scene3d-shift-indicator">
          Z-AXIS MODE
        </div>
      )}

      {/* Reset button */}
      <div className="canvas-controls">
        <button
          className="canvas-control-btn"
          onClick={resetAll}
          title="Reset all (Esc)"
        >
          Reset
        </button>
      </div>
    </>
  );
}
