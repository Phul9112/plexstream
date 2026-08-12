import { NextRequest, NextResponse } from 'next/server';
import { getLibraries } from '@/lib/plex';
import { PlexServer } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const server: PlexServer = await req.json();
    const libraries = await getLibraries(server);
    return NextResponse.json({ libraries });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
