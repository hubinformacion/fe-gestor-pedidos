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
export const CAMPUS_INFO: Record<string, { direccion: string; piso: string; lat: number; lng: number }> = {
  'Campus Arequipa': {
    direccion: 'La Canseco ll / Sector: Valle Chili, José Luis Bustamante y Rivero - Arequipa',
    piso: 'Recojo de libro en la biblioteca',
    lat: -16.4205, lng: -71.5195,
  },
  'Campus Ayacucho': {
    direccion: 'Av. Javier Perez de Cuellar 725. Ayacucho',
    piso: 'Recojo de libro en la biblioteca',
    lat: -13.1588, lng: -74.2244,
  },
  'Campus Cusco': {
    direccion: 'Sector Angostura Km. 10, carretera Cusco - Saylla, San Jerónimo, Cusco',
    piso: 'Recojo de libro en la biblioteca',
    lat: -13.5545, lng: -71.8870,
  },
  'Campus Huancayo - Instituto': {
    direccion: 'Calle Real 125, Huancayo - Junín',
    piso: 'Recojo de libro en la biblioteca',
    lat: -12.0651, lng: -75.2049,
  },
  'Campus Huancayo - Universidad': {
    direccion: 'Av. San Carlos 1980, Huancayo',
    piso: 'Recojo de libro en la biblioteca',
    lat: -12.0464, lng: -75.1977,
  },
  'Campus Ica': {
    direccion: 'Calle C N° 201 - Parque Industrial, Ica',
    piso: 'Recojo de libro en la biblioteca',
    lat: -14.0755, lng: -75.7286,
  },
  'Campus Lima - Los Olivos': {
    direccion: 'Av. Alfredo Mendiola 5210 - Los Olivos',
    piso: 'Recojo de libro en la biblioteca',
    lat: -11.9818, lng: -77.0664,
  },
  'Campus Lima - Miraflores': {
    direccion: 'Calle Junin 355 Miraflores - Lima',
    piso: 'Recojo de libro en la biblioteca',
    lat: -12.1197, lng: -77.0303,
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