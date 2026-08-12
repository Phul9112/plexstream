import { NextRequest, NextResponse } from 'next/server';
import { getLibraryItems } from '@/lib/plex';
import { PlexServer } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { server, sectionKey, type, start, size } = await req.json() as {
      server: PlexServer;
      sectionKey: string;
      type: 'movie' | 'show';
      start?: number;
      size?: number;
    };
    const result = await getLibraryItems(server, sectionKey, type, start ?? 0, size ?? 50);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
