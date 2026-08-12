# PlexStream — Your Plex library on your Tesla

A Next.js PWA that lets you browse and play your Plex movies and TV shows directly in the Tesla browser. Includes a Phone Remote so passengers can control playback from their phone.

---

## How it works

1. **You visit your deployed URL** in the Tesla browser (bookmark it)
2. **Sign in with Plex** — redirects to `app.plex.tv`, authorizes, redirects back
3. **Browse your library** — movies and shows pulled live from your Plex server
4. **Build a queue** — add titles, reorder, play
5. **Phone Remote** — tap "Remote" on the Tesla screen, get a code, open `your-url/remote` on your phone, enter the code → control playback from your seat

---

## Setup (one-time)

### 1. Get a Plex API Client ID

1. Go to https://www.plex.tv/api/v2/pins (just to confirm the API works)
2. For your Client ID, generate a UUID: run `node -e "console.log(require('crypto').randomUUID())"` — or use any UUID generator
3. Copy it — you'll need it as `NEXT_PUBLIC_PLEX_CLIENT_ID`

### 2. Deploy to Railway (recommended — supports WebSockets, free tier)

```bash
# 1. Fork or push this repo to GitHub

# 2. Go to railway.app → New Project → Deploy from GitHub Repo → select your repo

# 3. Add environment variables in Railway dashboard:
NEXT_PUBLIC_PLEX_CLIENT_ID=your-uuid-here
NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app

# 4. Set the start command to:
node server.js

# 5. Add a build command:
npm run build && npx tsc server.ts --esModuleInterop --module commonjs --outDir .
```

### 3. Deploy to Vercel (easier, but WebSocket via polling)

```bash
npm i -g vercel
vercel

# Set env vars in Vercel dashboard or .env.local:
NEXT_PUBLIC_PLEX_CLIENT_ID=your-uuid-here
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

> **Note:** On Vercel's free tier, Phone Remote uses HTTP polling (every 2 seconds) instead of a real WebSocket connection. It still works — just slightly less instant. Upgrade to Vercel Pro or use Railway for true WebSocket.

### 4. Add your app URL to Plex (important!)

Plex requires your redirect URL to be allowlisted:
1. Go to https://plex.tv/api/v2/pins in your browser — not needed
2. Actually, Plex's OAuth will work with any `forwardUrl` — no allowlisting needed for the PIN-based flow this app uses. ✓

### 5. Plex Server Accessibility

Your Plex server needs to be reachable from the internet (not just your LAN) for the Tesla to stream from it. Options:
- **Plex Relay** (automatic, slower) — works out of the box if you have a Plex account
- **Plex Remote Access** — enable in Plex Settings → Remote Access
- **Tailscale** — if you run Tailscale on your Plex server and Tesla's hotspot device

---

## Local development

```bash
npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_PLEX_CLIENT_ID

npm run dev
# Visit http://localhost:3000
```

For WebSocket support locally:
```bash
npx ts-node server.ts
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_PLEX_CLIENT_ID` | ✓ | UUID identifying this app to Plex |
| `NEXT_PUBLIC_APP_URL` | ✓ | Your deployed URL (no trailing slash) |

---

## Architecture

```
Tesla browser                  Your deployed server           Your Plex server
──────────────                 ────────────────────           ─────────────────
/library page
  → search/browse         →    /api/plex/items           →   Plex HTTP API
  → thumbnail display     →    /api/plex/image (proxy)   →   Plex thumb URL
  → play                  →    /player?id=…              →   direct stream URL

/remote page (phone)
  → poll state            →    /api/remote/ws (GET)           (state in memory)
  → send command          →    /api/remote/ws (POST)
                          ↓
/library page             ←    WebSocket push (server.ts)
  (Tesla) receives
  play/pause/next
```

## Phone Remote — WebSocket vs Polling

The app uses real WebSockets when run via `server.ts` (Railway/Render/Fly.io).
On Vercel serverless, it falls back to HTTP polling every 2 seconds via the same `/api/remote/ws` route — commands still work, just with a ~2s delay.

To get real WebSockets on Vercel, add a Redis adapter (Upstash Redis is free):
- Store session state in Redis instead of `lib/sessions.ts` in-memory Map
- Use Vercel's WebSocket support (available on Pro plan)

---

## Security notes

- Your Plex token is stored in `localStorage` on the Tesla browser — it persists across sessions (good) but is accessible to any JS on the page (fine, since it's your own app)
- Thumbnail images are proxied through `/api/plex/image` to keep your Plex token server-side
- Stream URLs are generated client-side and include your token — this is standard Plex behavior
- Session codes are random 6-character strings and expire after 6 hours

---

## Plex compatibility

- ✅ Movies, TV shows
- ✅ Direct play (MP4, MKV — if your Plex server and Tesla browser support the codec)
- ⚠️ Transcoding — the player uses direct stream URLs; for transcoded HLS, update `getStreamUrl` in `lib/plex.ts`
- ✅ Works with Plex Pass and free Plex accounts
- ✅ Multiple Plex servers (first server is used by default; extend the UI to let user pick)
