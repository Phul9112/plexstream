'use client';
import { useEffect, useState } from 'react';

export default function Debug() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [running, setRunning] = useState(false);

  async function runDiagnostics() {
    setRunning(true);
    const out: Record<string, any> = {};

    // 1. What's in localStorage?
    const token = localStorage.getItem('plexToken');
    const serverRaw = localStorage.getItem('plexServer');
    const serversRaw = localStorage.getItem('plexServers');
    out.token = token ? token.slice(0, 8) + '…(hidden)' : 'NOT FOUND';
    out.server = serverRaw ? JSON.parse(serverRaw) : 'NOT FOUND';
    out.allServers = serversRaw ? JSON.parse(serversRaw) : 'NOT FOUND';
    setResults({ ...out });

    if (!token || !serverRaw) {
      out.error = 'No token or server in localStorage — need to sign in again';
      setResults({ ...out });
      setRunning(false);
      return;
    }

    const server = JSON.parse(serverRaw);

    // 2. Can we reach the Plex server directly?
    out.step = 'Testing direct Plex server connection…';
    setResults({ ...out });
    try {
      const res = await fetch(
        `${server.baseUrl}/identity?X-Plex-Token=${server.accessToken}`,
        { headers: { Accept: 'application/json' } }
      );
      const data = await res.json();
      out.directPing = { ok: res.ok, status: res.status, friendlyName: data?.MediaContainer?.friendlyName };
    } catch (e: any) {
      out.directPing = { ok: false, error: e.message };
    }
    setResults({ ...out });

    // 3. Try fetching libraries via our API
    out.step = 'Testing /api/plex/libraries…';
    setResults({ ...out });
    try {
      const res = await fetch('/api/plex/libraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(server),
      });
      const data = await res.json();
      out.libraries = { ok: res.ok, status: res.status, data };
    } catch (e: any) {
      out.libraries = { ok: false, error: e.message };
    }
    setResults({ ...out });

    // 4. Try fetching servers from plex.tv with stored token
    out.step = 'Testing /api/plex/servers…';
    setResults({ ...out });
    try {
      const res = await fetch(`/api/plex/servers?token=${token}`);
      const data = await res.json();
      out.freshServers = { ok: res.ok, status: res.status, data };
    } catch (e: any) {
      out.freshServers = { ok: false, error: e.message };
    }

    out.step = 'Done';
    setResults({ ...out });
    setRunning(false);
  }

  async function clearAndRetry() {
    // Re-fetch servers and update localStorage with fresh data
    const token = localStorage.getItem('plexToken');
    if (!token) { alert('No token found — please sign in first'); return; }

    const res = await fetch(`/api/plex/servers?token=${token}`);
    const { servers } = await res.json();
    if (!servers?.length) { alert('No servers found — check Plex Remote Access'); return; }

    localStorage.setItem('plexServer', JSON.stringify(servers[0]));
    localStorage.setItem('plexServers', JSON.stringify(servers));
    alert(`Updated! Found ${servers.length} server(s). First: ${servers[0].name} at ${servers[0].baseUrl}\n\nNow go back to /library`);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#f0f0f0', padding: 24, fontFamily: 'monospace' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#e5a00d', marginBottom: 8 }}>PlexStream Diagnostics</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Run this to find out why your library is not loading.</p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button
            onClick={runDiagnostics}
            disabled={running}
            style={{ background: '#e5a00d', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: running ? 0.7 : 1 }}
          >
            {running ? 'Running…' : 'Run diagnostics'}
          </button>
          <button
            onClick={clearAndRetry}
            style={{ background: '#1a1a24', color: '#e5a00d', border: '1px solid rgba(229,160,13,0.3)', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            Re-fetch server info
          </button>
          <button
            onClick={() => window.location.href = '/library'}
            style={{ background: '#1a1a24', color: '#888', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            ← Back to library
          </button>
        </div>

        {Object.keys(results).length > 0 && (
          <div style={{ background: '#12121a', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', padding: 20 }}>
            <pre style={{ fontSize: 12, color: '#f0f0f0', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.7 }}>
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
