import { useEffect, useState, useRef } from "react";
import ColorThief from "color-thief-browser";
import { spotify } from "../spotify";

export default function Poster() {
  const [track, setTrack] = useState<any>(null);
  const [bg, setBg] = useState("rgb(20,20,20)");
  const [textColor, setTextColor] = useState("#fff");

  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    loadTrack();
    const interval = setInterval(loadTrack, 10000);
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

  function handleImageLoad() {
    if (!imgRef.current) return;

    try {
      const colorThief = new ColorThief();
      const color = colorThief.getColor(imgRef.current);

      const rgb = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      setBg(rgb);

      const luminance = 0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2];
      setTextColor(luminance > 140 ? "#000" : "#fff");
    } catch (e) {
      console.error("Color extraction failed", e);
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
        background: `
          radial-gradient(circle at 20% 20%, ${bg}, transparent 60%),
          radial-gradient(circle at 80% 30%, rgba(255,255,255,0.08), transparent 50%),
          radial-gradient(circle at 40% 80%, rgba(0,0,0,0.6), transparent 60%),
          #0a0a0a
        `,
      }}
    >
      <img
        ref={imgRef}
        src={album}
        width={420}
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