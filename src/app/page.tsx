import Scene3D from '@/components/Scene3D';

/**
 * Root page — renders the 3D tile workspace with the culinary herbs demo.
 *
 * This is a server component that renders the Scene3D client component.
 * Scene3D uses Three.js/React Three Fiber for true 3D manipulation.
 */
export default function Home() {
  return (
    <main className="h-full">
      <Scene3D />
    </main>
  );
}
