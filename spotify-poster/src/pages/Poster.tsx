import { useEffect, useState } from "react";
import { spotify } from "../spotify";

export default function Poster() {
  const [track, setTrack] = useState<any>(null);
  const [bg, setBg] = useState("rgb(15,15,15)");
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

      canvas.width = 40;
      canvas.height = 40;

      ctx.drawImage(img, 0, 0, 40, 40);

      const data = ctx.getImageData(0, 0, 40, 40).data;

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
      <div className="h-screen flex items-center justify-center bg-black text-white">
        NO SIGNAL
      </div>
    );
  }

  const album = track.item.album.images[0].url;

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        position: "relative",
        overflow: "hidden",
        background: "#0a0a0a",
        fontFamily: "Impact, Space Grotesk, sans-serif",
      }}
    >
      {/* rough street background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(circle at 20% 20%, ${bg}, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(255,255,255,0.08), transparent 60%),
            #0a0a0a
          `,
          filter: "blur(70px)",
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

      {/* STREET LAYOUT CONTAINER */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
        }}
      >
        {/* TOP LABEL (small chaos text) */}
        <div
          style={{
            fontSize: "18px",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            opacity: 0.7,
            transform: "rotate(-2deg)",
          }}
        >
          now playing // live session
        </div>

        {/* CENTER BLOCK */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "60px",
          }}
        >
          {/* ALBUM POSTER */}
          <img
            src={album}
            width={380}
            style={{
              borderRadius: "0px",
              boxShadow: "20px 40px 0px rgba(0,0,0,0.8)",
              transform: "rotate(-3deg)",
              border: `4px solid ${textColor}`,
            }}
          />

          {/* TYPOGRAPHY STACK */}
          <div>
            <h1
              style={{
                fontSize: "110px",
                fontWeight: 900,
                margin: 0,
                lineHeight: 0.85,
                letterSpacing: "-0.06em",
                textTransform: "uppercase",
                color: textColor,
                transform: "rotate(1deg)",
              }}
            >
              {track.item.name}
            </h1>

            <h2
              style={{
                fontSize: "32px",
                marginTop: "20px",
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: textColor,
                opacity: 0.8,
                transform: "rotate(-1deg)",
              }}
            >
              {track.item.artists[0].name}
            </h2>
          </div>
        </div>

        {/* BOTTOM TAG */}
        <div
          style={{
            fontSize: "14px",
            letterSpacing: "0.5em",
            textTransform: "uppercase",
            opacity: 0.6,
            transform: "rotate(2deg)",
          }}
        >
          spotify frame system / 2026
        </div>
      </div>
    </div>
  );
}