import { useCallback, useRef, useState } from "react";
import Poster from "./Poster";
import Whiteboard from "./Whiteboard";
import { INK, INK_FAINT } from "../theme";

// ---------------------------------------------------------------------------
// Paged frame: holds the full-screen pages side-by-side on a horizontal track
// and slides between them. Page switching is triggered by a horizontal swipe.
//
// On the poster (a static page) a swipe anywhere flips pages. On the whiteboard
// a one-finger drag is reserved for drawing, so page switches there only fire
// from the thin left/right EDGE_ZONE strips — keeping draw and swipe separate.
// ---------------------------------------------------------------------------

const PAGES = 2;
const SWIPE_THRESHOLD = 60; // px of horizontal travel to commit a page change
const EDGE_ZONE = 24; // px from the screen edge that owns the whiteboard swipe

export default function Frame() {
  const [page, setPage] = useState(0);
  const startRef = useRef<{ id: number; x: number; y: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const s = startRef.current;
    startRef.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      const dir = dx < 0 ? 1 : -1; // swipe left → next page, right → previous
      // Wrap around so paging is infinite: past the last page loops to the
      // first, and before the first loops to the last.
      setPage((p) => (p + dir + PAGES) % PAGES);
    }
  }, []);

  const swipeHandlers = {
    onPointerDown,
    onPointerUp,
    onPointerCancel: onPointerUp,
  };

  return (
    <div style={styles.viewport}>
      <div
        style={{
          ...styles.track,
          transform: `translateX(${-page * 100}vw)`,
        }}
      >
        {/* Page 0 — poster. Swipe anywhere flips pages. */}
        <div style={styles.panel} {...swipeHandlers}>
          <Poster />
        </div>

        {/* Page 1 — whiteboard. Only the edge strips own the swipe gesture. */}
        <div style={styles.panel}>
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
            onClick={() => setPage(i)}
            style={{
              ...styles.dash,
              width: i === page ? "28px" : "16px",
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
    display: "flex",
    width: `${PAGES * 100}vw`,
    height: "100vh",
    transition: "transform 320ms ease",
    willChange: "transform",
  },
  panel: {
    position: "relative",
    flex: "0 0 100vw",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
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
    gap: "10px",
  },
  dash: {
    height: "3px",
    borderRadius: "2px",
    border: "none",
    padding: 0,
    cursor: "pointer",
    transition: "width 160ms ease, background 160ms ease",
  },
};
