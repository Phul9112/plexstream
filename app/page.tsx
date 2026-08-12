'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignIn() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If we already have a token, go straight to library
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('plexToken');
      const server = localStorage.getItem('plexServer');
      if (token && server) router.replace('/library');
    }
  }, [router]);

  async function handleSignIn() {
    setLoading(true);
    setError('');
    try {
      // 1. Create a Plex PIN
      const res = await fetch('/api/auth/pin', { method: 'POST' });
      const { id, code } = await res.json();
      if (!id) throw new Error('Could not create Plex pin');

      // Store pin id for polling after redirect
      sessionStorage.setItem('plexPinId', String(id));
      sessionStorage.setItem('plexPinCode', code);

      // 2. Redirect user to Plex auth
      const redirectUri = `${window.location.origin}/auth/callback`;
      const params = new URLSearchParams({
        clientID: process.env.NEXT_PUBLIC_PLEX_CLIENT_ID!,
        code,
        context_device_name: 'PlexStream for Tesla',
        forwardUrl: redirectUri,
      });
      window.location.href = `https://app.plex.tv/auth#?${params}`;
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.14em', color: 'var(--accent)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>
          PlexStream
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.2, marginBottom: 10 }}>
          Your Plex library,<br />on your Tesla screen.
        </h1>
        <p style={{ fontSize: 14, color: 'var(--sub)', maxWidth: 340, lineHeight: 1.65 }}>
          Browse movies and TV shows from your personal Plex server. Built for passenger viewing and Camp Mode.
        </p>
      </div>

      <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: 28, width: '100%', maxWidth: 340, textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--accent-dim)', border: '1px solid var(--accent-bdr)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 22 }}>🎬</div>
        <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>Sign in with Plex</h2>
        <p style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.6, marginBottom: 22 }}>
          You'll be redirected to Plex to authorize access. Your token is stored only in this browser.
        </p>

        {error && (
          <div style={{ background: '#e0525222', border: '1px solid #e0525244', borderRadius: 8, padding: '9px 12px', color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={loading}
          style={{ width: '100%', background: loading ? '#b07a0a' : 'var(--accent)', color: '#000', border: 'none', borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: 14, opacity: loading ? 0.8 : 1 }}
        >
          {loading ? 'Opening Plex…' : 'Continue with Plex →'}
        </button>

        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 14, lineHeight: 1.5 }}>
          For passenger or safely parked use only. Drivers must never interact with video while driving.
        </p>
      </div>
    </div>
  );
}
