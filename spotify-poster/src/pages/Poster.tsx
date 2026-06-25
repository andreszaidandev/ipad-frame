import { useEffect, useState } from "react";
import { spotify } from "../spotify";

export default function Poster() {
    const [track, setTrack] = useState<any>(null);
    const [bg, setBg] = useState("rgb(15,15,15)");

    // Off-White palette (fixed, intentional)
    const TITLE = "#F5F5F0";   // bone / off-white
    const ARTIST = "rgba(245,245,240,0.65)";
    const META = "rgba(245,245,240,0.35)";

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
                background: "#0a0a0a",
                fontFamily: "Helvetica, Arial, sans-serif",
            }}
        >
            {/* OFF-WHITE STYLE BACKGROUND */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    background: `
            radial-gradient(circle at 30% 30%, ${bg}, transparent 50%),
            radial-gradient(circle at 70% 70%, rgba(255,255,255,0.05), transparent 60%),
            #0a0a0a
          `,
                    filter: "blur(100px)",
                    transform: "scale(1.3)",
                }}
            />

            <img
                src={album}
                crossOrigin="anonymous"
                style={{ display: "none" }}
                onLoad={() => extractColor(album)}
            />

            {/* GRID SYSTEM */}
            <div
                style={{
                    position: "relative",
                    zIndex: 2,
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "6vw",
                }}
            >
                {/* TOP SYSTEM TEXT */}
                <div
                    style={{
                        color: META,
                        fontSize: "12px",
                        letterSpacing: "0.4em",
                        textTransform: "uppercase",
                    }}
                >
                    spotify / now playing / system 2026
                </div>

                {/* MAIN BLOCK */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6vw",
                    }}
                >
                    {/* ALBUM */}
                    <img
                        src={album}
                        style={{
                            width: "45vw",
                            maxWidth: "600px",
                            aspectRatio: "1 / 1",
                            objectFit: "cover",
                            borderRadius: "0px",
                            boxShadow: "40px 60px 0px rgba(0,0,0,0.7)",
                            border: "1px solid rgba(245,245,240,0.2)",
                            transform: "rotate(-1deg)",
                        }}
                    />

                    {/* TYPOGRAPHY */}
                    <div style={{ maxWidth: "50vw" }}>
                        <h1
                            style={{
                                fontSize: "clamp(48px, 6vw, 110px)",
                                fontWeight: 800,
                                margin: 0,
                                lineHeight: 0.9,
                                letterSpacing: "-0.04em",
                                textTransform: "uppercase",
                                color: TITLE,

                                // 🔥 CRITICAL WRAPPING FIX
                                whiteSpace: "normal",
                                wordBreak: "break-word",
                                overflowWrap: "break-word",
                                hyphens: "auto",

                                // 🔥 prevents flex overflow cutting text
                                maxWidth: "100%",
                            }}
                        >
                            {track.item.name}
                        </h1>

                        <h2
                            style={{
                                fontSize: "clamp(18px, 2.5vw, 36px)",
                                marginTop: "30px",
                                letterSpacing: "0.3em",
                                textTransform: "uppercase",
                                color: ARTIST,
                            }}
                        >
                            {track.item.artists[0].name}
                        </h2>

                        {/* OFF-WHITE STYLE LINE */}
                        <div
                            style={{
                                marginTop: "40px",
                                width: "120px",
                                height: "2px",
                                background: TITLE,
                                opacity: 0.4,
                            }}
                        />
                    </div>
                </div>

                {/* BOTTOM LABEL */}
                <div
                    style={{
                        color: META,
                        fontSize: "12px",
                        letterSpacing: "0.4em",
                        textTransform: "uppercase",
                    }}
                >
                    audio stream active
                </div>
            </div>
        </div>
    );
}