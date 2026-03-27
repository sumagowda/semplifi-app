'use client';

import { useState } from 'react';
import Scene3D from '@/components/Scene3D';

/**
 * Root page — renders the Semplifi product shell:
 * - Top header with logo (Gestalt: Continuity — logo aligns with sidebar column)
 * - Left sidebar with grouped feature placeholders (Gestalt: Proximity — grouped by function)
 * - Main 3D canvas workspace (Gestalt: Figure-Ground — recessive background)
 *
 * Gestalt principles applied:
 * - Proximity: sidebar items grouped by function with separators
 * - Similarity: consistent icon sizing, padding, typography, color treatment
 * - Continuity: header logo column aligns with sidebar icon column
 * - Figure-Ground: stronger border/shadow separates shell from canvas workspace
 * - Common Region: group labels + subtle dividers define sidebar sections
 * - Uniform Connectedness: header and sidebar share the same background tone
 */

/* ─── Sidebar section definitions (Gestalt: Proximity) ─── */
const SIDEBAR_SECTIONS = [
  {
    id: 'workspace',
    label: 'Workspace',
    items: [
      {
        id: 'canvas',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 3v18" />
          </svg>
        ),
        label: 'Canvas',
        hint: 'Workspace view',
      },
      {
        id: 'layers',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
          </svg>
        ),
        label: 'Layers',
        hint: 'Depth & layer management',
      },
    ],
  },
  {
    id: 'playback',
    label: 'Playback',
    items: [
      {
        id: 'animation',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ),
        label: 'Animation',
        hint: 'Timeline & keyframes',
      },
      {
        id: 'speed',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        ),
        label: 'Speed',
        hint: 'Custom playback speed',
      },
    ],
  },
  {
    id: 'collaborate',
    label: 'Collaborate',
    items: [
      {
        id: 'share',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        ),
        label: 'Share',
        hint: 'Generate shareable link',
      },
      {
        id: 'export',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        ),
        label: 'Export',
        hint: 'Export presentation',
      },
    ],
  },
];

const HEADER_HEIGHT = 48;
const SIDEBAR_WIDTH_COLLAPSED = 52;
const SIDEBAR_WIDTH_EXPANDED = 200;

/**
 * Shared shell background — header and sidebar use the same tone
 * (Gestalt: Uniform Connectedness — connected surfaces perceived as one unit).
 */
const SHELL_BG = '#ffffff';
const SHELL_BORDER = 'rgba(0, 0, 0, 0.10)';

/**
 * The left padding for the logo area in the header matches the sidebar
 * icon column center so the eye flows vertically from logo → icons
 * (Gestalt: Continuity).
 *
 * Sidebar collapsed = 52px, icon centered at 26px.
 * Header padding-left = 12px + 28px logo / 2 = 26px center. ✓
 */
const HEADER_PL = 12;

export default function Home() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [activeItem, setActiveItem] = useState('canvas');

  return (
    <main className="h-full" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* ── Header ─────────────────────────────────────── */}
      <header
        style={{
          height: HEADER_HEIGHT,
          minHeight: HEADER_HEIGHT,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: HEADER_PL,
          paddingRight: 16,
          background: SHELL_BG,
          borderBottom: `1px solid ${SHELL_BORDER}`,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          zIndex: 400,
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
        }}
      >
        {/* Logo group (Gestalt: Proximity — mark + wordmark + badge are a single unit) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Logo mark */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: 'linear-gradient(135deg, #4a7cff 0%, #6c63ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: '-0.02em',
              boxShadow: '0 1px 4px rgba(74,124,255,0.25)',
              flexShrink: 0,
            }}
          >
            S
          </div>
          <span
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: '#1a1a2e',
              letterSpacing: '-0.01em',
            }}
          >
            Semplifi
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: '#9ca3af',
              background: 'rgba(0,0,0,0.04)',
              padding: '2px 7px',
              borderRadius: 4,
            }}
          >
            beta
          </span>
        </div>

        {/* Right side — project + user (Gestalt: Proximity — grouped as status cluster) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Project name chip (Gestalt: Similarity — same badge style as "beta") */}
          <span
            style={{
              fontSize: 11,
              color: '#6b7280',
              fontWeight: 500,
              background: 'rgba(0,0,0,0.03)',
              padding: '3px 10px',
              borderRadius: 6,
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            Herb Garden Demo
          </span>
          {/* User avatar (Gestalt: Similarity — same 28px as logo mark) */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
              color: '#4a7cff',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            U
          </div>
        </div>
      </header>

      {/* ── Body: Sidebar + Canvas ──────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <nav
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
          style={{
            width: sidebarExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED,
            minWidth: sidebarExpanded ? SIDEBAR_WIDTH_EXPANDED : SIDEBAR_WIDTH_COLLAPSED,
            height: '100%',
            /* Uniform Connectedness: same background as header */
            background: SHELL_BG,
            /* Figure-Ground: slightly stronger border + shadow against canvas */
            borderRight: `1px solid ${SHELL_BORDER}`,
            boxShadow: '1px 0 4px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            paddingTop: 6,
            transition: 'width 0.2s ease, min-width 0.2s ease',
            overflow: 'hidden',
            zIndex: 350,
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
          }}
        >
          {/* Sidebar sections (Gestalt: Proximity — items grouped by function) */}
          {SIDEBAR_SECTIONS.map((section, sectionIdx) => (
            <div key={section.id}>
              {/* Section divider (Gestalt: Common Region — boundary between groups) */}
              {sectionIdx > 0 && (
                <div
                  style={{
                    height: 1,
                    background: 'rgba(0, 0, 0, 0.06)',
                    margin: '6px 12px',
                  }}
                />
              )}

              {/* Section label — visible on expand (Gestalt: Common Region — named boundary) */}
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: '#b0b5c0',
                  padding: '6px 17px 2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  opacity: sidebarExpanded ? 1 : 0,
                  height: sidebarExpanded ? 20 : 0,
                  transition: 'opacity 0.15s ease, height 0.2s ease',
                }}
              >
                {section.label}
              </div>

              {/* Items within this section */}
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveItem(item.id)}
                  title={item.hint}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    /* Similarity: uniform 10px vertical + 14px horizontal padding */
                    padding: '9px 14px',
                    background: activeItem === item.id
                      ? 'rgba(74, 124, 255, 0.07)'
                      : 'transparent',
                    border: 'none',
                    /* Continuity: 3px accent stripe on active creates vertical flow */
                    borderLeft: activeItem === item.id
                      ? '3px solid #4a7cff'
                      : '3px solid transparent',
                    color: activeItem === item.id ? '#4a7cff' : '#6b7280',
                    cursor: 'pointer',
                    /* Similarity: 13px / weight 500 (active 600) across all items */
                    fontSize: 13,
                    fontWeight: activeItem === item.id ? 600 : 500,
                    transition: 'background 0.15s ease, color 0.15s ease',
                    whiteSpace: 'nowrap',
                    textAlign: 'left',
                  }}
                >
                  {/* Similarity: all icons 18x18, same stroke weight, centered in 24px box */}
                  <span
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                    }}
                  >
                    {item.icon}
                  </span>
                  <span
                    style={{
                      opacity: sidebarExpanded ? 1 : 0,
                      transition: 'opacity 0.15s ease',
                      overflow: 'hidden',
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          ))}

          {/* Bottom spacer + version (Gestalt: Proximity — separated from nav items) */}
          <div style={{ flex: 1 }} />
          <div
            style={{
              padding: '12px 17px',
              fontSize: 10,
              color: '#c4c8d4',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              opacity: sidebarExpanded ? 1 : 0,
              transition: 'opacity 0.15s ease',
              borderTop: '1px solid rgba(0, 0, 0, 0.05)',
            }}
          >
            v0.1.0 Preview
          </div>
        </nav>

        {/* ── Canvas workspace (Gestalt: Figure-Ground — recessive background) ── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Scene3D />
        </div>
      </div>
    </main>
  );
}
