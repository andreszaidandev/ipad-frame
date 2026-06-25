import { spotify } from "../spotify";

export default function Login() {
  async function login() {
    await spotify.authenticate();
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <button
        onClick={login}
        style={{
          padding: "16px 24px",
          cursor: "pointer",
        }}
      >
        Login with Spotify
      </button>
    </div>
  );
}