import { NextRequest, NextResponse } from 'next/server';
import { 
  guardarPedido, 
  descontarStock, 
  getNumeroPedido, 
  enviarCorreoAPI, 
  getCatalogo
} from '@/lib/google-api';
import { datosPedidoSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = datosPedidoSchema.parse(body);
    
    // Obtener catálogo directo de Sheets para evitar manipulación de precios desde Frontend
    const catalogo = await getCatalogo();
    const esCont = data.comunidad === 'Comunidad Continental';
    
    // Validar precios y calcular total general de manera segura
    const librosSeguros = data.libros.map(itemFront => {
      const libroDB = catalogo.find(l => l.titulo === itemFront.titulo);
      if (!libroDB) {
        throw new Error(`El libro "${itemFront.titulo}" no existe o ya no está disponible.`);
      }
      
      const precioReal = esCont ? libroDB.precioCont : libroDB.precioNormal;
      return { ...itemFront, precioUnit: precioReal };
    });

    // Reemplazar la data insegura con la que acabamos de recalcular en backend
    data.libros = librosSeguros;
    const totalGeneral = librosSeguros.reduce((s, i) => s + (i.precioUnit * i.cantidad), 0);

    // Obtener y formatear el código de pedido N-AÑO
    const numPedido = await getNumeroPedido();
    const codigoPedido = `${numPedido}-${new Date().getFullYear()}`;

    // Ejecutar transacciones (Sheets + Correo)
    await Promise.all([
      guardarPedido(data, codigoPedido, totalGeneral),
      descontarStock(data.libros),
      enviarCorreoAPI({ codigoPedido, totalGeneral, data }),
    ]);

    return NextResponse.json({ ok: true, codigo: codigoPedido });
  } catch (e: any) {
    console.error('Error en POST /api/pedido:', e);
    
    let msg = 'Ocurrió un error al procesar el pedido';
    if (e.message) msg = e.message;
    
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}