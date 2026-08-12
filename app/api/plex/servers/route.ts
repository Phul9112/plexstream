import { NextRequest, NextResponse } from 'next/server';
import { getServers } from '@/lib/plex';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });
  try {
    const servers = await getServers(token);
    return NextResponse.json({ servers });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
