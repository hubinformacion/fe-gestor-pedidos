import { NextRequest, NextResponse } from 'next/server';
import { getTodosPedidos, getCatalogo } from '@/lib/google-api';

export const dynamic = 'force-dynamic'; // Evitar que Next.js cachee esta ruta en producción

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (token !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  
  try {
    // Obtenemos en paralelo ambas hojas
    const [pedidos, catalogo] = await Promise.all([
      getTodosPedidos(),
      getCatalogo()
    ]);
    
    return NextResponse.json({ pedidos, catalogo });
  } catch (e: any) {
    console.error('Error GET /api/dashboard/data:', e);
    return NextResponse.json({ error: 'Error al obtener datos del dashboard' }, { status: 500 });
  }
}