import { NextRequest, NextResponse } from 'next/server';
import { searchLibrary } from '@/lib/plex';
import { PlexServer } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { server, query } = await req.json() as { server: PlexServer; query: string };
    const items = await searchLibrary(server, query);
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
