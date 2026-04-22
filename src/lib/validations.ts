import { z } from 'zod';

export const itemPedidoSchema = z.object({
  titulo: z.string().min(1),
  cantidad: z.number().int().min(1),
  precioUnit: z.number().min(0), // Este será el precio mostrado en el front (normal), backend lo validará.
});

export const datosPedidoSchema = z.object({
  comunidad: z.enum(['Comunidad Continental', 'Público en general']),
  sede: z.string().optional(),
  nombres: z.string().min(1, 'Requerido'),
  apellidos: z.string().min(1, 'Requerido'),
  email: z.string().email('Correo electrónico inválido'),
  telefono: z.string().min(6, 'Requerido'),
  tipoDoc: z.enum(['DNI', 'Carné de extranjería', 'Pasaporte', 'RUC']),
  nroDoc: z.string().min(1, 'Requerido'),
  libros: z.array(itemPedidoSchema).min(1, 'Selecciona al menos un libro'),
  tipoEntrega: z.enum(['Recojo en campus', 'Envío / Delivery']),
  campusRecojo: z.string().optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  terminos1: z.boolean().refine(val => val === true, {
    message: "Debes aceptar la política de privacidad",
  }),
  terminos2: z.boolean().refine(val => val === true, {
    message: "Debes aceptar la política de tratamiento de datos",
  }),
}).superRefine((d, ctx) => {
  if (d.comunidad === 'Comunidad Continental' && !d.sede) {
    ctx.addIssue({ code: 'custom', path: ['sede'], message: 'Selecciona tu sede' });
  }
  if (d.tipoEntrega === 'Recojo en campus' && !d.campusRecojo) {
    ctx.addIssue({ code: 'custom', path: ['campusRecojo'], message: 'Selecciona el campus de recojo' });
  }
  if (d.tipoEntrega === 'Envío / Delivery') {
    if (!d.direccion) ctx.addIssue({ code: 'custom', path: ['direccion'], message: 'Dirección es requerida' });
    if (!d.ciudad) ctx.addIssue({ code: 'custom', path: ['ciudad'], message: 'Ciudad es requerida' });
  }
});
