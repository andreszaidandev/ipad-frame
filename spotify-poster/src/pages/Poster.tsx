import { useEffect, useState } from "react";
import { spotify } from "../spotify";

export default function Poster() {
  const [track, setTrack] = useState<any>(null);

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

  if (!track?.item) {
    return (
      <div className="h-screen flex items-center justify-center">
        No music playing
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        background: "#111",
        color: "white",
        display: "flex",
        alignItems: "center",
        gap: "40px",
        padding: "40px",
      }}
    >
      <img
        src={track.item.album.images[0].url}
        width={400}
      />

      <div>
        <h1>{track.item.name}</h1>
        <h2>{track.item.artists[0].name}</h2>
      </div>
    </div>
  );
}