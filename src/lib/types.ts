export interface Libro {
  id: string;
  titulo: string;
  precioNormal: number;
  precioCont: number;
  stock: number;
  estado: 'Activo' | 'Inactivo';
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
  ciudad?: string;
  terminos1: boolean;
  terminos2: boolean;
}

export type EstadoPedido = 'Pendiente' | 'Pagado' | 'Entregado' | 'Cancelado';

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
}

export const SEDES = [
  'Huancayo UC',
  'Lima - Los Olivos',
  'Lima - Miraflores',
  'Arequipa',
  'Cusco',
] as const;

export const RESPONSABLES = [
  'Jullisa Falla',
  'Valeria Trujillo',
  'Yesenia Mandujano',
] as const;

export const ESTADOS_FLUJO: EstadoPedido[] = ['Pendiente', 'Pagado', 'Entregado', 'Cancelado'];