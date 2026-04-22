import { NextRequest, NextResponse } from 'next/server';
import { getCatalogo, guardarLibro } from '@/lib/google-api';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    const libros = await getCatalogo();
    
    // Si tiene token de dashboard, devolvemos todo (Activos e Inactivos)
    if (token === process.env.DASHBOARD_SECRET) {
      return NextResponse.json(libros);
    }
    
    // Si no (frontend público), filtramos y devolvemos solo los que tienen estado "Activo"
    const activos = libros.filter(l => l.estado.toLowerCase() === 'activo');
    return NextResponse.json(activos);
  } catch (e: any) {
    console.error('Error GET /api/catalogo:', e);
    return NextResponse.json({ error: 'Error al obtener el catálogo' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    if (token !== process.env.DASHBOARD_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const body = await req.json();
    await guardarLibro(body);
    
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Error POST /api/catalogo:', e);
    return NextResponse.json({ error: 'Error al guardar el libro' }, { status: 500 });
  }
}