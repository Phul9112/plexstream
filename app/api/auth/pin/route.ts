import { NextResponse } from 'next/server';

const CLIENT_ID = process.env.NEXT_PUBLIC_PLEX_CLIENT_ID!;

export async function POST() {
  try {
    const res = await fetch('https://plex.tv/api/v2/pins', {
      method: 'POST',
      headers: {
        'X-Plex-Client-Identifier': CLIENT_ID,
        'X-Plex-Product': 'PlexStream for Tesla',
        'X-Plex-Version': '1.0.0',
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ strong: 'true' }),
    });
    if (!res.ok) throw new Error(`Plex error ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ id: data.id, code: data.code });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
