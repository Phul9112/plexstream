'use client';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { PlexMedia } from '@/lib/types';

interface RemoteState {
  queue: PlexMedia[];
  nowPlaying: PlexMedia | null;
  paused: boolean;
}

export default function Remote() {
  const params = useSearchParams();
  const [inputCode, setInputCode] = useState(params.get('code')?.toUpperCase() ?? '');
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<RemoteState>({ queue: [], nowPlaying: null, paused: false });
  const [error, setError] = useState('');
  const pollRef = useRef<NodeJS.Timeout>();

  function startPolling(code: string) {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/remote/ws?code=${code}&role=remote`);
        if (res.ok) {
          const data = await res.json();
          if (data.state) setState(data.state);
        }
      } catch {}
    }, 2000);
  }

  async function connect() {
    const code = inputCode.trim().toUpperCase();
    if (code.length < 4) { setError('Enter the code shown on your Tesla'); return; }
    setError('');
    const res = await fetch(`/api/remote/ws?code=${code}&role=remote`);
    if (!res.ok) { setError('Session not found — check the code'); return; }
    const data = await res.json();
    if (data.state) setState(data.state);
    setConnected(true);
    startPolling(code);
  }

  async function send(command: string, payload?: unknown) {
    await fetch('/api/remote/ws', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: inputCode.toUpperCase(), command, payload }),
    });
    // Optimistic update
    if (command === 'play') setState(s => ({ ...s, paused: false }));
    if (command === 'pause') setState(s => ({ ...s, paused: true }));
    if (command === 'next') setState(s => ({
      ...s,
      nowPlaying: s.queue[0] ?? null,
      queue: s.queue.slice(1),
    }));
  }

  useEffect(() => {
    if (params.get('code')) connect();
    return () => clearInterval(pollRef.current);
  }, []);

  const btn = (label: string, onClick: () => void, accent = false) => (
    <button
      onClick={onClick}
      style={{ background: accent ? 'var(--accent)' : 'var(--card)', border: `1px solid ${accent ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 12, padding: '16px 0', color: accent ? '#000' : 'var(--text)', fontSize: accent ? 20 : 15, fontWeight: 600, width: '100%' }}
    >
      {label}
    </button>
  );

  if (!connected) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 320, textAlign: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.12em', color: 'var(--accent)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>PlexStream</div>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>Phone remote</h1>
        <p style={{ fontSize: 13, color: 'var(--sub)', marginBottom: 24 }}>Enter the code shown on your Tesla screen</p>
        <input
          value={inputCode}
          onChange={e => setInputCode(e.target.value.toUpperCase())}
          placeholder="Enter code (e.g. ABC123)"
          style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, letterSpacing: '0.18em', marginBottom: 12 }}
          maxLength={8}
          onKeyDown={e => e.key === 'Enter' && connect()}
        />
        {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button
          onClick={connect}
          style={{ width: '100%', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 10, padding: '13px 0', fontWeight: 700, fontSize: 15 }}
        >
          Connect →
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>PlexStream Remote</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--green)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
          Connected
        </div>
      </div>

      {/* Now playing */}
      <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: 16 }}>
        {state.nowPlaying ? (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
            {state.nowPlaying.thumb
              ? <img src={state.nowPlaying.thumb} alt="" style={{ width: 64, height: 38, objectFit: 'cover', borderRadius: 6 }} />
              : <div style={{ width: 64, height: 38, background: 'var(--surface)', borderRadius: 6 }} />
            }
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{state.nowPlaying.title}</div>
              <div style={{ fontSize: 12, color: 'var(--sub)' }}>{state.nowPlaying.year}</div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, textAlign: 'center' }}>Nothing playing</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: 8 }}>
          {btn('−10s', () => send('seek', { seconds: -10 }))}
          {btn(state.paused ? '▶ Play' : '⏸ Pause', () => send(state.paused ? 'play' : 'pause'), true)}
          {btn('⏭ Next', () => send('next'))}
        </div>
      </div>

      {/* Queue */}
      {state.queue.length > 0 && (
        <div style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Up next ({state.queue.length})</div>
          {state.queue.slice(0, 5).map((item, i) => (
            <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 18 }}>{i + 1}</span>
              {item.thumb
                ? <img src={item.thumb} alt="" style={{ width: 48, height: 28, objectFit: 'cover', borderRadius: 4 }} />
                : <div style={{ width: 48, height: 28, background: 'var(--surface)', borderRadius: 4 }} />
              }
              <div style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
        Controls PlexStream only — not your vehicle.
      </div>
    </div>
  );
}
