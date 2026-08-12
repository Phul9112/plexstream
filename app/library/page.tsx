'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PlexMedia, PlexLibrary, PlexServer } from '@/lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(ms: number) {
  const m = Math.round(ms / 60000);
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function genCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

// ── Sub-components ────────────────────────────────────────────────────────────
function Badge({ label, color = 'var(--blue)' }: { label: string; color?: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', padding: '2px 6px', borderRadius: 4, background: color + '22', color, border: `1px solid ${color}44`, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function MediaCard({ item, onClick, inQueue }: { item: PlexMedia; onClick: (i: PlexMedia) => void; inQueue: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => onClick(item)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ cursor: 'pointer', borderRadius: 10, overflow: 'hidden', background: 'var(--card)', border: `1px solid ${hov ? 'var(--accent-bdr)' : 'var(--border)'}`, transition: 'all 0.15s', transform: hov ? 'translateY(-2px)' : 'none', position: 'relative' }}
    >
      {inQueue && <div style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, background: 'var(--accent)', borderRadius: 4, padding: '2px 6px', fontSize: 10, fontWeight: 700, color: '#000' }}>Queued</div>}
      {item.thumb
        ? <img src={item.thumb} alt={item.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
        : <div style={{ width: '100%', aspectRatio: '16/9', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{item.type === 'movie' ? '🎬' : '📺'}</div>
      }
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
          {item.year && <span style={{ fontSize: 11, color: 'var(--sub)' }}>{item.year}</span>}
          {item.genre && <Badge label={item.genre} />}
          {item.duration && item.type === 'movie' && <span style={{ fontSize: 11, color: 'var(--sub)' }}>{fmt(item.duration)}</span>}
          {item.seasons && <span style={{ fontSize: 11, color: 'var(--sub)' }}>{item.seasons}S</span>}
        </div>
      </div>
    </div>
  );
}

function DetailModal({ item, onClose, onAdd, inQueue, server }: { item: PlexMedia; onClose: () => void; onAdd: (i: PlexMedia) => void; inQueue: boolean; server: PlexServer }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', width: '100%', maxWidth: 540, overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
        {item.thumb
          ? <img src={item.thumb} alt={item.title} style={{ width: '100%', aspectRatio: '21/9', objectFit: 'cover' }} />
          : <div style={{ width: '100%', aspectRatio: '21/9', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>{item.type === 'movie' ? '🎬' : '📺'}</div>
        }
        <div style={{ padding: '18px 22px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 5 }}>{item.title}</h2>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                {item.year && <span style={{ fontSize: 12, color: 'var(--sub)' }}>{item.year}</span>}
                {item.contentRating && <Badge label={item.contentRating} color="var(--sub)" />}
                {item.genre && <Badge label={item.genre} />}
                {item.duration && item.type === 'movie' && <span style={{ fontSize: 12, color: 'var(--sub)' }}>{fmt(item.duration)}</span>}
                {item.seasons && <span style={{ fontSize: 12, color: 'var(--sub)' }}>{item.seasons} season{item.seasons > 1 ? 's' : ''}</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 10px', color: 'var(--sub)', fontSize: 12, flexShrink: 0, height: 'fit-content' }}>✕ Close</button>
          </div>
          {item.summary && <p style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.65, marginBottom: 18 }}>{item.summary}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { onAdd(item); onClose(); }}
              style={{ flex: 1, background: inQueue ? 'var(--surface)' : 'var(--accent)', color: inQueue ? 'var(--sub)' : '#000', border: `1px solid ${inQueue ? 'var(--border)' : 'var(--accent)'}`, borderRadius: 8, padding: '10px 0', fontWeight: 600, fontSize: 13 }}
            >
              {inQueue ? '✓ Already queued' : '+ Add to queue'}
            </button>
            <button
              onClick={() => { window.location.href = `/player?id=${item.id}`; }}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', color: 'var(--text)', fontSize: 13 }}
            >
              ▶ Play now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RemoteModal({ code, queue, onClose }: { code: string; queue: PlexMedia[]; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const remoteUrl = typeof window !== 'undefined' ? `${window.location.origin}/remote?code=${code}` : '';
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', width: '100%', maxWidth: 380, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ fontSize: 17, fontWeight: 600 }}>Phone remote</h2>
          <button onClick={onClose} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, padding: '4px 10px', color: 'var(--sub)', fontSize: 12 }}>✕</button>
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 18, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Session code</div>
          <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{code}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Enter on your phone at the URL below</div>
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 12px', marginBottom: 14, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3 }}>Remote URL</div>
          <div style={{ fontSize: 12, color: 'var(--accent)', wordBreak: 'break-all' }}>{remoteUrl}</div>
        </div>
        <button
          onClick={() => { navigator.clipboard?.writeText(remoteUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ width: '100%', background: copied ? 'rgba(82,192,122,0.12)' : 'var(--accent-dim)', border: `1px solid ${copied ? 'rgba(82,192,122,0.3)' : 'var(--accent-bdr)'}`, borderRadius: 8, padding: '10px 0', color: copied ? 'var(--green)' : 'var(--accent)', fontWeight: 600, fontSize: 13 }}
        >
          {copied ? '✓ Copied!' : 'Copy remote link'}
        </button>
        {queue.length > 0 && (
          <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>Queue ({queue.length})</div>
            {queue.slice(0, 3).map((item, i) => (
              <div key={item.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 0' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: 16 }}>{i + 1}</span>
                {item.thumb
                  ? <img src={item.thumb} alt="" style={{ width: 44, height: 26, objectFit: 'cover', borderRadius: 4 }} />
                  : <div style={{ width: 44, height: 26, background: 'var(--surface)', borderRadius: 4 }} />
                }
                <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
              </div>
            ))}
            {queue.length > 3 && <div style={{ fontSize: 11, color: 'var(--muted)', paddingTop: 4 }}>+{queue.length - 3} more</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Library() {
  const router = useRouter();
  const [server, setServer] = useState<PlexServer | null>(null);
  const [libraries, setLibraries] = useState<PlexLibrary[]>([]);
  const [activeLib, setActiveLib] = useState<PlexLibrary | null>(null);
  const [items, setItems] = useState<PlexMedia[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<PlexMedia[] | null>(null);
  const [tab, setTab] = useState<'browse' | 'queue'>('browse');
  const [selected, setSelected] = useState<PlexMedia | null>(null);
  const [queue, setQueue] = useState<PlexMedia[]>([]);
  const [showRemote, setShowRemote] = useState(false);
  const [safetyAck, setSafetyAck] = useState(false);
  const [code] = useState(genCode);
  const searchTimer = useRef<NodeJS.Timeout>();

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('plexToken');
    const srv = localStorage.getItem('plexServer');
    if (!token || !srv) { router.replace('/'); return; }
    const s: PlexServer = JSON.parse(srv);
    setServer(s);

    fetch('/api/plex/libraries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) })
      .then(r => r.json())
      .then(({ libraries: libs, error }) => {
        if (error || !libs?.length) { setLoading(false); return; }
        setLibraries(libs);
        setActiveLib(libs[0]);
        loadItems(s, libs[0], 0);
      });

    const savedQueue = localStorage.getItem('queue');
    if (savedQueue) setQueue(JSON.parse(savedQueue));
    setSafetyAck(!!localStorage.getItem('safetyAck'));
  }, []);

  // ── Load items ────────────────────────────────────────────────────────────
  async function loadItems(srv: PlexServer, lib: PlexLibrary, start: number) {
    if (start === 0) setLoading(true); else setLoadingMore(true);
    const res = await fetch('/api/plex/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server: srv, sectionKey: lib.key, type: lib.type, start, size: 50 }),
    });
    const { items: newItems, total: t } = await res.json();
    setItems(prev => start === 0 ? newItems : [...prev, ...newItems]);
    setTotal(t);
    setLoading(false);
    setLoadingMore(false);
  }

  // ── Search ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!server) return;
    clearTimeout(searchTimer.current);
    if (!search.trim()) { setSearchResults(null); return; }
    searchTimer.current = setTimeout(async () => {
      const res = await fetch('/api/plex/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server, query: search }),
      });
      const { items: results } = await res.json();
      setSearchResults(results ?? []);
    }, 400);
  }, [search, server]);

  // ── Queue persistence ─────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('queue', JSON.stringify(queue));
    // Sync queue to remote session
    if (code) {
      fetch('/api/remote/ws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, command: 'queue-update', payload: { queue } }),
      }).catch(() => {});
    }
  }, [queue, code]);

  function addToQueue(item: PlexMedia) {
    if (!queue.find(q => q.id === item.id)) setQueue(q => [...q, item]);
  }
  function removeFromQueue(id: string) { setQueue(q => q.filter(i => i.id !== id)); }
  function moveUp(i: number) { if (i === 0) return; setQueue(q => { const a = [...q]; [a[i-1], a[i]] = [a[i], a[i-1]]; return a; }); }
  function moveDown(i: number) { setQueue(q => { if (i >= q.length - 1) return q; const a = [...q]; [a[i], a[i+1]] = [a[i+1], a[i]]; return a; }); }
  function inQueue(id: string) { return !!queue.find(q => q.id === id); }

  function acknowledge() { localStorage.setItem('safetyAck', '1'); setSafetyAck(true); }
  function signOut() { localStorage.clear(); router.replace('/'); }

  const displayItems = searchResults ?? items;

  // ── Safety gate ───────────────────────────────────────────────────────────
  if (!safetyAck) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
      <div style={{ background: 'var(--card)', borderRadius: 16, border: '1px solid var(--border)', padding: 28, maxWidth: 380, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 14 }}>🚗</div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Safety first</h2>
        <p style={{ fontSize: 13, color: 'var(--sub)', lineHeight: 1.7, marginBottom: 22 }}>
          PlexStream is for <strong style={{ color: 'var(--text)' }}>passengers and safely parked</strong> use only.
          Drivers must never watch or interact with video while the vehicle is in motion.
        </p>
        <button
          onClick={acknowledge}
          style={{ width: '100%', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 10, padding: '12px 0', fontWeight: 700, fontSize: 14 }}
        >
          I understand — I'm a passenger or parked
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <header className="no-select" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--accent)', whiteSpace: 'nowrap' }}>PlexStream</div>
        <div style={{ flex: 1 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your library…"
          />
        </div>
        <button onClick={() => setShowRemote(true)} style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-bdr)', borderRadius: 8, padding: '7px 12px', color: 'var(--accent)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
          📱 Remote
        </button>
        <button onClick={signOut} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', color: 'var(--sub)', fontSize: 12, flexShrink: 0 }}>
          Sign out
        </button>
      </header>

      {/* Library tabs + browse/queue tabs */}
      <div className="no-select" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 16px', display: 'flex', gap: 2, overflowX: 'auto' }}>
        {libraries.map(lib => (
          <button
            key={lib.key}
            onClick={() => { setActiveLib(lib); setItems([]); setSearch(''); setSearchResults(null); if (server) loadItems(server, lib, 0); }}
            style={{ background: 'none', border: 'none', padding: '10px 14px', fontSize: 13, fontWeight: activeLib?.key === lib.key ? 600 : 400, color: activeLib?.key === lib.key ? 'var(--accent)' : 'var(--sub)', borderBottom: activeLib?.key === lib.key ? '2px solid var(--accent)' : '2px solid transparent', whiteSpace: 'nowrap' }}
          >
            {lib.type === 'movie' ? '🎬' : '📺'} {lib.title}
          </button>
        ))}
        <div style={{ width: 1, background: 'var(--border)', margin: '8px 8px' }} />
        <button
          onClick={() => setTab(tab === 'browse' ? 'queue' : 'browse')}
          style={{ background: 'none', border: 'none', padding: '10px 14px', fontSize: 13, fontWeight: tab === 'queue' ? 600 : 400, color: tab === 'queue' ? 'var(--accent)' : 'var(--sub)', borderBottom: tab === 'queue' ? '2px solid var(--accent)' : '2px solid transparent', whiteSpace: 'nowrap' }}
        >
          ⏭ Queue{queue.length ? ` (${queue.length})` : ''}
        </button>
      </div>

      {/* Content */}
      <main style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
        {tab === 'browse' && (
          <>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Loading library…</div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
                  {searchResults ? `${searchResults.length} results for "${search}"` : `${total} items`}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                  {displayItems.map(m => (
                    <MediaCard key={m.id} item={m} onClick={i => setSelected(i)} inQueue={inQueue(m.id)} />
                  ))}
                </div>
                {displayItems.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
                    {search ? `No results for "${search}"` : 'No items in this library'}
                  </div>
                )}
                {!searchResults && items.length < total && (
                  <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <button
                      onClick={() => { if (server && activeLib) loadItems(server, activeLib, items.length); }}
                      disabled={loadingMore}
                      style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 20px', color: 'var(--sub)', fontSize: 13 }}
                    >
                      {loadingMore ? 'Loading…' : `Load more (${total - items.length} remaining)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === 'queue' && (
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            {queue.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 14 }}>⏭</div>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Your queue is empty</div>
                <div style={{ fontSize: 13, color: 'var(--sub)' }}>Browse your library and add items here</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{queue.length} item{queue.length > 1 ? 's' : ''}</span>
                  <button onClick={() => setQueue([])} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', color: 'var(--red)', fontSize: 12 }}>Clear all</button>
                </div>
                {queue.map((item, i) => (
                  <div key={item.id} style={{ background: 'var(--card)', borderRadius: 10, border: '1px solid var(--border)', padding: '10px 12px', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 18, textAlign: 'center' }}>{i + 1}</span>
                    {item.thumb
                      ? <img src={item.thumb} alt="" style={{ width: 56, height: 33, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} />
                      : <div style={{ width: 56, height: 33, background: 'var(--surface)', borderRadius: 5, flexShrink: 0 }} />
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 2 }}>{item.year} · {item.type === 'movie' ? 'Movie' : 'TV'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      <button onClick={() => moveUp(i)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 7px', color: 'var(--sub)', fontSize: 12 }}>↑</button>
                      <button onClick={() => moveDown(i)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 7px', color: 'var(--sub)', fontSize: 12 }}>↓</button>
                      <button onClick={() => removeFromQueue(item.id)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 7px', color: 'var(--red)', fontSize: 12 }}>✕</button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => { if (queue[0]) router.push(`/player?id=${queue[0].id}`); }}
                  style={{ width: '100%', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 10, padding: '11px 0', fontWeight: 700, fontSize: 14, marginTop: 8 }}
                >
                  ▶ Play queue
                </button>
              </>
            )}
          </div>
        )}
      </main>

      {selected && server && (
        <DetailModal item={selected} onClose={() => setSelected(null)} onAdd={addToQueue} inQueue={inQueue(selected.id)} server={server} />
      )}
      {showRemote && (
        <RemoteModal code={code} queue={queue} onClose={() => setShowRemote(false)} />
      )}
    </div>
  );
}
