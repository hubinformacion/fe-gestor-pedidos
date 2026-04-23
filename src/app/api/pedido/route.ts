import { NextRequest, NextResponse } from 'next/server';
import { 
  guardarPedido, 
  descontarStock, 
  getNumeroPedido, 
  enviarCorreoAPI, 
  getCatalogo
} from '@/lib/google-api';
import { datosPedidoSchema } from '@/lib/validations';
import { determinarTipoCorreo, DELIVERY_PRECIO_LIMA, DELIVERY_PRECIO_PROVINCIA } from '@/lib/types';

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
    const subtotalLibros = librosSeguros.reduce((s, i) => s + (i.precioUnit * i.cantidad), 0);

    // Calcular costo de delivery
    const costoDelivery = data.tipoEntrega === 'Envío / Delivery'
      ? (data.zonaDelivery === 'Provincia' ? DELIVERY_PRECIO_PROVINCIA : DELIVERY_PRECIO_LIMA)
      : 0;

    const totalGeneral = subtotalLibros + costoDelivery;

    // Determinar tipo de correo según unidades de negocio de los libros
    const unidadesDelPedido = librosSeguros.map(item => {
      const libro = catalogo.find(l => l.titulo === item.titulo);
      return libro?.unidadNegocio || 'Universidad Continental';
    });
    const tipoCorreo = determinarTipoCorreo(unidadesDelPedido);

    // Obtener y formatear el código de pedido N-AÑO
    const numPedido = await getNumeroPedido();
    const codigoPedido = `${numPedido}-${new Date().getFullYear()}`;

    // Ejecutar transacciones (Sheets + Correo)
    await Promise.all([
      guardarPedido(data, codigoPedido, totalGeneral),
      descontarStock(data.libros),
      enviarCorreoAPI({ codigoPedido, totalGeneral, costoDelivery, data, tipoCorreo }),
    ]);

    return NextResponse.json({ ok: true, codigo: codigoPedido });
  } catch (e: any) {
    console.error('Error en POST /api/pedido:', e);
    
    let msg = 'Ocurrió un error al procesar el pedido';
    if (e.message) msg = e.message;
    
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}