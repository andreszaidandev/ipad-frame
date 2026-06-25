export default async function handler(req: any, res: any) {
  const client_id = process.env.SPOTIFY_CLIENT_ID!;
  const client_secret = process.env.SPOTIFY_CLIENT_SECRET!;
  const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN!;

  const tokenResponse = await fetch(
    "https://accounts.spotify.com/api/token",
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            `${client_id}:${client_secret}`
          ).toString("base64"),
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
      }),
    }
  );

  const tokenData = await tokenResponse.json();

  const accessToken = tokenData.access_token;

  const trackResponse = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (trackResponse.status === 204) {
    return res.status(200).json({
      playing: false,
    });
  }

  const trackData = await trackResponse.json();

  res.status(200).json(trackData);
}