import { useCallback, useEffect, useRef, useState } from "react";
import { INK, INK_DIM, INK_FAINT, STAGE_BG, FONT } from "../theme";
import ColorPicker from "../components/ColorPicker";

// ---------------------------------------------------------------------------
// Infinite whiteboard: a Canvas 2D surface with vector strokes stored in world
// coordinates and a movable/zoomable camera. Pen + eraser + hand (pan), plus a
// color palette, stroke widths, undo/redo, clear, and pinch/button zoom. State
// persists to localStorage so the board survives reloads and page switches.
// ---------------------------------------------------------------------------

type Tool = "pen" | "eraser" | "hand";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  tool: "pen" | "eraser";
  color: string;
  width: number;
  points: Point[];
}

interface Camera {
  x: number; // pan offset, CSS pixels
  y: number;
  scale: number;
}

const STORAGE_KEY = "whiteboard:v1";
const MAX_STROKES = 5000; // trim oldest beyond this to bound storage
const MIN_SCALE = 0.2;
const MAX_SCALE = 8;

// Palette tuned to sit on the dark stage alongside the off-white ink.
const PALETTE = [INK, "#9a9a93", "#e0564f", "#e0a94f", "#5fae7a", "#5a8fd6"];
const WIDTHS = [2, 6, 14];

interface PersistedState {
  strokes: Stroke[];
  camera: Camera;
}

function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!Array.isArray(parsed.strokes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function Whiteboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Rendering state lives in refs so pointer/animation paths never wait on a
  // React render. React state drives only the toolbar UI.
  const strokesRef = useRef<Stroke[]>([]);
  const redoRef = useRef<Stroke[]>([]);
  const cameraRef = useRef<Camera>({ x: 0, y: 0, scale: 1 });
  const activeRef = useRef<Stroke | null>(null);

  // Active gesture bookkeeping.
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const panStartRef = useRef<{ px: number; py: number; cam: Camera } | null>(null);
  const pinchRef = useRef<{ dist: number; mid: Point; cam: Camera } | null>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(INK);
  // Last color chosen from the custom picker, kept separate from the presets so
  // the picker swatch can show it and stay highlighted while it's the active ink.
  const [customColor, setCustomColor] = useState<string>("#c061cb");
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerWrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(WIDTHS[1]);
  // Mirror history sizes + zoom into state so the toolbar can react.
  const [hist, setHist] = useState({ undo: 0, redo: 0 });
  const [zoomPct, setZoomPct] = useState(100);

  const syncHist = useCallback(() => {
    setHist({ undo: strokesRef.current.length, redo: redoRef.current.length });
  }, []);

  // Close the color picker popover on a click/tap outside of it.
  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!pickerWrapRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [pickerOpen]);

  // --- Persistence (debounced) ------------------------------------------------
  const saveTimer = useRef<number | null>(null);
  const scheduleSave = useCallback(() => {
    if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      const data: PersistedState = {
        strokes: strokesRef.current,
        camera: cameraRef.current,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        // Storage full or unavailable — keep drawing, just don't persist.
      }
    }, 400);
  }, []);

  // --- Drawing ----------------------------------------------------------------
  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, s: Stroke) => {
    if (s.points.length === 0) return;
    ctx.globalCompositeOperation =
      s.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const p0 = s.points[0];
    ctx.moveTo(p0.x, p0.y);
    if (s.points.length === 1) {
      // A single tap renders as a dot.
      ctx.lineTo(p0.x + 0.01, p0.y);
    } else {
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
    }
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const cam = cameraRef.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(cam.scale * dpr, 0, 0, cam.scale * dpr, cam.x * dpr, cam.y * dpr);
    for (const s of strokesRef.current) drawStroke(ctx, s);
    if (activeRef.current) drawStroke(ctx, activeRef.current);
  }, [drawStroke]);

  // Draw just the latest segment of the active stroke on top of the existing
  // canvas — avoids a full redraw on every pointermove.
  const drawLastSegment = useCallback(() => {
    const s = activeRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!s || !canvas || !ctx || s.points.length < 2) return;
    const dpr = window.devicePixelRatio || 1;
    const cam = cameraRef.current;
    ctx.setTransform(cam.scale * dpr, 0, 0, cam.scale * dpr, cam.x * dpr, cam.y * dpr);
    ctx.globalCompositeOperation =
      s.tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const n = s.points.length;
    ctx.beginPath();
    ctx.moveTo(s.points[n - 2].x, s.points[n - 2].y);
    ctx.lineTo(s.points[n - 1].x, s.points[n - 1].y);
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }, []);

  // --- Coordinate helpers -----------------------------------------------------
  const canvasPoint = useCallback((e: { clientX: number; clientY: number }): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const screenToWorld = useCallback((sx: number, sy: number): Point => {
    const cam = cameraRef.current;
    return { x: (sx - cam.x) / cam.scale, y: (sy - cam.y) / cam.scale };
  }, []);

  // --- Camera ops -------------------------------------------------------------
  const applyZoom = useCallback(
    (factor: number, centerX: number, centerY: number) => {
      const cam = cameraRef.current;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, cam.scale * factor));
      const wx = (centerX - cam.x) / cam.scale;
      const wy = (centerY - cam.y) / cam.scale;
      cameraRef.current = {
        scale: next,
        x: centerX - wx * next,
        y: centerY - wy * next,
      };
      setZoomPct(Math.round(next * 100));
      redraw();
      scheduleSave();
    },
    [redraw, scheduleSave]
  );

  const zoomButton = useCallback(
    (factor: number) => {
      const el = containerRef.current;
      if (!el) return;
      applyZoom(factor, el.clientWidth / 2, el.clientHeight / 2);
    },
    [applyZoom]
  );

  const resetView = useCallback(() => {
    cameraRef.current = { x: 0, y: 0, scale: 1 };
    setZoomPct(100);
    redraw();
    scheduleSave();
  }, [redraw, scheduleSave]);

  // --- History ops ------------------------------------------------------------
  const undo = useCallback(() => {
    const s = strokesRef.current.pop();
    if (!s) return;
    redoRef.current.push(s);
    redraw();
    syncHist();
    scheduleSave();
  }, [redraw, syncHist, scheduleSave]);

  const redoOp = useCallback(() => {
    const s = redoRef.current.pop();
    if (!s) return;
    strokesRef.current.push(s);
    redraw();
    syncHist();
    scheduleSave();
  }, [redraw, syncHist, scheduleSave]);

  const clearAll = useCallback(() => {
    if (strokesRef.current.length === 0) return;
    if (!window.confirm("Clear the whole board?")) return;
    strokesRef.current = [];
    redoRef.current = [];
    redraw();
    syncHist();
    scheduleSave();
  }, [redraw, syncHist, scheduleSave]);

  // --- Pointer handling -------------------------------------------------------
  const endStroke = useCallback(() => {
    const s = activeRef.current;
    activeRef.current = null;
    if (!s) return;
    strokesRef.current.push(s);
    if (strokesRef.current.length > MAX_STROKES) {
      strokesRef.current.splice(0, strokesRef.current.length - MAX_STROKES);
    }
    redoRef.current = []; // a new stroke invalidates the redo branch
    redraw();
    syncHist();
    scheduleSave();
  }, [redraw, syncHist, scheduleSave]);

  const beginPinch = useCallback(() => {
    const pts = [...pointersRef.current.values()];
    if (pts.length < 2) return;
    // Drop any in-progress single-finger interaction.
    activeRef.current = null;
    panStartRef.current = null;
    const [a, b] = pts;
    pinchRef.current = {
      dist: Math.hypot(a.x - b.x, a.y - b.y),
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      cam: { ...cameraRef.current },
    };
    redraw();
  }, [redraw]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      (e.target as Element).setPointerCapture(e.pointerId);
      const p = canvasPoint(e);
      pointersRef.current.set(e.pointerId, p);

      if (pointersRef.current.size === 2) {
        beginPinch();
        return;
      }
      if (pointersRef.current.size > 2) return;

      if (tool === "hand") {
        panStartRef.current = { px: p.x, py: p.y, cam: { ...cameraRef.current } };
      } else {
        const w = screenToWorld(p.x, p.y);
        activeRef.current = { tool, color, width, points: [w] };
        redraw(); // render the initial dot
      }
    },
    [tool, color, width, canvasPoint, screenToWorld, beginPinch, redraw]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      const p = canvasPoint(e);
      pointersRef.current.set(e.pointerId, p);

      // Pinch: two-finger pan + zoom (works regardless of the active tool).
      if (pinchRef.current && pointersRef.current.size >= 2) {
        const pts = [...pointersRef.current.values()];
        const [a, b] = pts;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const start = pinchRef.current;
        const ratio = dist / start.dist;
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, start.cam.scale * ratio));
        // World point under the original midpoint stays under the current one.
        const wx = (start.mid.x - start.cam.x) / start.cam.scale;
        const wy = (start.mid.y - start.cam.y) / start.cam.scale;
        cameraRef.current = { scale, x: mid.x - wx * scale, y: mid.y - wy * scale };
        setZoomPct(Math.round(scale * 100));
        redraw();
        return;
      }

      if (panStartRef.current) {
        const start = panStartRef.current;
        cameraRef.current = {
          ...start.cam,
          x: start.cam.x + (p.x - start.px),
          y: start.cam.y + (p.y - start.py),
        };
        redraw();
        return;
      }

      const s = activeRef.current;
      if (s) {
        s.points.push(screenToWorld(p.x, p.y));
        drawLastSegment();
      }
    },
    [canvasPoint, screenToWorld, drawLastSegment, redraw]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      pointersRef.current.delete(e.pointerId);

      if (pinchRef.current) {
        // Leaving pinch: commit camera and reset gesture so the remaining
        // finger (if any) doesn't cause a jump.
        if (pointersRef.current.size < 2) {
          pinchRef.current = null;
          panStartRef.current = null;
          scheduleSave();
        }
        return;
      }
      if (panStartRef.current) {
        panStartRef.current = null;
        scheduleSave();
        return;
      }
      if (activeRef.current) endStroke();
    },
    [endStroke, scheduleSave]
  );

  // --- Canvas sizing + initial load ------------------------------------------
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      strokesRef.current = saved.strokes;
      cameraRef.current = saved.camera;
      setZoomPct(Math.round(saved.camera.scale * 100));
    }
    syncHist();

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return; // not laid out yet — a later tick will size it
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      redraw();
    };
    resize();
    // Fallback for the initial measure in case layout isn't ready yet and the
    // ResizeObserver's first callback is delayed/skipped.
    const raf = requestAnimationFrame(resize);
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [redraw, syncHist]);

  // ---------------------------------------------------------------------------
  return (
    <div ref={containerRef} style={styles.stage}>
      <canvas
        ref={canvasRef}
        style={{
          ...styles.canvas,
          cursor: tool === "hand" ? "grab" : "crosshair",
          touchAction: "none", // we handle all gestures ourselves
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      <div style={styles.toolbar}>
        <div style={styles.group}>
          <ToolButton active={tool === "pen"} onClick={() => setTool("pen")}>
            Pen
          </ToolButton>
          <ToolButton active={tool === "eraser"} onClick={() => setTool("eraser")}>
            Eraser
          </ToolButton>
          <ToolButton active={tool === "hand"} onClick={() => setTool("hand")}>
            Pan
          </ToolButton>
        </div>

        <div style={styles.divider} />

        <div style={styles.group}>
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c);
                if (tool !== "pen") setTool("pen");
              }}
              title={c}
              style={{
                ...styles.swatch,
                background: c,
                outline: color === c ? `2px solid ${INK}` : "2px solid transparent",
              }}
            />
          ))}

          {/* Custom color picker — a rainbow-ringed swatch showing the current
              custom ink; clicking it opens the in-app color picker popover. */}
          <div ref={pickerWrapRef} style={{ position: "relative", display: "flex" }}>
            <button
              onClick={() => setPickerOpen((o) => !o)}
              title="Custom color"
              style={{
                ...styles.swatch,
                background:
                  "conic-gradient(from 90deg, #e0564f, #e0a94f, #5fae7a, #5a8fd6, #c061cb, #e0564f)",
                outline:
                  color === customColor ? `2px solid ${INK}` : "2px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <span style={{ ...styles.pickerDot, background: customColor }} />
            </button>
            {pickerOpen && (
              <ColorPicker
                value={customColor}
                onChange={(hex) => {
                  setCustomColor(hex);
                  setColor(hex);
                  if (tool !== "pen") setTool("pen");
                }}
              />
            )}
          </div>
        </div>

        <div style={styles.divider} />

        <div style={styles.group}>
          {WIDTHS.map((w, i) => (
            <button
              key={w}
              onClick={() => setWidth(w)}
              title={`${w}px`}
              style={{
                ...styles.widthBtn,
                outline: width === w ? `2px solid ${INK}` : "2px solid transparent",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: `${6 + i * 6}px`,
                  height: `${6 + i * 6}px`,
                  borderRadius: "50%",
                  background: INK,
                }}
              />
            </button>
          ))}
        </div>

        <div style={styles.divider} />

        <div style={styles.group}>
          <ToolButton onClick={undo} disabled={hist.undo === 0}>
            Undo
          </ToolButton>
          <ToolButton onClick={redoOp} disabled={hist.redo === 0}>
            Redo
          </ToolButton>
          <ToolButton onClick={clearAll} disabled={hist.undo === 0}>
            Clear
          </ToolButton>
        </div>

        <div style={styles.divider} />

        <div style={styles.group}>
          <ToolButton onClick={() => zoomButton(1 / 1.2)}>−</ToolButton>
          <button onClick={resetView} title="Reset view" style={styles.zoomLabel}>
            {zoomPct}%
          </button>
          <ToolButton onClick={() => zoomButton(1.2)}>+</ToolButton>
        </div>
      </div>
    </div>
  );
}

// Small uppercase toolbar button matching the poster's label treatment.
function ToolButton({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles.button,
        color: disabled ? INK_FAINT : active ? STAGE_BG : INK,
        background: active ? INK : "transparent",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  stage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    overflow: "hidden",
    background: STAGE_BG,
    fontFamily: FONT,
  },
  canvas: {
    position: "absolute",
    inset: 0,
    display: "block",
  },
  toolbar: {
    position: "absolute",
    top: "16px",
    left: "16px",
    right: "16px",
    zIndex: 5,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 16px",
    flexWrap: "wrap",
    justifyContent: "space-between",
    background: "rgba(20,20,20,0.85)",
    border: "1px solid rgba(245,245,240,0.15)",
    borderRadius: "10px",
    backdropFilter: "blur(8px)",
  },
  group: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  divider: {
    width: "1px",
    alignSelf: "stretch",
    background: "rgba(245,245,240,0.15)",
  },
  button: {
    appearance: "none",
    border: "none",
    borderRadius: "6px",
    padding: "6px 10px",
    fontFamily: FONT,
    fontSize: "11px",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
  },
  swatch: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  pickerDot: {
    width: "11px",
    height: "11px",
    borderRadius: "50%",
    boxShadow: "0 0 0 2px rgba(10,10,10,0.55)",
    pointerEvents: "none",
  },
  widthBtn: {
    width: "30px",
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  zoomLabel: {
    minWidth: "52px",
    border: "none",
    background: "transparent",
    color: INK_DIM,
    fontFamily: FONT,
    fontSize: "11px",
    letterSpacing: "0.15em",
    cursor: "pointer",
  },
};
