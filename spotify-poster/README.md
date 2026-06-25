# Spotify Poster

A full-screen "now playing" poster for an iPad (or any always-on display). It
logs into Spotify, polls the currently playing track, and renders it as an
Off-White–style typographic poster with an ambient background tinted from the
album cover.

## How it works

- **Auth** — PKCE user authorization via `@spotify/web-api-ts-sdk`
  ([`src/spotify.ts`](src/spotify.ts)). No backend or secrets required.
- **Routes** ([`src/App.tsx`](src/App.tsx)):
  - `/` — [`Login`](src/pages/Login.tsx) starts the Spotify auth flow.
  - `/callback` — [`Callback`](src/pages/Callback.tsx) finishes auth, then
    redirects to the poster.
  - `/poster` — [`Poster`](src/pages/Poster.tsx) polls the track every 8s and
    renders it. [`src/color.ts`](src/color.ts) derives the ambient glow from
    the cover art.

## Setup

```bash
npm install
echo "VITE_SPOTIFY_CLIENT_ID=your_client_id" > .env.local
npm run dev
```

Add `<origin>/callback` (e.g. `http://localhost:5173/callback`) as a redirect
URI in your Spotify app dashboard.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build
- `npm run lint` — run Oxlint

Deploys as a static SPA; [`vercel.json`](vercel.json) rewrites all routes to
`index.html` for client-side routing.
