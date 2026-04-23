import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { DatosPedido, EstadoPedido, ItemPedido, Libro, Pedido, TipoCorreo, DELIVERY_PRECIO_LIMA, DELIVERY_PRECIO_PROVINCIA } from './types';
import { generarEmailHTML } from './email-template';
import { obtenerMarcaTemporalActual } from './date-utils';

function getOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return oauth2Client;
}

function parsearNumeroSeguro(valor: any): number {
  if (!valor) return 0;
  // Convertimos a string, quitamos comas (miles) y letras/símbolos de moneda, dejamos solo números y puntos
  const limpio = String(valor).replace(/,/g, '').replace(/[^0-9.-]/g, '');
  return parseFloat(limpio) || 0;
}

export async function getCatalogo(): Promise<Libro[]> {
  const auth = getOAuth2Client();
  const sheets = google.sheets({ version: 'v4', auth });
  
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: 'items!A2:G',
  });

  return (res.data.values || [])
    .filter(r => r[0] || r[1])
    .map(r => {
      // Soportar celdas Checkbox (TRUE/FALSE) o texto libre ("Activo", "Inactivo")
      const rawEstado = r[5] ? String(r[5]).trim().toUpperCase() : 'TRUE';
      const isActive = rawEstado === 'TRUE' || rawEstado === 'VERDADERO' || rawEstado === 'ACTIVO';
      const estado = isActive ? 'Activo' : 'Inactivo';
      
      // Unidad de negocio (columna G)
      const rawUnidad = r[6] ? String(r[6]).trim() : 'Universidad Continental';
      const unidadMap: Record<string, Libro['unidadNegocio']> = {
        'universidad continental': 'Universidad Continental',
        'instituto continental': 'Instituto Continental',
        'posgrado': 'Posgrado',
      };
      const unidadNegocio = unidadMap[rawUnidad.toLowerCase()] || 'Universidad Continental';

      return {
        id: String(r[0] ?? ''),
        titulo: String(r[1] ?? ''),
        precioNormal: parsearNumeroSeguro(r[2]),
        precioCont: parsearNumeroSeguro(r[3]),
        stock: parsearNumeroSeguro(r[4]),
        estado,
        unidadNegocio,
      };
    });
}

export async function descontarStock(items: ItemPedido[]): Promise<void> {
  const auth = getOAuth2Client();
  const sheets = google.sheets({ version: 'v4', auth });
  const ssId = process.env.GOOGLE_SPREADSHEET_ID!;
  
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ssId,
    range: 'items!A2:G',
  });
  
  const rows = res.data.values || [];
  const updates = [];
  
  for (const item of items) {
    const idx = rows.findIndex(r => String(r[1]) === item.titulo);
    if (idx === -1) continue;
    
    const stockActual = parseInt(rows[idx][4]) || 0;
    const nuevoStock = Math.max(0, stockActual - item.cantidad);
    
    updates.push({
      range: `items!E${idx + 2}`,
      values: [[nuevoStock]],
    });
  }
  
  if (!updates.length) return;
  
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: ssId,
    requestBody: { valueInputOption: 'RAW', data: updates },
  });
}

export async function getNumeroPedido(): Promise<number> {
  const auth = getOAuth2Client();
  const sheets = google.sheets({ version: 'v4', auth });
  
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: `Pedidos!A:A`,
  });
  
  const totalRows = res.data.values?.length || 1;
  return Math.max(totalRows, 1);
}

export async function guardarPedido(
  data: DatosPedido,
  codigoPedido: string,
  totalGeneral: number
): Promise<void> {
  const auth = getOAuth2Client();
  const sheets = google.sheets({ version: 'v4', auth });
  const ssId = process.env.GOOGLE_SPREADSHEET_ID!;
  
  const esCont = data.comunidad === 'Comunidad Continental';
  const marca = obtenerMarcaTemporalActual();
  const librosStr = data.libros.map(i => `${i.titulo} x${i.cantidad}`).join(' | ');
  const cantTotal = data.libros.reduce((s, i) => s + i.cantidad, 0);
  
  // Detalle de entrega
  const entregaDetalle = data.tipoEntrega === 'Envío / Delivery'
    ? `${data.direccion}, ${data.zonaDelivery === 'Provincia' ? data.departamento : 'Lima/Callao'}`
    : data.campusRecojo || '';

  // Receptor info
  const receptorStr = data.receptorTipo === 'Otra persona'
    ? `${data.receptorNombre} (${data.receptorDocumento})`
    : data.receptorTipo || '';

  const fila = [
    marca, // A: Marca temporal
    esCont ? 'Continental' : 'Externo', // B: Tipo Cliente
    `${data.nombres} ${data.apellidos}`, // C: Nombre
    data.email, // D: Correo
    data.telefono, // E: Telefono
    data.tipoDoc, // F: Tipo doc
    data.nroDoc, // G: Num doc
    data.sede || '', // H: Sede (vacio si externo)
    librosStr, // I: Libros
    cantTotal, // J: Cantidad
    data.tipoEntrega, // K: Tipo entrega
    entregaDetalle, // L: Detalle entrega
    `S/ ${totalGeneral.toFixed(2)}`, // M: Total
    codigoPedido, // N: Codigo
    '', // O: Observaciones
    'Pendiente', // P: Estado
    '', // Q: Atendido por
    '', // R: Fecha inicio atencion
    '', // S: Fecha fin atencion
    data.zonaDelivery || '', // T: Zona Delivery
    data.referenciaDelivery || '', // U: Referencia dirección
    receptorStr, // V: Receptor
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: ssId,
    range: `Pedidos!A:V`,
    valueInputOption: 'RAW',
    requestBody: { values: [fila] },
  });
}

export async function enviarCorreoAPI(params: {
  codigoPedido: string;
  totalGeneral: number;
  costoDelivery: number;
  data: DatosPedido;
  tipoCorreo: TipoCorreo;
}) {
  const auth = getOAuth2Client();
  const gmail = google.gmail({ version: 'v1', auth });

  const { codigoPedido, totalGeneral, costoDelivery, data, tipoCorreo } = params;
  const marca = obtenerMarcaTemporalActual();
  const subtotalLibros = (totalGeneral - costoDelivery).toFixed(2);
  
  const htmlBody = generarEmailHTML({
    codigoPedido,
    nombreUsuario: `${data.nombres} ${data.apellidos}`,
    email: data.email,
    telefono: data.telefono,
    tipoDoc: data.tipoDoc,
    nroDoc: data.nroDoc,
    comunidad: data.comunidad === 'Comunidad Continental'
      ? `Comunidad Continental${data.sede ? ' — ' + data.sede : ''}`
      : 'Público externo',
    items: data.libros,
    totalGeneral: totalGeneral.toFixed(2),
    subtotalLibros,
    tipoEntrega: data.tipoEntrega,
    campusRecojo: data.tipoEntrega === 'Recojo en campus' ? data.campusRecojo : undefined,
    direccionDelivery: data.tipoEntrega === 'Envío / Delivery'
      ? `${data.direccion}, ${data.zonaDelivery === 'Provincia' ? data.departamento : 'Lima/Callao'}`
      : undefined,
    zonaDelivery: data.zonaDelivery,
    costoDelivery,
    referenciaDelivery: data.referenciaDelivery,
    receptorInfo: data.receptorTipo === 'Otra persona'
      ? `${data.receptorNombre} (${data.receptorDocumento})`
      : data.receptorTipo === 'Yo mismo(a)' ? 'El/La comprador(a)' : undefined,
    marcaTemporal: marca,
    tipoCorreo,
  });

  const asunto = `[Pedido N.° ${codigoPedido}] ${data.nombres} ${data.apellidos}`;
  const ccList = process.env.EMAIL_CC || '';

  // ── Determinar PDF a adjuntar (solo si no es mixto) ──
  let pdfBuffer: Buffer | null = null;
  let pdfFilename = '';
  if (tipoCorreo !== 'mixto') {
    pdfFilename = tipoCorreo === 'instituto'
      ? 'guia-pago-instituto.pdf'
      : 'guia-pago-universidad.pdf';
    const pdfPath = path.join(process.cwd(), 'public', 'docs', pdfFilename);
    try {
      pdfBuffer = fs.readFileSync(pdfPath);
    } catch {
      // PDF no encontrado — enviar sin adjunto
      console.warn(`PDF no encontrado: ${pdfPath}. Se enviará sin adjunto.`);
      pdfBuffer = null;
    }
  }

  // ── Construir mensaje MIME ──
  const subjectB64 = Buffer.from(asunto).toString('base64');
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  let message: string;

  if (pdfBuffer) {
    // Multipart con adjunto
    const pdfBase64 = pdfBuffer.toString('base64');
    message = [
      `From: Fondo Editorial <fondoeditorial@continental.edu.pe>`,
      `To: ${data.email}`,
      `Cc: ${ccList}`,
      `Subject: =?utf-8?B?${subjectB64}?=`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(htmlBody).toString('base64'),
      '',
      `--${boundary}`,
      `Content-Type: application/pdf; name="${pdfFilename}"`,
      `Content-Disposition: attachment; filename="${pdfFilename}"`,
      'Content-Transfer-Encoding: base64',
      '',
      pdfBase64,
      '',
      `--${boundary}--`,
    ].join('\n');
  } else {
    // Sin adjunto
    message = [
      `From: Fondo Editorial <fondoeditorial@continental.edu.pe>`,
      `To: ${data.email}`,
      `Cc: ${ccList}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: =?utf-8?B?${subjectB64}?=`,
      '',
      htmlBody,
    ].join('\n');
  }

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });
}

// ----------------- FUNCIONES PARA EL DASHBOARD ----------------- //

export async function getTodosPedidos(): Promise<Pedido[]> {
  const auth = getOAuth2Client();
  const sheets = google.sheets({ version: 'v4', auth });
  
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: 'Pedidos!A2:V',
  });

  return (res.data.values || [])
    .filter(r => r[0]) // Filtrar filas vacías (que no tengan marca temporal)
    .map(r => ({
      fecha: r[0] || '',
      tipo: (r[1] as 'Continental' | 'Externo') || 'Externo',
      nombre: r[2] || '',
      email: r[3] || '',
      telefono: r[4] || '',
      tipoDoc: r[5] || '',
      nroDoc: r[6] || '',
      sede: r[7] || '',
      libros: r[8] || '',
      cantidad: parseInt(r[9]) || 0,
      tipoEntrega: r[10] || '',
      detalleEntrega: r[11] || '',
      total: r[12] || '',
      codigo: r[13] || '',
      observaciones: r[14] || '',
      estado: (r[15] as EstadoPedido) || 'Pendiente',
      atendidoPor: r[16] || '',
      fechaInicioAtencion: r[17] || '',
      fechaFinAtencion: r[18] || '',
      zonaDelivery: r[19] || '',
      referenciaDelivery: r[20] || '',
      receptor: r[21] || '',
    }));
}

export async function actualizarEstadoPedido(
  codigo: string,
  updates: {
    estado?: string;
    observaciones?: string;
    atendidoPor?: string;
    setInicio?: boolean;
    setFin?: boolean;
  }
): Promise<void> {
  const auth = getOAuth2Client();
  const sheets = google.sheets({ version: 'v4', auth });
  const ssId = process.env.GOOGLE_SPREADSHEET_ID!;

  // 1. Obtener toda la tabla para encontrar la fila
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ssId,
    range: 'Pedidos!A:V',
  });
  
  const rows = res.data.values || [];
  // El código de pedido está en la columna N (índice 13)
  const idx = rows.findIndex(r => String(r[13]) === codigo);
  if (idx === -1) throw new Error(`Pedido no encontrado: ${codigo}`);

  const currentRow = rows[idx];
  
  // 2. Preparar valores de actualización preservando lo que ya existía
  const newObservaciones = updates.observaciones !== undefined ? updates.observaciones : (currentRow[14] || '');
  const newEstado = updates.estado !== undefined ? updates.estado : (currentRow[15] || 'Pendiente');
  const newAtendido = updates.atendidoPor !== undefined ? updates.atendidoPor : (currentRow[16] || '');
  
  // Lógica de fechas (solo sobreescribe si la bandera está y el campo actual está vacío, o la regla dicta)
  // Col Q=16, R=17, S=18
  const currentInicio = currentRow[17] || '';
  const currentFin = currentRow[18] || '';
  
  const newInicio = (updates.setInicio && !currentInicio) 
    ? obtenerMarcaTemporalActual() 
    : currentInicio;
    
  const newFin = (updates.setFin && !currentFin) 
    ? obtenerMarcaTemporalActual() 
    : currentFin;

  // 3. Escribir actualización en ese rango específico (Columnas O a S = 14 a 18)
  await sheets.spreadsheets.values.update({
    spreadsheetId: ssId,
    range: `Pedidos!O${idx + 1}:S${idx + 1}`,
    valueInputOption: 'RAW',
    requestBody: { 
      values: [[newObservaciones, newEstado, newAtendido, newInicio, newFin]] 
    },
  });
}

export async function guardarLibro(libro: Partial<Libro>): Promise<void> {
  const auth = getOAuth2Client();
  const sheets = google.sheets({ version: 'v4', auth });
  const ssId = process.env.GOOGLE_SPREADSHEET_ID!;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ssId,
    range: 'items!A:G',
  });
  
  const rows = res.data.values || [];

  // Si hay ID, intentamos actualizar
  if (libro.id) {
    const idx = rows.findIndex(r => String(r[0]) === libro.id);
    if (idx > -1) {
      const currentRow = rows[idx];
      const titulo = libro.titulo ?? currentRow[1];
      const precioNormal = libro.precioNormal ?? currentRow[2];
      const precioCont = libro.precioCont ?? currentRow[3];
      const stock = libro.stock ?? currentRow[4];
      const unidadNegocio = libro.unidadNegocio ?? currentRow[6] ?? 'Universidad Continental';
      
      let estadoGuardado = currentRow[5];
      if (libro.estado) {
        estadoGuardado = libro.estado === 'Inactivo' ? 'FALSE' : 'TRUE';
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId: ssId,
        range: `items!B${idx + 1}:G${idx + 1}`, // Columnas B a G
        valueInputOption: 'RAW',
        requestBody: { values: [[titulo, precioNormal, precioCont, stock, estadoGuardado, unidadNegocio]] },
      });
      return;
    }
  }

  // Si no hay ID o no se encontró, insertamos nueva fila al final
  const newId = libro.id || Date.now().toString(); // Fallback para ID
  
  // Guardar como booleano (TRUE/FALSE) para que la celda checkbox en sheets funcione
  const estadoGuardado = libro.estado === 'Inactivo' ? 'FALSE' : 'TRUE';
  
  const fila = [
    newId,
    libro.titulo || 'Sin título',
    libro.precioNormal || 0,
    libro.precioCont || 0,
    libro.stock || 0,
    estadoGuardado,
    libro.unidadNegocio || 'Universidad Continental',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: ssId,
    range: 'items!A:G',
    valueInputOption: 'RAW',
    requestBody: { values: [fila] },
  });
}