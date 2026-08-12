import { PlexServer, PlexLibrary, PlexMedia } from './types';

const PLEX_TV = 'https://plex.tv';
const CLIENT_ID = process.env.NEXT_PUBLIC_PLEX_CLIENT_ID!;
const CLIENT_NAME = 'PlexStream for Tesla';

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function createPin(): Promise<{ id: number; code: string }> {
  const res = await fetch(`${PLEX_TV}/api/v2/pins`, {
    method: 'POST',
    headers: plexHeaders(),
    body: new URLSearchParams({ strong: 'true' }),
  });
  if (!res.ok) throw new Error('Failed to create Plex pin');
  const data = await res.json();
  return { id: data.id, code: data.code };
}

export function plexAuthUrl(code: string, redirectUri: string): string {
  const params = new URLSearchParams({
    clientID: CLIENT_ID,
    code,
    context_device_name: CLIENT_NAME,
    forwardUrl: redirectUri,
  });
  return `https://app.plex.tv/auth#?${params}`;
}

export async function checkPin(pinId: number): Promise<string | null> {
  const res = await fetch(`${PLEX_TV}/api/v2/pins/${pinId}`, {
    headers: plexHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.authToken ?? null;
}

// ── Servers ───────────────────────────────────────────────────────────────────

export async function getServers(token: string): Promise<PlexServer[]> {
  const res = await fetch(`${PLEX_TV}/api/v2/resources?includeHttps=1&includeRelay=1`, {
    headers: plexHeaders(token),
  });
  if (!res.ok) throw new Error('Failed to fetch Plex resources');
  const data: unknown[] = await res.json();

  const servers: PlexServer[] = [];
  for (const r of data as any[]) {
    if (r.provides !== 'server') continue;
    const conn = (r.connections as any[]).find((c: any) => c.relay) ?? r.connections[0];
    if (!conn) continue;
    servers.push({
      name: r.name,
      scheme: conn.protocol,
      host: conn.address,
      port: conn.port,
      accessToken: r.accessToken,
      baseUrl: conn.uri,
    });
  }
  return servers;
}

// ── Libraries ─────────────────────────────────────────────────────────────────

export async function getLibraries(server: PlexServer): Promise<PlexLibrary[]> {
  const data = await plexFetch(server, '/library/sections');
  const dirs = data?.MediaContainer?.Directory ?? [];
  return dirs
    .filter((d: any) => d.type === 'movie' || d.type === 'show')
    .map((d: any) => ({ key: d.key, title: d.title, type: d.type }));
}

// ── Media ─────────────────────────────────────────────────────────────────────

export async function getLibraryItems(
  server: PlexServer,
  sectionKey: string,
  type: 'movie' | 'show',
  start = 0,
  size = 50
): Promise<{ items: PlexMedia[]; total: number }> {
  const path = `/library/sections/${sectionKey}/all?X-Plex-Container-Start=${start}&X-Plex-Container-Size=${size}`;
  const data = await plexFetch(server, path);
  const container = data?.MediaContainer;
  const raw: any[] = container?.Metadata ?? [];
  return {
    items: raw.map(m => normMedia(m, server, type)),
    total: container?.totalSize ?? raw.length,
  };
}

export async function searchLibrary(
  server: PlexServer,
  query: string
): Promise<PlexMedia[]> {
  const data = await plexFetch(server, `/hubs/search?query=${encodeURIComponent(query)}&limit=20`);
  const hubs: any[] = data?.MediaContainer?.Hub ?? [];
  const results: PlexMedia[] = [];
  for (const hub of hubs) {
    if (hub.type !== 'movie' && hub.type !== 'show') continue;
    const items: any[] = hub.Metadata ?? [];
    results.push(...items.map((m: any) => normMedia(m, server, hub.type)));
  }
  return results;
}

// ── Stream URL ────────────────────────────────────────────────────────────────

export function getStreamUrl(server: PlexServer, itemKey: string): string {
  // Use Plex's /video/:/transcode/universal/stream for broad compatibility
  const base = `${server.baseUrl}/video/:/transcode/universal/stream`;
  const params = new URLSearchParams({
    path: itemKey,
    mediaIndex: '0',
    protocol: 'hls',
    'X-Plex-Token': server.accessToken,
    'X-Plex-Platform': 'Chrome',
    'X-Plex-Client-Identifier': CLIENT_ID,
  });
  return `${base}?${params}`;
}

export function getDirectStreamUrl(server: PlexServer, partKey: string): string {
  return `${server.baseUrl}${partKey}?X-Plex-Token=${server.accessToken}`;
}

// ── Thumb proxy ───────────────────────────────────────────────────────────────

export function thumbUrl(server: PlexServer, thumbPath: string, w = 400, h = 225): string {
  if (!thumbPath) return '';
  const params = new URLSearchParams({
    url: `${server.baseUrl}${thumbPath}?X-Plex-Token=${server.accessToken}`,
    w: String(w),
    h: String(h),
  });
  return `/api/plex/image?${params}`;
}

// ── Internals ─────────────────────────────────────────────────────────────────

function plexHeaders(token?: string): HeadersInit {
  const h: Record<string, string> = {
    'X-Plex-Client-Identifier': CLIENT_ID,
    'X-Plex-Product': CLIENT_NAME,
    'X-Plex-Version': '1.0.0',
    'X-Plex-Platform': 'Web',
    'Accept': 'application/json',
  };
  if (token) h['X-Plex-Token'] = token;
  return h;
}

async function plexFetch(server: PlexServer, path: string): Promise<any> {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${server.baseUrl}${path}${sep}X-Plex-Token=${server.accessToken}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Plex fetch failed: ${path} → ${res.status}`);
  return res.json();
}

function normMedia(m: any, server: PlexServer, type: 'movie' | 'show'): PlexMedia {
  const genres: string[] = (m.Genre ?? []).map((g: any) => g.tag);
  return {
    id: String(m.ratingKey),
    title: m.title,
    type,
    year: m.year,
    duration: m.duration,
    thumb: m.thumb ? thumbUrl(server, m.thumb) : undefined,
    summary: m.summary,
    genre: genres[0],
    contentRating: m.contentRating,
    seasons: type === 'show' ? m.childCount : undefined,
    leafCount: m.leafCount,
  };
}
