import { NextRequest, NextResponse } from 'next/server';
import { actualizarEstadoPedido } from '@/lib/google-api';
import { ESTADOS_FINALES } from '@/lib/types';

export async function PATCH(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (token !== process.env.DASHBOARD_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  
  try {
    const { codigo, estado, observaciones, atendidoPor } = await req.json();
    
    // Reglas de negocio para las fechas:
    // 1. Si se asigna un responsable → Fecha Inicio (siempre que haya atendidoPor)
    // 2. Si pasa a estado final (Entregado/Abandonado/Anulado) → Fecha Fin
    
    const setInicio = !!atendidoPor;
    const setFin = ESTADOS_FINALES.includes(estado);
    
    await actualizarEstadoPedido(codigo, {
      estado,
      observaciones,
      atendidoPor,
      setInicio,
      setFin
    });
    
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Error en PATCH /api/dashboard/estado:', e);
    return NextResponse.json({ error: 'Error al actualizar el estado' }, { status: 500 });
  }
}