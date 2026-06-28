// ---------------------------------------------------------------------------
// Lyrics for the poster. Spotify's Web API has no lyrics endpoint, so we pull
// time-synced lyrics from lrclib.net — a free, no-auth, CORS-friendly source
// that returns LRC ([mm:ss.xx]) lines. We parse those into timestamped lines
// and look up the active line from the track's playback position.
// ---------------------------------------------------------------------------

export interface LyricLine {
  time: number; // ms from track start
  text: string;
}

export interface Lyrics {
  synced: LyricLine[] | null; // timestamped lines, when available
  plain: string | null; // unsynced fallback text
}

export interface TrackQuery {
  name: string;
  artist: string;
  album: string;
  durationMs: number;
}

const TAG = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

export function parseLrc(lrc: string): LyricLine[] {
  const out: LyricLine[] = [];
  for (const line of lrc.split("\n")) {
    TAG.lastIndex = 0;
    const text = line.replace(TAG, "").trim();
    let m: RegExpExecArray | null;
    TAG.lastIndex = 0;
    while ((m = TAG.exec(line)) !== null) {
      const min = parseInt(m[1], 10);
      const sec = parseInt(m[2], 10);
      const frac = m[3] ? parseInt(m[3].padEnd(3, "0"), 10) : 0;
      out.push({ time: min * 60000 + sec * 1000 + frac, text });
    }
  }
  out.sort((a, b) => a.time - b.time);
  return out;
}

interface LrclibRecord {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  instrumental?: boolean;
}

function toLyrics(rec: LrclibRecord): Lyrics {
  if (rec.instrumental) return { synced: [], plain: null };
  return {
    synced: rec.syncedLyrics ? parseLrc(rec.syncedLyrics) : null,
    plain: rec.plainLyrics ?? null,
  };
}

export async function fetchLyrics(
  t: TrackQuery,
  signal: AbortSignal
): Promise<Lyrics> {
  // Exact match (artist + track + album + duration) is most reliable.
  const get = new URLSearchParams({
    artist_name: t.artist,
    track_name: t.name,
    album_name: t.album,
    duration: String(Math.round(t.durationMs / 1000)),
  });
  const res = await fetch(`https://lrclib.net/api/get?${get}`, { signal });
  if (res.ok) return toLyrics(await res.json());

  // Fall back to a looser search (e.g. album/duration mismatch).
  const q = new URLSearchParams({ track_name: t.name, artist_name: t.artist });
  const sres = await fetch(`https://lrclib.net/api/search?${q}`, { signal });
  if (!sres.ok) return { synced: null, plain: null };
  const arr = (await sres.json()) as LrclibRecord[];
  const best =
    arr.find((r) => r.syncedLyrics) ?? arr.find((r) => r.plainLyrics) ?? arr[0];
  return best ? toLyrics(best) : { synced: null, plain: null };
}

// Index of the last line whose timestamp is at or before `ms` (binary search).
// Returns -1 before the first timed line (intro).
export function activeLineIndex(lines: LyricLine[], ms: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= ms) {
      idx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return idx;
}
