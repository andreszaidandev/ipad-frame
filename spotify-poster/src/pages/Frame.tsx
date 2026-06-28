import { useCallback, useRef, useState } from "react";
import Poster from "./Poster";
import Whiteboard from "./Whiteboard";
import { INK, INK_FAINT } from "../theme";

// ---------------------------------------------------------------------------
// Paged frame: holds the full-screen pages and slides between them on a
// horizontal swipe. Page switching is triggered by a horizontal swipe.
//
// Both pages switch only from the thin left/right EDGE_ZONE strips. On the
// whiteboard a one-finger drag is reserved for drawing; the poster mirrors the
// same edge-only gesture so the two surfaces behave identically.
//
// Paging is INFINITE and always animates in the swipe direction. Rather than a
// fixed side-by-side track (which can't loop the last→first jump without
// sliding backwards), each panel is positioned independently and we keep a
// single, unbounded `index`. The page entering a transition is relocated — while
// off-screen, so the move is invisible — to the side it should slide in from,
// so wrapping looks identical to a normal step. Single component instances are
// preserved (no duplicated poster polling or whiteboard canvas).
// ---------------------------------------------------------------------------

const PAGES = 2;
const SWIPE_THRESHOLD = 60; // px of horizontal travel to commit a page change
const EDGE_ZONE = 24; // px from the screen edge that owns the whiteboard swipe

const mod = (n: number, m: number) => ((n % m) + m) % m;

interface View {
  index: number; // unbounded position of the centered page
  positions: number[]; // per-panel position (multiples of 100vw), index-congruent
}

export default function Frame() {
  const [view, setView] = useState<View>(() => ({
    index: 0,
    positions: Array.from({ length: PAGES }, (_, i) => i),
  }));
  const startRef = useRef<{ id: number; x: number; y: number } | null>(null);

  // Advance `index` by one step. The panel that becomes centered is placed
  // exactly at `newIndex` so it slides in from the correct side; the leaving
  // panel keeps its position and slides out. Because the entering panel is
  // always off-screen beforehand, relocating it never causes a visible jump.
  const navigate = useCallback((dir: number) => {
    setView((v) => {
      const newIndex = v.index + dir;
      const positions = v.positions.slice();
      positions[mod(newIndex, PAGES)] = newIndex;
      return { index: newIndex, positions };
    });
  }, []);

  // Jump straight to a page (dash taps), taking the shortest way round the loop.
  const goTo = useCallback(
    (targetPage: number) => {
      setView((v) => {
        const cur = mod(v.index, PAGES);
        if (cur === targetPage) return v;
        let d = mod(targetPage - cur, PAGES);
        if (d > PAGES / 2) d -= PAGES; // take the shorter direction
        const newIndex = v.index + d;
        const positions = v.positions.slice();
        positions[targetPage] = newIndex;
        return { index: newIndex, positions };
      });
    },
    []
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const s = startRef.current;
      startRef.current = null;
      if (!s || s.id !== e.pointerId) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
        navigate(dx < 0 ? 1 : -1); // swipe left → next page, right → previous
      }
    },
    [navigate]
  );

  const swipeHandlers = {
    onPointerDown,
    onPointerUp,
    onPointerCancel: onPointerUp,
  };

  const page = mod(view.index, PAGES);

  return (
    <div style={styles.viewport}>
      <div
        style={{
          ...styles.track,
          transform: `translateX(${-view.index * 100}vw)`,
        }}
      >
        {/* Page 0 — poster. Only the edge strips own the swipe gesture. */}
        <div
          style={{
            ...styles.panel,
            transform: `translateX(${view.positions[0] * 100}vw)`,
          }}
        >
          <Poster />
          <div style={{ ...styles.edge, left: 0 }} {...swipeHandlers} />
          <div style={{ ...styles.edge, right: 0 }} {...swipeHandlers} />
        </div>

        {/* Page 1 — whiteboard. Only the edge strips own the swipe gesture. */}
        <div
          style={{
            ...styles.panel,
            transform: `translateX(${view.positions[1] * 100}vw)`,
          }}
        >
          <Whiteboard />
          <div style={{ ...styles.edge, left: 0 }} {...swipeHandlers} />
          <div style={{ ...styles.edge, right: 0 }} {...swipeHandlers} />
        </div>
      </div>

      {/* Page indicator dashes (also a non-touch fallback to switch pages). */}
      <div style={styles.dots}>
        {Array.from({ length: PAGES }, (_, i) => (
          <button
            key={i}
            aria-label={`Go to page ${i + 1}`}
            onClick={() => goTo(i)}
            style={{
              ...styles.dash,
              width: i === page ? "16px" : "9px",
              background: i === page ? INK : INK_FAINT,
            }}
          />
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  viewport: {
    position: "fixed",
    inset: 0,
    overflow: "hidden",
    background: "#0a0a0a",
  },
  track: {
    position: "absolute",
    inset: 0,
    transition: "transform 320ms ease",
    willChange: "transform",
  },
  panel: {
    // Each panel is stacked at the origin and offset via its own transform, so
    // panels can be repositioned around the loop independently of the track.
    position: "absolute",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    // No transition here on purpose: panel relocations must be instant so the
    // off-screen "teleport" for wrapping is never animated/visible.
  },
  edge: {
    position: "absolute",
    top: 0,
    width: `${EDGE_ZONE}px`,
    height: "100%",
    zIndex: 10, // above the whiteboard canvas and its toolbar
    touchAction: "none",
  },
  dots: {
    position: "fixed",
    bottom: "18px",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 20,
    display: "flex",
    gap: "8px",
  },
  dash: {
    height: "2px",
    borderRadius: "1px",
    border: "none",
    padding: 0,
    cursor: "pointer",
    transition: "width 160ms ease, background 160ms ease",
  },
};
