import { spotify } from "../spotify";

export default function LoginButton() {
  async function login() {
    await spotify.authenticate();
  }

  return (
    <button
      onClick={login}
      className="px-6 py-3 bg-black text-white border"
    >
      Login with Spotify
    </button>
  );
}