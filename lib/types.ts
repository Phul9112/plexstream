export interface PlexServer {
  name: string;
  scheme: string;
  host: string;
  port: number;
  accessToken: string;
  baseUrl: string; // constructed: scheme://host:port
}

export interface PlexLibrary {
  key: string;
  title: string;
  type: 'movie' | 'show';
}

export interface PlexMedia {
  id: string;
  title: string;
  type: 'movie' | 'show';
  year?: number;
  duration?: number; // ms
  thumb?: string;    // path on plex server, proxied through /api/plex/image
  summary?: string;
  genre?: string;
  contentRating?: string;
  leafCount?: number; // episodes for shows
  // show only
  seasons?: number;
}

export interface RemoteSession {
  code: string;
  hostId: string | null;
  remoteId: string | null;
  queue: PlexMedia[];
  nowPlaying: PlexMedia | null;
  paused: boolean;
  createdAt: number;
}

export interface RemoteCommand {
  type: 'play' | 'pause' | 'next' | 'seek' | 'queue-update' | 'state-sync';
  payload?: unknown;
}
