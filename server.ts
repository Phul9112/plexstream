// Custom Next.js server that adds real WebSocket support for Phone Remote.
// Run with: node server.js (after build) or ts-node server.ts (dev)
// On Vercel: this isn't needed — Vercel handles WS natively on Pro plans.
// On Railway / Render / Fly.io: set start command to "node server.js"

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { createSession, getSession, sessionState } from './lib/sessions';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket, req: any) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const code = url.searchParams.get('code')?.toUpperCase();
    const role = url.searchParams.get('role'); // 'host' | 'remote'

    if (!code || !role) { ws.close(1008, 'Missing code or role'); return; }

    let session = getSession(code);
    if (!session && role === 'host') {
      session = createSession(code);
    }
    if (!session) { ws.close(1008, 'Session not found'); return; }

    if (role === 'host') {
      session.hostWs = ws;
      // Send current state to host on connect
      ws.send(JSON.stringify({ type: 'state-sync', state: sessionState(session) }));
    } else {
      session.remoteWs = ws;
      // Send current state to remote on connect
      ws.send(JSON.stringify({ type: 'state-sync', state: sessionState(session) }));
    }

    ws.on('message', (raw: Buffer) => {
      if (!session) return;
      try {
        const msg = JSON.parse(raw.toString());
        const { command, payload } = msg;

        switch (command) {
          case 'queue-update':
            session.queue = payload.queue ?? [];
            session.nowPlaying = payload.nowPlaying ?? session.nowPlaying;
            break;
          case 'play':
            session.paused = false;
            if (payload?.item) session.nowPlaying = payload.item;
            break;
          case 'pause':
            session.paused = !session.paused;
            break;
          case 'next':
            if (session.queue.length > 0) {
              session.nowPlaying = session.queue.shift()!;
              session.paused = false;
            }
            break;
        }

        const state = sessionState(session);
        const outbound = JSON.stringify({ type: command, state });

        // Relay to the other peer
        const peer = role === 'host' ? session.remoteWs : session.hostWs;
        if (peer && peer.readyState === WebSocket.OPEN) peer.send(outbound);
        // Echo back current state to sender
        if (ws.readyState === WebSocket.OPEN) ws.send(outbound);

      } catch (e) {
        console.error('WS message error', e);
      }
    });

    ws.on('close', () => {
      if (!session) return;
      if (role === 'host') session.hostWs = null;
      else session.remoteWs = null;
    });
  });

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url!);
    if (pathname === '/api/remote/socket') {
      wss.handleUpgrade(req, socket as any, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  const port = parseInt(process.env.PORT ?? '3000', 10);
  server.listen(port, () => {
    console.log(`> PlexStream ready on http://localhost:${port}`);
  });
});
