import Canvas from '@/components/Canvas';

/**
 * Root page — renders the zoomable canvas with the culinary herbs demo.
 *
 * This is a server component that renders the Canvas client component.
 * The Canvas handles all interactive zoom/pan behavior client-side.
 */
export default function Home() {
  return (
    <main className="h-full">
      <Canvas />
    </main>
  );
}
