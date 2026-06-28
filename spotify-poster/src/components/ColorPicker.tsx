import { useRef, useState } from "react";
import { INK, FONT } from "../theme";

// ---------------------------------------------------------------------------
// A small HSV color picker styled to match the app's dark toolbar chrome —
// a saturation/value field, a hue strip, and a hex input. Replaces the
// browser's native <input type="color"> popup so the surface stays on-brand.
// ---------------------------------------------------------------------------

interface RGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(v).toString(16).padStart(2, "0"))
      .join("")
  );
}

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToRgb(h: number, s: number, v: number): RGB {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g] = [c, x];
  else if (h < 120) [r, g] = [x, c];
  else if (h < 180) [g, b] = [c, x];
  else if (h < 240) [g, b] = [x, c];
  else if (h < 300) [r, b] = [x, c];
  else [r, b] = [c, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function hsvToHex(h: number, s: number, v: number): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

export default function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  // Seed HSV from the incoming color. The picker only mounts while open, so
  // this initial read is enough to keep it in sync with the active custom ink.
  const seed = rgbToHsv(...(Object.values(hexToRgb(value)) as [number, number, number]));
  const [h, setH] = useState(seed.h);
  const [s, setS] = useState(seed.s);
  const [v, setV] = useState(seed.v);
  const [hexText, setHexText] = useState(value.toLowerCase());

  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const dragSV = useRef(false);
  const dragHue = useRef(false);

  const commit = (nh: number, ns: number, nv: number) => {
    setH(nh);
    setS(ns);
    setV(nv);
    const hex = hsvToHex(nh, ns, nv);
    setHexText(hex);
    onChange(hex);
  };

  const onSV = (clientX: number, clientY: number) => {
    const r = svRef.current!.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
    commit(h, x, 1 - y);
  };

  const onHue = (clientX: number) => {
    const r = hueRef.current!.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    commit(x * 360, s, v);
  };

  const current = hsvToHex(h, s, v);
  const hueColor = `hsl(${Math.round(h)}, 100%, 50%)`;

  return (
    <div style={styles.popover}>
      <div
        ref={svRef}
        style={{
          ...styles.sv,
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${hueColor}`,
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragSV.current = true;
          onSV(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => dragSV.current && onSV(e.clientX, e.clientY)}
        onPointerUp={(e) => {
          dragSV.current = false;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
      >
        <div
          style={{
            ...styles.svThumb,
            left: `${s * 100}%`,
            top: `${(1 - v) * 100}%`,
            background: current,
          }}
        />
      </div>

      <div
        ref={hueRef}
        style={styles.hue}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragHue.current = true;
          onHue(e.clientX);
        }}
        onPointerMove={(e) => dragHue.current && onHue(e.clientX)}
        onPointerUp={(e) => {
          dragHue.current = false;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
      >
        <div style={{ ...styles.hueThumb, left: `${(h / 360) * 100}%` }} />
      </div>

      <div style={styles.row}>
        <div style={{ ...styles.preview, background: current }} />
        <input
          value={hexText}
          spellCheck={false}
          onChange={(e) => {
            const t = e.target.value;
            setHexText(t);
            const m = /^#?([0-9a-fA-F]{6})$/.exec(t.trim());
            if (m) {
              const { r, g, b } = hexToRgb(m[1]);
              const hsv = rgbToHsv(r, g, b);
              setH(hsv.h);
              setS(hsv.s);
              setV(hsv.v);
              onChange("#" + m[1].toLowerCase());
            }
          }}
          style={styles.hexInput}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  popover: {
    position: "absolute",
    top: "calc(100% + 10px)",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 20,
    width: "188px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    background: "rgba(20,20,20,0.95)",
    border: "1px solid rgba(245,245,240,0.15)",
    borderRadius: "10px",
    backdropFilter: "blur(8px)",
    boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
    fontFamily: FONT,
  },
  sv: {
    position: "relative",
    width: "100%",
    height: "130px",
    borderRadius: "6px",
    cursor: "crosshair",
    touchAction: "none",
  },
  svThumb: {
    position: "absolute",
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    border: "2px solid #fff",
    boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
  hue: {
    position: "relative",
    width: "100%",
    height: "12px",
    borderRadius: "6px",
    cursor: "pointer",
    touchAction: "none",
    background:
      "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
  },
  hueThumb: {
    position: "absolute",
    top: "50%",
    width: "6px",
    height: "16px",
    borderRadius: "3px",
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.4)",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  preview: {
    width: "26px",
    height: "26px",
    borderRadius: "6px",
    flexShrink: 0,
    border: "1px solid rgba(245,245,240,0.15)",
  },
  hexInput: {
    flex: 1,
    minWidth: 0,
    appearance: "none",
    background: "transparent",
    border: "1px solid rgba(245,245,240,0.2)",
    borderRadius: "6px",
    padding: "6px 8px",
    color: INK,
    fontFamily: FONT,
    fontSize: "12px",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    outline: "none",
  },
};
