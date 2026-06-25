import { useEffect, useState } from "react";
import { spotify } from "../spotify";

export default function Poster() {
  const [track, setTrack] = useState<any>(null);
  const [bg, setBg] = useState("rgb(10,10,10)");
  const [titleColor, setTitleColor] = useState("#fff");
  const [artistColor, setArtistColor] = useState("#aaa");

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
    }, 8000);

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

  // 🎨 extract dominant color WITHOUT libraries (stable + Vercel-safe)
  async function extractColor(imageUrl: string) {
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageUrl;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) return resolve();

        canvas.width = 50;
        canvas.height = 50;

        ctx.drawImage(img, 0, 0, 50, 50);

        const data = ctx.getImageData(0, 0, 50, 50).data;

        let r = 0, g = 0, b = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }

        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        setBg(`rgb(${r}, ${g}, ${b})`);

        // luminance
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // 🎯 two contrasting text colors
        setTitleColor(lum > 140 ? "#000" : "#fff");
        setArtistColor(lum > 140 ? "#333" : "#bbb");

        resolve();
      };
    });
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
        gap: "80px",
        padding: "80px",
        color: titleColor,
        fontFamily: "Space Grotesk, sans-serif",
        position: "relative",
        overflow: "hidden",
        background: "#000",
      }}
    >
      {/* 🌫 Apple-style blurred gradient background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(circle at 20% 20%, ${bg}, transparent 40%),
            radial-gradient(circle at 80% 30%, rgba(255,255,255,0.08), transparent 50%),
            radial-gradient(circle at 50% 80%, rgba(0,0,0,0.7), transparent 60%)
          `,
          filter: "blur(80px)",
          transform: "scale(1.2)",
        }}
      />

      {/* load color when image changes */}
      <img
        src={album}
        crossOrigin="anonymous"
        style={{ display: "none" }}
        onLoad={() => extractColor(album)}
      />

      {/* 🧱 Brutalist layout */}
      <img
        src={album}
        width={420}
        style={{
          zIndex: 2,
          boxShadow: "0 60px 140px rgba(0,0,0,0.6)",
          borderRadius: "0px",
          transform: "none",
        }}
      />

      <div style={{ zIndex: 2 }}>
        <h1
          style={{
            fontSize: "72px",
            fontWeight: 800,
            margin: 0,
            letterSpacing: "-0.04em",
            textTransform: "uppercase",
            color: titleColor,
          }}
        >
          {track.item.name}
        </h1>

        <h2
          style={{
            fontSize: "28px",
            marginTop: "20px",
            fontFamily: "IBM Plex Mono, monospace",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: artistColor,
          }}
        >
          {track.item.artists[0].name}
        </h2>
      </div>
    </div>
  );
}