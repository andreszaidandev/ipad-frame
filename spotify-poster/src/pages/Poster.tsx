import { useEffect, useState } from "react";
import Vibrant from "node-vibrant";
import { spotify } from "../spotify";

export default function Poster() {
  const [track, setTrack] = useState<any>(null);
  const [palette, setPalette] = useState<any>(null);
  const [textColor, setTextColor] = useState("#fff");

  useEffect(() => {
    loadTrack();

    const interval = setInterval(async () => {
      const newTrack =
        await spotify.player.getCurrentlyPlayingTrack();

      setTrack((prev: any) => {
        if (prev?.item?.id !== newTrack?.item?.id) {
          return newTrack;
        }
        return prev;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  async function loadTrack() {
    try {
      const playback =
        await spotify.player.getCurrentlyPlayingTrack();

      setTrack(playback);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleImageLoad() {
    try {
      const album = track.item.album.images[0].url;

      const p = await new Vibrant(album).getPalette();

      setPalette(p);

      const rgb =
        p.Vibrant?.rgb ||
        p.Muted?.rgb ||
        [20, 20, 20];

      const [r, g, b] = rgb;

      const luminance =
        0.299 * r + 0.587 * g + 0.114 * b;

      setTextColor(luminance > 140 ? "#000" : "#fff");
    } catch (err) {
      console.error("Vibrant failed", err);
    }
  }

  if (!track?.item) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        No music playing
      </div>
    );
  }

  const album = track.item.album.images[0].url;

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        gap: "60px",
        padding: "60px",
        color: textColor,
        fontFamily: "Space Grotesk, sans-serif",
        transition: "background 0.8s ease, color 0.4s ease",
        background: `
          radial-gradient(circle at 20% 20%, ${palette?.Vibrant?.hex || "#222"}, transparent 60%),
          radial-gradient(circle at 80% 30%, ${palette?.Muted?.hex || "#111"}, transparent 55%),
          radial-gradient(circle at 40% 80%, ${palette?.DarkVibrant?.hex || "#000"}, transparent 60%),
          #0a0a0a
        `,
      }}
    >
      <img
        src={album}
        width={420}
        crossOrigin="anonymous"
        style={{
          boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
          borderRadius: "4px",
        }}
        onLoad={handleImageLoad}
      />

      <div>
        <h1
          style={{
            fontSize: "64px",
            fontWeight: 700,
            margin: 0,
            letterSpacing: "-0.03em",
            textTransform: "uppercase",
          }}
        >
          {track.item.name}
        </h1>

        <h2
          style={{
            fontSize: "28px",
            fontFamily: "IBM Plex Mono, monospace",
            letterSpacing: "0.2em",
            marginTop: "20px",
            opacity: 0.8,
            textTransform: "uppercase",
          }}
        >
          {track.item.artists[0].name}
        </h2>
      </div>
    </div>
  );
}