import { PlexMedia } from './types';

// Sessions live in Node.js process memory.
// On Vercel, use a Redis adapter for multi-instance deployments (see README).
// For single-dyno / single-region this works perfectly.

export interface Session {
  code: string;
  hostWs: import('ws').WebSocket | null;
  remoteWs: import('ws').WebSocket | null;
  queue: PlexMedia[];
  nowPlaying: PlexMedia | null;
  paused: boolean;
  createdAt: number;
}

declare global {
  // Survive Next.js hot-reload in dev
  // eslint-disable-next-line no-var
  var __sessions: Map<string, Session> | undefined;
}

export const sessions: Map<string, Session> =
  globalThis.__sessions ?? (globalThis.__sessions = new Map());

export function createSession(code: string): Session {
  const s: Session = {
    code,
    hostWs: null,
    remoteWs: null,
    queue: [],
    nowPlaying: null,
    paused: false,
    createdAt: Date.now(),
  };
  sessions.set(code, s);
  // Expire after 6 hours
  setTimeout(() => sessions.delete(code), 6 * 60 * 60 * 1000);
  return s;
}

export function getSession(code: string): Session | undefined {
  return sessions.get(code);
}

export function sessionState(s: Session) {
  return {
    queue: s.queue,
    nowPlaying: s.nowPlaying,
    paused: s.paused,
  };
}
