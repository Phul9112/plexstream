import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID = process.env.NEXT_PUBLIC_PLEX_CLIENT_ID!;

export async function GET(req: NextRequest) {
  const pinId = req.nextUrl.searchParams.get('pinId');
  if (!pinId) return NextResponse.json({ error: 'pinId required' }, { status: 400 });

  try {
    const res = await fetch(`https://plex.tv/api/v2/pins/${pinId}`, {
      headers: {
        'X-Plex-Client-Identifier': CLIENT_ID,
        'X-Plex-Product': 'PlexStream for Tesla',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) return NextResponse.json({ token: null });
    const data = await res.json();
    return NextResponse.json({ token: data.authToken ?? null });
  } catch {
    return NextResponse.json({ token: null });
  }
}
