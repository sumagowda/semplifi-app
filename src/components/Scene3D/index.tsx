'use client';

import { useEffect, useCallback, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  Environment,
  ContactShadows,
} from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { rootTiles, tileMap } from '@/data/herbs';
import { useNavigationStore } from '@/stores/useNavigationStore';
import TileGrid3D from '@/components/TileGrid3D';

/**
 * Scene3D — the main Three.js/R3F 3D workspace.
 *
 * Renders tiles as 3D card objects on a visible ground plane
 * with an angled camera to reveal depth and 3D structure.
 *
 * Supports drill-down: double-click a container to zoom into
 * its children. The camera animates smoothly to the new focus.
 */
export default function Scene3D() {
  const setShiftHeld = useNavigationStore((s) => s.setShiftHeld);
  const resetAll = useNavigationStore((s) => s.resetAll);
  const drillUp = useNavigationStore((s) => s.drillUp);
  const selectTile = useNavigationStore((s) => s.selectTile);

  // Track Shift key for Z-axis drag mode, Escape for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true);
      if (e.key === 'Escape') {
        const state = useNavigationStore.getState();
        if (state.navigationStack.length > 0) {
          // Go back one level
          drillUp();
        } else {
          // At root — reset everything
          resetAll();
        }
      }
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
  }, [setShiftHeld, resetAll, drillUp]);

  // Click on empty space to deselect
  const handleMissed = useCallback(() => {
    selectTile(null);
  }, [selectTile]);

  return (
    <div style={{ width: '100%', height: '100%', background: '#ebeef3', position: 'relative' }}>
      <Canvas
        camera={{
          // Angled 3/4 view — looking down and to the side
          position: [7, 6, 10],
          fov: 45,
          near: 0.1,
          far: 200,
        }}
        dpr={[1, 2]}
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

        {/* Camera controls — handles orbit, pan, zoom, and drill-down animation */}
        <CameraControls />

        {/* Ground plane — recessive floor (Gestalt: Figure-Ground) */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -4, 0]}
          receiveShadow
        >
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial
            color="#e8e8ee"
            roughness={0.95}
            metalness={0.0}
          />
        </mesh>

        {/* Contact shadows — stronger for better figure-ground separation */}
        <ContactShadows
          position={[0, -3.99, 0]}
          opacity={0.45}
          scale={30}
          blur={2}
          far={10}
          color="#2d3748"
        />

        {/* Reference grid — subtle, recessive (Gestalt: Figure-Ground) */}
        <Grid
          position={[0, -3.98, 0]}
          args={[50, 50]}
          cellSize={1}
          cellThickness={0.4}
          cellColor="#d8dce4"
          sectionSize={5}
          sectionThickness={0.8}
          sectionColor="#c4c8d4"
          fadeDistance={25}
          fadeStrength={2}
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

/** Default camera position (root level) */
const DEFAULT_CAM_POS = new THREE.Vector3(7, 6, 10);
const DEFAULT_CAM_TARGET = new THREE.Vector3(0, 0, 0);

/** Drill-down camera position (closer, tighter view) */
const DRILLDOWN_CAM_POS = new THREE.Vector3(5, 4.5, 7);
const DRILLDOWN_CAM_TARGET = new THREE.Vector3(0, 0, 0);

/** Animation duration in seconds */
const ANIM_DURATION = 0.8;

/**
 * Smooth ease-out cubic: fast start, gentle deceleration.
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Camera orbit/pan/zoom controls with drill-down animation.
 *
 * When focusedContainerId changes, the camera smoothly
 * animates to a new position with ease-out timing.
 */
function CameraControls() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const isTileDragging = useNavigationStore((s) => s.isTileDragging);
  const focusedContainerId = useNavigationStore((s) => s.focusedContainerId);

  // Animation state
  const isAnimating = useRef(false);
  const animProgress = useRef(0);
  const startPosition = useRef(DEFAULT_CAM_POS.clone());
  const startTarget = useRef(DEFAULT_CAM_TARGET.clone());
  const endPosition = useRef(DEFAULT_CAM_POS.clone());
  const endTarget = useRef(DEFAULT_CAM_TARGET.clone());

  // Disable orbit controls when a tile is being dragged
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = !isTileDragging;
    }
  }, [isTileDragging]);

  // When focus changes, set up the animation
  useEffect(() => {
    if (!controlsRef.current) return;

    const camera = controlsRef.current.object;
    const controls = controlsRef.current;

    // Capture current camera state as animation start
    startPosition.current.copy(camera.position);
    startTarget.current.copy(controls.target);

    if (!focusedContainerId) {
      // Return to default view
      endPosition.current.copy(DEFAULT_CAM_POS);
      endTarget.current.copy(DEFAULT_CAM_TARGET);
    } else {
      // Zoom into the children grid (re-laid at origin)
      endPosition.current.copy(DRILLDOWN_CAM_POS);
      endTarget.current.copy(DRILLDOWN_CAM_TARGET);
    }

    // Start animation
    animProgress.current = 0;
    isAnimating.current = true;
  }, [focusedContainerId]);

  // Smooth time-based camera animation each frame
  useFrame((_, delta) => {
    if (!isAnimating.current || !controlsRef.current) return;

    const camera = controlsRef.current.object;
    const controls = controlsRef.current;

    // Advance progress (clamp to 1.0)
    animProgress.current = Math.min(1, animProgress.current + delta / ANIM_DURATION);
    const t = easeOutCubic(animProgress.current);

    // Interpolate position and target
    camera.position.lerpVectors(startPosition.current, endPosition.current, t);
    controls.target.lerpVectors(startTarget.current, endTarget.current, t);
    controls.update();

    // Done?
    if (animProgress.current >= 1) {
      isAnimating.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={50}
      target={[0, 0, 0]}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.PAN,
      }}
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
      enableRotate={true}
      maxPolarAngle={Math.PI * 0.48}
      minPolarAngle={0}
      panSpeed={0.8}
      rotateSpeed={0.6}
    />
  );
}

/**
 * Heads-up display with controls, status info, and breadcrumb navigation.
 */
function HUD() {
  const selectedTileId = useNavigationStore((s) => s.selectedTileId);
  const isShiftHeld = useNavigationStore((s) => s.isShiftHeld);
  const resetAll = useNavigationStore((s) => s.resetAll);
  const drillUp = useNavigationStore((s) => s.drillUp);
  const snapToGrid = useNavigationStore((s) => s.snapToGrid);
  const navigationStack = useNavigationStore((s) => s.navigationStack);
  const focusedContainerId = useNavigationStore((s) => s.focusedContainerId);
  const tileState = useNavigationStore((s) =>
    selectedTileId ? s.tileStates[selectedTileId] : null,
  );

  // Build breadcrumb labels
  const breadcrumbs = navigationStack.map((id) => {
    const tile = tileMap.get(id);
    return { id, label: tile?.label || id };
  });

  return (
    <>
      {/* Breadcrumb navigation — shows when drilled down */}
      {breadcrumbs.length > 0 && (
        <div className="scene3d-breadcrumb">
          <button
            className="scene3d-breadcrumb-item scene3d-breadcrumb-root"
            onClick={resetAll}
          >
            Root
          </button>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id} className="scene3d-breadcrumb-entry">
              <span className="scene3d-breadcrumb-sep">/</span>
              {i < breadcrumbs.length - 1 ? (
                <button
                  className="scene3d-breadcrumb-item"
                  onClick={() => {
                    // Navigate to this specific level
                    const state = useNavigationStore.getState();
                    const idx = state.navigationStack.indexOf(crumb.id);
                    if (idx >= 0) {
                      // Pop down to this level
                      useNavigationStore.setState({
                        navigationStack: state.navigationStack.slice(0, idx + 1),
                        focusedContainerId: crumb.id,
                        selectedTileId: null,
                      });
                    }
                  }}
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="scene3d-breadcrumb-current">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Controls legend — grouped by action type (Gestalt: Proximity) */}
      <div className="scene3d-legend">
        <div><strong>Controls</strong></div>
        <div className="scene3d-legend-group">
          <div className="scene3d-legend-label">Navigate</div>
          <div>Drag: Orbit</div>
          <div>Right-drag: Pan</div>
          <div>Scroll: Zoom</div>
        </div>
        <div className="scene3d-legend-group">
          <div className="scene3d-legend-label">Interact</div>
          <div>Click: Select</div>
          <div>Drag tile: Move</div>
          <div>Shift+drag: Z-axis</div>
        </div>
        <div className="scene3d-legend-group">
          <div className="scene3d-legend-label">Actions</div>
          <div>Dbl-click: Drill / Flip</div>
          <div>Esc: Back / Reset</div>
        </div>
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

      {/* Reset / Back button */}
      <div className="canvas-controls">
        {focusedContainerId && (
          <button
            className="canvas-control-btn"
            onClick={drillUp}
            title="Go back (Esc)"
          >
            Back
          </button>
        )}
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
