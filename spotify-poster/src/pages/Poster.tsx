import { useEffect, useState } from "react";
import type { PlaybackState, Track } from "@spotify/web-api-ts-sdk";
import { spotify } from "../spotify";
import { averageColor } from "../color";

const POLL_MS = 8000;

// Off-white palette (fixed, intentional).
const TITLE = "#F5F5F0"; // bone / off-white
const ARTIST = "rgba(245,245,240,0.65)";
const META = "rgba(245,245,240,0.35)";

export default function Poster() {
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [bg, setBg] = useState("rgb(15,15,15)");

  // Poll the currently playing track, only swapping state when it changes.
  useEffect(() => {
    let active = true;

    async function poll() {
      const next = await spotify.player.getCurrentlyPlayingTrack();
      if (!active) return;
      setPlayback((prev) => (prev?.item?.id === next?.item?.id ? prev : next));
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const track = playback?.item as Track | undefined;
  const cover = track?.album.images[0]?.url;

  // Derive the ambient background from the album cover.
  useEffect(() => {
    if (cover) averageColor(cover).then(setBg).catch(() => {});
  }, [cover]);

  if (!track || !cover) {
    return (
      <div style={styles.empty}>NO SIGNAL</div>
    );
  }

  return (
    <div style={styles.stage}>
      {/* Off-white style background */}
      <div
        style={{
          ...styles.glow,
          background: `
            radial-gradient(circle at 30% 30%, ${bg}, transparent 50%),
            radial-gradient(circle at 70% 70%, rgba(255,255,255,0.05), transparent 60%),
            #0a0a0a
          `,
        }}
      />

      {/* Grid system */}
      <div style={styles.grid}>
        <div style={styles.systemText}>spotify / now playing / system 2026</div>

        <div style={styles.main}>
          <img src={cover} alt="" style={styles.cover} />

          <div style={{ maxWidth: "50vw" }}>
            <h1 style={styles.title}>{track.name}</h1>
            <h2 style={styles.artist}>{track.artists[0].name}</h2>
            <div style={styles.rule} />
          </div>
        </div>

        <div style={styles.systemText}>audio stream active</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  empty: {
    height: "100vh",
    width: "100vw",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#000",
    color: "#fff",
    fontFamily: "Helvetica, Arial, sans-serif",
    letterSpacing: "0.4em",
    textTransform: "uppercase",
  },
  stage: {
    position: "fixed",
    inset: 0,
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    background: "#0a0a0a",
    fontFamily: "Helvetica, Arial, sans-serif",
  },
  glow: {
    position: "absolute",
    inset: 0,
    filter: "blur(100px)",
    transform: "scale(1.3)",
  },
  grid: {
    position: "relative",
    zIndex: 2,
    height: "100%",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "6vw",
  },
  systemText: {
    color: META,
    fontSize: "12px",
    letterSpacing: "0.4em",
    textTransform: "uppercase",
  },
  main: {
    display: "flex",
    alignItems: "center",
    gap: "6vw",
  },
  cover: {
    width: "45vw",
    maxWidth: "600px",
    aspectRatio: "1 / 1",
    objectFit: "cover",
    boxShadow: "40px 60px 0px rgba(0,0,0,0.7)",
    border: "1px solid rgba(245,245,240,0.2)",
    transform: "rotate(-1deg)",
  },
  title: {
    fontSize: "clamp(48px, 6vw, 110px)",
    fontWeight: 800,
    margin: 0,
    lineHeight: 0.9,
    letterSpacing: "-0.04em",
    textTransform: "uppercase",
    color: TITLE,
    wordBreak: "break-word",
    overflowWrap: "break-word",
    hyphens: "auto",
    maxWidth: "100%",
  },
  artist: {
    fontSize: "clamp(18px, 2.5vw, 36px)",
    marginTop: "30px",
    letterSpacing: "0.3em",
    textTransform: "uppercase",
    color: ARTIST,
  },
  rule: {
    marginTop: "40px",
    width: "120px",
    height: "2px",
    background: TITLE,
    opacity: 0.4,
  },
};
