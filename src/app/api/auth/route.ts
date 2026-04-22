import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (token === process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}
