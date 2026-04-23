export interface Libro {
  id: string;
  titulo: string;
  precioNormal: number;
  precioCont: number;
  stock: number;
  estado: 'Activo' | 'Inactivo';
  unidadNegocio: 'Universidad Continental' | 'Instituto Continental' | 'Posgrado';
}

export interface ItemPedido {
  titulo: string;
  cantidad: number;
  precioUnit: number; // Precio real aplicado (Continental o Normal)
}

export interface DatosPedido {
  comunidad: 'Comunidad Continental' | 'Público en general';
  sede?: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  tipoDoc: 'DNI' | 'Carné de extranjería' | 'Pasaporte' | 'RUC';
  nroDoc: string;
  libros: ItemPedido[];
  tipoEntrega: 'Recojo en campus' | 'Envío / Delivery';
  campusRecojo?: string;
  direccion?: string;
  zonaDelivery?: 'Lima/Callao' | 'Provincia';
  departamento?: string;
  referenciaDelivery?: string;
  receptorTipo?: 'Yo mismo(a)' | 'Otra persona';
  receptorNombre?: string;
  receptorDocumento?: string;
  terminos1: boolean;
  terminos2: boolean;
}

export type EstadoPedido = 'Pendiente' | 'Pagado' | 'Entregado' | 'Abandonado' | 'Anulado';

export interface Pedido {
  fecha: string;
  tipo: 'Continental' | 'Externo';
  nombre: string;
  email: string;
  telefono: string;
  tipoDoc: string;
  nroDoc: string;
  sede?: string;
  libros: string;       // Formato: "Título x2 | Título2 x1"
  cantidad: number;
  tipoEntrega: string;
  detalleEntrega: string;
  total: string;        // Formato: "S/ 150.00"
  codigo: string;       // Formato: "47-2026"
  observaciones: string;
  estado: EstadoPedido;
  atendidoPor: string;
  fechaInicioAtencion: string;
  fechaFinAtencion: string;
  zonaDelivery: string;
  referenciaDelivery: string;
  receptor: string;
}

// ── Direcciones de campus (orden alfabético) ──
export const CAMPUS_INFO: Record<string, { direccion: string; piso: string }> = {
  'Campus Arequipa': {
    direccion: 'La Canseco ll / Sector: Valle Chili, José Luis Bustamante y Rivero - Arequipa',
    piso: 'Pabellón A, sexto piso',
  },
  'Campus Ayacucho': {
    direccion: 'Av. Javier Perez de Cuellar 725. Ayacucho',
    piso: '',
  },
  'Campus Cusco': {
    direccion: 'Sector Angostura Km. 10, carretera Cusco - Saylla, San Jerónimo, Cusco',
    piso: 'Pabellón A, tercer piso frente al Fab Lab',
  },
  'Campus Huancayo - Instituto': {
    direccion: 'Calle Real 125, Huancayo - Junín',
    piso: '1er piso, a la izquierda de la entrada principal de Jr. Arequipa al frente del taller de diseño',
  },
  'Campus Huancayo - Universidad': {
    direccion: 'Av. San Carlos 1980, Huancayo',
    piso: 'Pabellón F: 3er piso',
  },
  'Campus Ica': {
    direccion: 'Calle C N° 201 - Parque Industrial, Ica',
    piso: 'Pabellón F',
  },
  'Campus Lima - Los Olivos': {
    direccion: 'Av. Alfredo Mendiola 5210 - Los Olivos',
    piso: 'Pabellón A, sexto piso',
  },
  'Campus Lima - Miraflores': {
    direccion: 'Calle Junin 355 Miraflores - Lima',
    piso: '',
  },
};

export const SEDES = Object.keys(CAMPUS_INFO);

// ── Precios de delivery ──
export const DELIVERY_PRECIO_LIMA = 15;
export const DELIVERY_PRECIO_PROVINCIA = 25;

export const RESPONSABLES = [
  'Jullisa Falla',
  'Valeria Trujillo',
  'Yesenia Mandujano',
] as const;

export const ESTADOS_FLUJO: EstadoPedido[] = ['Pendiente', 'Pagado', 'Entregado'];
export const ESTADOS_FINALES: EstadoPedido[] = ['Entregado', 'Abandonado', 'Anulado'];

// ── Tipo de correo según unidad de negocio ──
export type TipoCorreo = 'universidad-posgrado' | 'instituto' | 'mixto';

export function determinarTipoCorreo(unidades: string[]): TipoCorreo {
  const set = new Set(unidades);
  const tieneInstituto = set.has('Instituto Continental');
  const tieneOtro = set.has('Universidad Continental') || set.has('Posgrado');
  if (tieneInstituto && tieneOtro) return 'mixto';
  if (tieneInstituto) return 'instituto';
  return 'universidad-posgrado';
}