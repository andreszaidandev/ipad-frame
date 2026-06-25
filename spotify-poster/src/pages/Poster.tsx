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
    const playback =
      await spotify.player.getCurrentlyPlayingTrack();

    setTrack(playback);
  }

  function pickTextColors(r: number, g: number, b: number) {
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    // base split: one strong, one muted contrast
    if (luminance > 150) {
      // light background → dark text hierarchy
      setTitleColor("#000");
      setArtistColor("rgba(0,0,0,0.6)");
    } else {
      // dark background → light hierarchy
      setTitleColor("#fff");
      setArtistColor("rgba(255,255,255,0.7)");
    }
  }

  async function extractColor(imageUrl: string) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = 60;
      canvas.height = 60;

      ctx.drawImage(img, 0, 0, 60, 60);

      const data = ctx.getImageData(0, 0, 60, 60).data;

      let r = 0, g = 0, b = 0, count = 0;

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
      pickTextColors(r, g, b);
    };
  }

  if (!track?.item) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black text-white">
        NO SIGNAL
      </div>
    );
  }

  const album = track.item.album.images[0].url;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#000",
        fontFamily: "Impact, Space Grotesk, sans-serif",
      }}
    >
      {/* 🌫 background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(circle at 20% 20%, ${bg}, transparent 45%),
            radial-gradient(circle at 80% 70%, rgba(255,255,255,0.08), transparent 60%),
            #000
          `,
          filter: "blur(90px)",
          transform: "scale(1.3)",
        }}
      />

      <img
        src={album}
        crossOrigin="anonymous"
        style={{ display: "none" }}
        onLoad={() => extractColor(album)}
      />

      {/* MAIN LAYOUT */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "5vw",
          gap: "4vw",
        }}
      >
        {/* ALBUM */}
        <div style={{ flex: "0 0 48%" }}>
          <img
            src={album}
            style={{
              width: "100%",
              maxWidth: "600px",
              aspectRatio: "1 / 1",
              objectFit: "cover",
              borderRadius: "0px",
              boxShadow: "30px 60px 0px rgba(0,0,0,0.8)",
              border: `5px solid ${titleColor}`,
              transform: "rotate(-2deg)",
            }}
          />
        </div>

        {/* TEXT */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "2vh",
            minWidth: 0,
          }}
        >
          {/* TITLE (strong contrast) */}
          <h1
            style={{
              fontSize: "clamp(40px, 6vw, 120px)",
              fontWeight: 900,
              margin: 0,
              lineHeight: 0.9,
              letterSpacing: "-0.05em",
              textTransform: "uppercase",
              color: titleColor,
              wordBreak: "break-word",
            }}
          >
            {track.item.name}
          </h1>

          {/* ARTIST (secondary contrast) */}
          <h2
            style={{
              fontSize: "clamp(18px, 2.5vw, 40px)",
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: artistColor,
              wordBreak: "break-word",
              marginTop: "10px",
            }}
          >
            {track.item.artists[0].name}
          </h2>
        </div>
      </div>
    </div>
  );
}