'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Completing sign in…');
  const [error, setError] = useState('');

  useEffect(() => {
    const pinId = sessionStorage.getItem('plexPinId');
    if (!pinId) { setError('No auth session found. Please try signing in again.'); return; }

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 30) {
        clearInterval(interval);
        setError('Sign-in timed out. Please try again.');
        return;
      }

      try {
        const res = await fetch(`/api/auth/check?pinId=${pinId}`);
        const { token } = await res.json();

        if (token) {
          clearInterval(interval);
          setStatus('Fetching your Plex servers…');

          // Fetch servers
          const sRes = await fetch(`/api/plex/servers?token=${token}`);
          const { servers, error: sErr } = await sRes.json();
          if (sErr || !servers?.length) {
            setError('No Plex servers found. Make sure your server is online.');
            return;
          }

          // Store in localStorage — stays across Tesla browser sessions
          localStorage.setItem('plexToken', token);
          localStorage.setItem('plexServer', JSON.stringify(servers[0]));
          localStorage.setItem('plexServers', JSON.stringify(servers));

          sessionStorage.removeItem('plexPinId');
          sessionStorage.removeItem('plexPinCode');

          setStatus('Done! Loading your library…');
          router.replace('/library');
        }
      } catch (e) {
        // Keep polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        {!error ? (
          <>
            <div style={{ fontSize: 36, marginBottom: 16, animation: 'spin 1.5s linear infinite', display: 'inline-block' }}>⏳</div>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>{status}</div>
            <div style={{ fontSize: 13, color: 'var(--sub)' }}>This only takes a moment…</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--red)', marginBottom: 16 }}>{error}</div>
            <button
              onClick={() => router.replace('/')}
              style={{ background: 'var(--accent)', color: '#000', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 14 }}
            >
              Try again
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
