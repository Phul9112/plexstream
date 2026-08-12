'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlexServer } from '@/lib/types';

export default function Player() {
  const router = useRouter();
  const params = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [paused, setPaused] = useState(false);
  const [controls, setControls] = useState(true);
  const hideTimer = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const id = params.get('id');
    const srv = localStorage.getItem('plexServer');
    if (!id || !srv) { router.replace('/library'); return; }

    const server: PlexServer = JSON.parse(srv);
    // Build direct stream URL — Plex serves the file directly from your server
    // For transcoding (needed for incompatible formats), switch to /video/:/transcode/universal/stream
    const streamUrl = `${server.baseUrl}/library/metadata/${id}/allLeaves?X-Plex-Token=${server.accessToken}`;

    // Fetch the first media part
    fetch(`${server.baseUrl}/library/metadata/${id}?X-Plex-Token=${server.accessToken}`, {
      headers: { Accept: 'application/json' },
    })
      .then(r => r.json())
      .then(data => {
        const meta = data?.MediaContainer?.Metadata?.[0];
        if (!meta) { setError('Could not load media'); return; }
        setTitle(meta.title);
        const part = meta.Media?.[0]?.Part?.[0];
        if (!part) { setError('No playable media found'); return; }
        setSrc(`${server.baseUrl}${part.key}?X-Plex-Token=${server.accessToken}`);
      })
      .catch(() => setError('Failed to load media info'));
  }, [params]);

  function resetHideTimer() {
    setControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), 3000);
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPaused(false); } else { v.pause(); setPaused(true); }
  }

  function seek(s: number) {
    if (videoRef.current) videoRef.current.currentTime += s;
  }

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 36 }}>⚠️</div>
      <div style={{ color: '#f0f0f0', fontSize: 16 }}>{error}</div>
      <button onClick={() => router.back()} style={{ background: 'var(--accent)', color: '#000', borderRadius: 8, padding: '10px 20px', fontWeight: 600 }}>← Back</button>
    </div>
  );

  return (
    <div style={{ background: '#000', minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseMove={resetHideTimer} onClick={resetHideTimer}>
      {src && (
        <video
          ref={videoRef}
          src={src}
          autoPlay
          style={{ width: '100%', maxHeight: '100vh' }}
          onPlay={() => setPaused(false)}
          onPause={() => setPaused(true)}
        />
      )}

      {/* Controls overlay */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 20, opacity: controls ? 1 : 0, transition: 'opacity 0.3s', pointerEvents: controls ? 'auto' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 14px', color: '#fff', fontSize: 13 }}>← Back</button>
          {title && <span style={{ color: '#fff', fontSize: 15, fontWeight: 500, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{title}</span>}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => seek(-10)} style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '12px 20px', color: '#fff', fontSize: 14 }}>−10s</button>
          <button onClick={togglePlay} style={{ background: 'var(--accent)', border: 'none', borderRadius: 10, padding: '12px 28px', color: '#000', fontSize: 18, fontWeight: 700 }}>
            {paused ? '▶' : '⏸'}
          </button>
          <button onClick={() => seek(10)} style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '12px 20px', color: '#fff', fontSize: 14 }}>+10s</button>
        </div>
      </div>
    </div>
  );
}
