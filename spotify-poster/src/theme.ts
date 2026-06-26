// Shared design language for the app. Both the poster and the whiteboard pull
// their colors, typography, and label treatment from here so the surfaces read
// as one app. These values originated as poster-local constants.

// Off-white "ink" palette (fixed, intentional).
export const INK = "#F5F5F0"; // bone / off-white
export const INK_DIM = "rgba(245,245,240,0.65)";
export const INK_FAINT = "rgba(245,245,240,0.35)";

// Dark stage the content sits on.
export const STAGE_BG = "#0a0a0a";

export const FONT = "Helvetica, Arial, sans-serif";

// Uppercase, letter-spaced label treatment used for the poster's corner labels,
// the whiteboard toolbar, and other chrome.
export const label: React.CSSProperties = {
  color: INK_FAINT,
  fontSize: "12px",
  letterSpacing: "0.4em",
  textTransform: "uppercase",
  fontFamily: FONT,
};
