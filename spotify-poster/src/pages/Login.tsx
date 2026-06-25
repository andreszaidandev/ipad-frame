import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { spotify, hasSpotifySession } from "../spotify";

export default function Login() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  // Already have a session? Go straight to the poster. The token may be expired,
  // but the poster's first request silently refreshes it via the refresh token.
  useEffect(() => {
    if (hasSpotifySession()) navigate("/poster", { replace: true });
    else setChecking(false);
  }, [navigate]);

  if (checking) return null;

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Helvetica, Arial, sans-serif",
      }}
    >
      <button
        onClick={() => spotify.authenticate()}
        style={{ padding: "16px 24px", cursor: "pointer" }}
      >
        Login with Spotify
      </button>
    </div>
  );
}
