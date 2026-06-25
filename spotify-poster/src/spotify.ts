import { SpotifyApi } from "@spotify/web-api-ts-sdk";

const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

export const spotify = SpotifyApi.withUserAuthorization(
  clientId,
  `${window.location.origin}/callback`,
  ["user-read-currently-playing", "user-read-playback-state"]
);

// The SDK persists the PKCE token (including the refresh token) in localStorage
// under this key. We read it directly — without going through getAccessToken(),
// which deletes expired entries — so we can tell an existing session (that
// authenticate() will silently refresh) apart from no session at all.
const TOKEN_KEY = "spotify-sdk:AuthorizationCodeWithPKCEStrategy:token";

export function hasSpotifySession(): boolean {
  return localStorage.getItem(TOKEN_KEY) !== null;
}
