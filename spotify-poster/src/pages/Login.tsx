import { spotify } from "../spotify";

export default function Login() {
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
