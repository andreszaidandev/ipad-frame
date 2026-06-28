import { useEffect, useRef, useState } from "react";
import type { PlaybackState, Track } from "@spotify/web-api-ts-sdk";
import { spotify, hasSpotifySession } from "../spotify";
import { averageColor } from "../color";
import { fetchLyrics, activeLineIndex, type Lyrics } from "../lyrics";
import { INK, INK_DIM, INK_FAINT, STAGE_BG, FONT, label } from "../theme";

const POLL_MS = 8000;

// Replace with your own Buy Me a Coffee handle.
const COFFEE_URL = "https://buymeacoffee.com/andreszaidan";

// Off-white palette, shared app-wide via the theme module.
const TITLE = INK; // bone / off-white
const ARTIST = INK_DIM;

export default function Poster() {
  const [playback, setPlayback] = useState<PlaybackState | null>(null);
  const [bg, setBg] = useState("rgb(15,15,15)");
  const [authed] = useState(hasSpotifySession);

  // Lyrics view: a toggle, the fetched lyrics, their load state, and the index
  // of the line currently playing.
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [lyricsState, setLyricsState] = useState<"loading" | "ready" | "none">(
    "none"
  );
  const [activeIdx, setActiveIdx] = useState(-1);
  // Authoritative playback position, refreshed each poll and advanced locally
  // between polls so the synced lyrics track the song smoothly.
  const progressRef = useRef({ baseMs: 0, at: 0, playing: false });

  // Poll the currently playing track, only swapping state when it changes.
  // We only poll once a session exists — calling the API unauthenticated would
  // make the SDK auto-redirect to Spotify. Without a session we instead show a
  // login button on the NO SIGNAL screen and let the user start auth manually.
  useEffect(() => {
    if (!authed) return;
    let active = true;

    async function poll() {
      try {
        const next = await spotify.player.getCurrentlyPlayingTrack();
        if (!active) return;
        if (next?.item) {
          progressRef.current = {
            baseMs: next.progress_ms ?? 0,
            at: Date.now(),
            playing: next.is_playing ?? false,
          };
        }
        setPlayback((prev) => (prev?.item?.id === next?.item?.id ? prev : next));
      } catch (err) {
        // Token refresh/auth failures here trigger the SDK's own re-auth
        // redirect; keep the last known track for transient network errors.
        console.error("Failed to fetch current track", err);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [authed]);

  const track = playback?.item as Track | undefined;
  const cover = track?.album.images[0]?.url;

  // Derive the ambient background from the album cover.
  useEffect(() => {
    if (cover) averageColor(cover).then(setBg).catch(() => {});
  }, [cover]);

  // Fetch lyrics whenever the track changes.
  const trackId = track?.id;
  useEffect(() => {
    if (!track) return;
    const ctrl = new AbortController();
    setLyrics(null);
    setActiveIdx(-1);
    setLyricsState("loading");
    fetchLyrics(
      {
        name: track.name,
        artist: track.artists[0].name,
        album: track.album.name,
        durationMs: track.duration_ms,
      },
      ctrl.signal
    )
      .then((r) => {
        setLyrics(r);
        setLyricsState(r.synced?.length || r.plain ? "ready" : "none");
      })
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setLyricsState("none");
      });
    return () => ctrl.abort();
  }, [trackId]); // eslint-disable-line react-hooks/exhaustive-deps

  // While the lyrics view is open, advance the active line from the live
  // playback position (re-rendering only when the line actually changes).
  useEffect(() => {
    if (!showLyrics || !lyrics?.synced?.length) return;
    const lines = lyrics.synced;
    const tick = () => {
      const p = progressRef.current;
      const ms = p.baseMs + (p.playing ? Date.now() - p.at : 0);
      const next = activeLineIndex(lines, ms);
      setActiveIdx((cur) => (cur === next ? cur : next));
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [showLyrics, lyrics]);

  if (!track || !cover) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyText}>NO SIGNAL</div>
        {!authed && (
          <button onClick={() => spotify.authenticate()} style={styles.loginButton}>
            Login with Spotify
          </button>
        )}
      </div>
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
        <div style={styles.topLabel}>
          spotify / now playing /{" "}
          <a href={COFFEE_URL} target="_blank" rel="noreferrer" style={styles.coffee}>
            buy me a coffee
          </a>
        </div>

        <div style={styles.main}>
          <div style={styles.coverWrap}>
            <img src={cover} alt="" style={styles.cover} />
          </div>

          <div style={styles.info}>
            {showLyrics ? (
              <div style={styles.lyricsPanel}>
                <LyricsView lyrics={lyrics} state={lyricsState} activeIdx={activeIdx} />
                <div style={styles.lyricRule} />
              </div>
            ) : (
              <>
                <h1 style={styles.title}>{track.name}</h1>
                <h2 style={styles.artist}>{track.artists[0].name}</h2>
                <div style={styles.rule} />
              </>
            )}
          </div>
        </div>

        <div style={styles.bottomLabel}>
          audio stream active /{" "}
          <button
            onClick={() => setShowLyrics((s) => !s)}
            style={styles.bottomToggle}
          >
            {showLyrics ? "credits" : "lyrics"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Lyrics column: a moving window of synced lines (active line highlighted),
// or the plain text / a status note when synced lines aren't available.
function LyricsView({
  lyrics,
  state,
  activeIdx,
}: {
  lyrics: Lyrics | null;
  state: "loading" | "ready" | "none";
  activeIdx: number;
}) {
  if (state === "loading") {
    return <div style={styles.lyricNote}>Loading lyrics…</div>;
  }
  if (!lyrics || (!lyrics.synced?.length && !lyrics.plain)) {
    return <div style={styles.lyricNote}>Lyrics unavailable</div>;
  }

  // Unsynced fallback — show the plain text (it can't follow the song).
  if (!lyrics.synced?.length && lyrics.plain) {
    return (
      <div style={styles.lyricsBox}>
        {lyrics.plain
          .split("\n")
          .slice(0, 8)
          .map((l, i) => (
            <div key={i} style={{ ...styles.lyricLine, ...styles.lyricInactive }}>
              {l || " "}
            </div>
          ))}
      </div>
    );
  }

  const lines = lyrics.synced!;
  const start = Math.max(0, activeIdx - 1);
  const windowed = lines.slice(start, start + 5);
  return (
    <div style={styles.lyricsBox}>
      {windowed.map((ln, i) => {
        const real = start + i;
        const isActive = real === activeIdx;
        return (
          <div
            key={real}
            style={{
              ...styles.lyricLine,
              ...(isActive ? styles.lyricActive : styles.lyricInactive),
            }}
          >
            {ln.text || "♪"}
          </div>
        );
      })}
    </div>
  );
}

const cornerLabel: React.CSSProperties = {
  ...label,
  position: "absolute",
  left: "6vw",
  zIndex: 3,
};

const styles: Record<string, React.CSSProperties> = {
  empty: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "32px",
    background: "#000",
    color: "#fff",
    fontFamily: FONT,
  },
  emptyText: {
    letterSpacing: "0.4em",
    textTransform: "uppercase",
  },
  loginButton: {
    appearance: "none",
    cursor: "pointer",
    padding: "14px 28px",
    background: "transparent",
    color: INK,
    border: `1px solid ${INK_FAINT}`,
    borderRadius: "999px",
    fontFamily: FONT,
    fontSize: "12px",
    letterSpacing: "0.3em",
    textTransform: "uppercase",
  },
  stage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    overflow: "hidden",
    background: STAGE_BG,
    fontFamily: FONT,
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
    boxSizing: "border-box", // keep padding inside the viewport (no horizontal overflow)
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "6vw",
  },
  topLabel: { ...cornerLabel, top: "6vw" },
  bottomLabel: { ...cornerLabel, bottom: "6vw" },
  coffee: {
    color: ARTIST,
    textDecoration: "underline",
    textUnderlineOffset: "3px",
  },
  bottomToggle: {
    appearance: "none",
    cursor: "pointer",
    margin: 0,
    padding: 0,
    border: 0,
    background: "transparent",
    color: ARTIST,
    font: "inherit",
    letterSpacing: "inherit",
    textTransform: "inherit",
    textDecoration: "underline",
    textUnderlineOffset: "3px",
  },
  main: {
    display: "flex",
    alignItems: "center",
    gap: "5vw",
    // Nudge the composition up so it reads as centered above the bottom label.
    marginBottom: "5vh",
  },
  coverWrap: {
    position: "relative",
    flexShrink: 0,
  },
  cover: {
    display: "block",
    width: "40vw",
    maxWidth: "520px",
    aspectRatio: "1 / 1",
    objectFit: "cover",
    boxShadow: "40px 60px 0px rgba(0,0,0,0.7)",
    border: "1px solid rgba(245,245,240,0.2)",
    transform: "rotate(-1deg)",
  },
  lyricsBox: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "clamp(8px, 1.2vw, 14px)",
    maxHeight: "calc(100% - 42px)",
    overflow: "hidden",
  },
  lyricsPanel: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    maxHeight: "100%",
    overflow: "hidden",
  },
  lyricLine: {
    margin: 0,
    overflowWrap: "break-word",
    transition: "color 200ms ease, font-size 200ms ease",
  },
  // Active line mirrors the poster title.
  lyricActive: {
    color: TITLE,
    fontSize: "clamp(30px, 4.4vw, 72px)",
    fontWeight: 800,
    lineHeight: 0.95,
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  // Other lines mirror the artist line.
  lyricInactive: {
    color: ARTIST,
    fontSize: "clamp(15px, 2vw, 30px)",
    lineHeight: 1.15,
    letterSpacing: "0.3em",
    textTransform: "uppercase",
  },
  // The not-ready / unavailable note also mirrors the artist line.
  lyricNote: {
    color: ARTIST,
    fontSize: "clamp(15px, 2vw, 30px)",
    lineHeight: 1.15,
    letterSpacing: "0.3em",
    textTransform: "uppercase",
    maxHeight: "100%",
    overflow: "hidden",
  },
  lyricRule: {
    flexShrink: 0,
    marginTop: "32px",
    width: "120px",
    height: "2px",
    background: TITLE,
    opacity: 0.4,
  },
  info: {
    flex: 1,
    minWidth: 0, // lets the title wrap instead of overflowing the flex row
    maxHeight: "min(62vh, calc(100vh - 20vw))",
    overflow: "hidden",
    position: "relative",
    zIndex: 1, // keep text above the album's transformed shadow
  },
  title: {
    fontSize: "clamp(36px, 5vw, 92px)",
    fontWeight: 800,
    margin: 0,
    lineHeight: 0.9,
    letterSpacing: 0,
    textTransform: "uppercase",
    color: TITLE,
    // Wrap at spaces (whole words per line); only hard-break a word that is
    // too long to fit on its own line — never hyphenate mid-word.
    overflowWrap: "break-word",
  },
  artist: {
    fontSize: "clamp(18px, 2.5vw, 36px)",
    marginTop: "30px",
    letterSpacing: "0.3em",
    textTransform: "uppercase",
    color: ARTIST,
    overflowWrap: "break-word",
  },
  rule: {
    marginTop: "40px",
    width: "120px",
    height: "2px",
    background: TITLE,
    opacity: 0.4,
  },
};
