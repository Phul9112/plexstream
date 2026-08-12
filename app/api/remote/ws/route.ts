// Next.js App Router WebSocket route
// Works on Vercel via their WebSocket support, or on any Node server.
// Falls back to long-polling via /api/remote/poll if WS unavailable.

import { NextRequest } from 'next/server';
import { createSession, getSession, sessionState } from '@/lib/sessions';

// Vercel's WebSocket upgrade is handled through the SOCKET property on the
// underlying HTTP IncomingMessage. We expose this via a custom server or the
// Vercel edge runtime. For standard deployment, use the custom server below.

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code')?.toUpperCase();
  const role = searchParams.get('role'); // 'host' | 'remote'

  if (!code || !role) {
    return new Response('Missing code or role', { status: 400 });
  }

  // When not using a custom server, we return session state via HTTP
  // and rely on the client to poll. Full WS is wired in server.ts below.
  const session = getSession(code) ?? createSession(code);
  return Response.json({ code: session.code, state: sessionState(session) });
}

export async function POST(req: NextRequest) {
  const { code, command, payload } = await req.json();
  const session = getSession(code?.toUpperCase());
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });

  switch (command) {
    case 'queue-update':
      session.queue = payload.queue;
      session.nowPlaying = payload.nowPlaying ?? session.nowPlaying;
      break;
    case 'play':
      session.paused = false;
      if (payload?.item) session.nowPlaying = payload.item;
      break;
    case 'pause':
      session.paused = true;
      break;
    case 'next':
      if (session.queue.length > 0) {
        session.nowPlaying = session.queue.shift()!;
        session.paused = false;
      }
      break;
  }

  // Forward to the other peer via their WebSocket if connected
  const ws = command === 'queue-update' || command === 'play' || command === 'next'
    ? session.hostWs
    : session.remoteWs;

  if (ws && (ws as any).readyState === 1 /* OPEN */) {
    (ws as any).send(JSON.stringify({ command, payload, state: sessionState(session) }));
  }

  return Response.json({ ok: true, state: sessionState(session) });
}
