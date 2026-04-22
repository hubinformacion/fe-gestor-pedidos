import { google } from 'googleapis';
import { DatosPedido, EstadoPedido, ItemPedido, Libro, Pedido } from './types';
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

export async function getCatalogo(): Promise<Libro[]> {
  const auth = getOAuth2Client();
  const sheets = google.sheets({ version: 'v4', auth });
  
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: 'items!A2:F',
  });

  return (res.data.values || [])
    .filter(r => r[0] || r[1])
    .map(r => ({
      id: String(r[0] ?? ''),
      titulo: String(r[1] ?? ''),
      precioNormal: parseFloat(r[2]) || 0,
      precioCont: parseFloat(r[3]) || 0,
      stock: parseInt(r[4]) || 0,
      estado: (r[5] as 'Activo' | 'Inactivo') || 'Inactivo',
    }));
}

export async function descontarStock(items: ItemPedido[]): Promise<void> {
  const auth = getOAuth2Client();
  const sheets = google.sheets({ version: 'v4', auth });
  const ssId = process.env.GOOGLE_SPREADSHEET_ID!;
  
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ssId,
    range: 'items!A2:F',
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
  
  return Math.max((res.data.values?.length || 1) - 1, 1);
}

export async function guardarPedido(
  data: DatosPedido,
  codigoPedido: string,
  totalGeneral: number
): Promise<void> {
  const auth = getOAuth2Client();
  const sheets = google.sheets({ version: 'v4', auth });
  const ssId = process.env.GOOGLE_SPREADSHEET_ID!;
  
  const esCont = data.comunidad === 'si';
  const marca = obtenerMarcaTemporalActual();
  const librosStr = data.libros.map(i => `${i.titulo} x${i.cantidad}`).join(' | ');
  const cantTotal = data.libros.reduce((s, i) => s + i.cantidad, 0);
  const entregaDetalle = data.tipoEntrega === 'delivery'
    ? `${data.direccion}, ${data.ciudad}`
    : data.campusRecojo || '';

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
    ''  // S: Fecha fin atencion
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: ssId,
    range: `Pedidos!A:S`,
    valueInputOption: 'RAW',
    requestBody: { values: [fila] },
  });
}

export async function enviarCorreoAPI(params: {
  codigoPedido: string;
  totalGeneral: number;
  data: DatosPedido;
}) {
  const auth = getOAuth2Client();
  const gmail = google.gmail({ version: 'v1', auth });

  const { codigoPedido, totalGeneral, data } = params;
  const marca = obtenerMarcaTemporalActual();
  
  const htmlBody = generarEmailHTML({
    codigoPedido,
    nombreUsuario: `${data.nombres} ${data.apellidos}`,
    email: data.email,
    telefono: data.telefono,
    tipoDoc: data.tipoDoc,
    nroDoc: data.nroDoc,
    comunidad: data.comunidad === 'si'
      ? `Comunidad Continental${data.sede ? ' — ' + data.sede : ''}`
      : 'Público externo',
    items: data.libros,
    totalGeneral: totalGeneral.toFixed(2),
    tipoEntrega: data.tipoEntrega === 'recojo'
      ? `Recojo en ${data.campusRecojo}`
      : `Delivery a ${data.direccion}, ${data.ciudad}`,
    marcaTemporal: marca,
  });

  const asunto = `[Pedido N.° ${codigoPedido}] ${data.nombres} ${data.apellidos}`;
  const ccList = process.env.EMAIL_CC || '';

  // Construir mensaje MIME RFC 2822
  const subjectStr = Buffer.from(asunto).toString('base64');
  
  const messageParts = [
    `To: ${data.email}`,
    `Cc: ${ccList}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: =?utf-8?B?${subjectStr}?=`,
    '',
    htmlBody,
  ];

  const message = messageParts.join('\n');
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
    range: 'Pedidos!A2:S',
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
    range: 'Pedidos!A:S',
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
    range: 'items!A:F',
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
      const estado = libro.estado ?? currentRow[5];

      await sheets.spreadsheets.values.update({
        spreadsheetId: ssId,
        range: `items!B${idx + 1}:F${idx + 1}`, // Columnas B a F
        valueInputOption: 'RAW',
        requestBody: { values: [[titulo, precioNormal, precioCont, stock, estado]] },
      });
      return;
    }
  }

  // Si no hay ID o no se encontró, insertamos nueva fila al final
  const newId = libro.id || Date.now().toString(); // Fallback para ID
  const fila = [
    newId,
    libro.titulo || 'Sin título',
    libro.precioNormal || 0,
    libro.precioCont || 0,
    libro.stock || 0,
    libro.estado || 'Inactivo'
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: ssId,
    range: 'items!A:F',
    valueInputOption: 'RAW',
    requestBody: { values: [fila] },
  });
}