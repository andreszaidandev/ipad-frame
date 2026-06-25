import { useEffect, useState } from "react";
import { spotify } from "../spotify";

export default function Poster() {
  const [track, setTrack] = useState<any>(null);
  const [bg, setBg] = useState("rgb(10,10,10)");
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
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  async function loadTrack() {
    const playback =
      await spotify.player.getCurrentlyPlayingTrack();

    setTrack(playback);
  }

  async function extractColor(imageUrl: string) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = 50;
      canvas.height = 50;

      ctx.drawImage(img, 0, 0, 50, 50);

      const data = ctx.getImageData(0, 0, 50, 50).data;

      let r = 0, g = 0, b = 0, count = 0;

      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }

      r = r / count;
      g = g / count;
      b = b / count;

      setBg(`rgb(${r}, ${g}, ${b})`);

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      setTextColor(lum > 140 ? "#000" : "#fff");
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
        inset: 0, // 🔥 FULL SCREEN (fixes white border)
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        background: "#000",
        fontFamily: "Impact, Space Grotesk, sans-serif",
      }}
    >
      {/* 🌫 FULLSCREEN BACKGROUND LAYER */}
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
          transform: "scale(1.4)",
        }}
      />

      {/* hidden image for color extraction */}
      <img
        src={album}
        crossOrigin="anonymous"
        style={{ display: "none" }}
        onLoad={() => extractColor(album)}
      />

      {/* MAIN CONTENT */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "100px",
        }}
      >
        {/* 🧱 BIGGER ALBUM */}
        <img
          src={album}
          style={{
            width: "520px", // 🔥 BIGGER
            height: "520px",
            objectFit: "cover",
            borderRadius: "0px",
            boxShadow: "30px 60px 0px rgba(0,0,0,0.8)",
            border: `5px solid ${textColor}`,
            transform: "rotate(-2deg)",
          }}
        />

        {/* 🧱 TEXT BLOCK */}
        <div
          style={{
            maxWidth: "60%",
            textAlign: "right",
          }}
        >
          <h1
            style={{
              fontSize: "120px",
              fontWeight: 900,
              margin: 0,
              lineHeight: 0.85,
              letterSpacing: "-0.06em",
              textTransform: "uppercase",
              color: textColor,
            }}
          >
            {track.item.name}
          </h1>

          <h2
            style={{
              fontSize: "40px",
              marginTop: "30px",
              letterSpacing: "0.4em",
              textTransform: "uppercase",
              color: textColor,
              opacity: 0.8,
            }}
          >
            {track.item.artists[0].name}
          </h2>
        </div>
      </div>
    </div>
  );
}