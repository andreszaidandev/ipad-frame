import { SpotifyApi } from "@spotify/web-api-ts-sdk";

const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

export const spotify = SpotifyApi.withUserAuthorization(
  clientId,
  `${window.location.origin}/callback`,
  [
    "user-read-currently-playing",
    "user-read-playback-state",
  ]
);