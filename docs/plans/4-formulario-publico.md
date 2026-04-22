# Fase 4: Formulario Público

## Objetivo
Desarrollar la interfaz visual (cliente) del formulario de compra de libros usando `react-hook-form`, `zod`, y `shadcn/ui`, asegurando una excelente experiencia de usuario (UX) y validación inmediata.

## Tareas

1. **Diseño Visual**
   - Configurar Tailwind con colores institucionales UC y diseño moderno pero profesional.
   - Componentes principales (shadcn): Cards, Botones, Inputs, Selects, Progress.
   - Layout de formulario de una página (largo, con secciones bien marcadas).

2. **Estado y Validación Cliente**
   - Hook de React (`useForm`) con *resolver* de Zod (`zodResolver`).
   - Componentes Controlados:
     - `SeccionComunidad`: "¿Eres parte de la Comunidad Continental?" (Radio/Select). Condiciona mostrar `Sede`.
     - `SeccionDatos`: Nombres, Apellidos, Correo, Teléfono, Tipo/Número de Documento.
     - `SeccionLibros`: Catálogo interactivo (fetch al cargar). Permite agregar/quitar cantidades.
       - *Regla*: Mostrar **solo** el `precioNormal` en el frontend, independientemente de si es Continental o no.
     - `SeccionEntrega`: "Recojo en campus" vs "Delivery". Condiciona los subcampos.
     - `SeccionTerminos`: Checkboxes obligatorios.
   - Barra de progreso (opcional) que avanza conforme se llenan campos requeridos.

3. **Integración con API**
   - Hook `useEffect` o `SWR/React Query` para cargar `app/api/catalogo/route.ts` al inicio (con esqueleto de carga).
   - Función `onSubmit`:
     - Deshabilita el botón (estado `isSubmitting`).
     - Realiza POST a `app/api/pedido/route.ts` con el JSON de `react-hook-form`.
     - Manejo de Errores: Toast de shadcn/ui o alerta de error.
     - Éxito: Oculta el formulario, muestra pantalla de éxito con el "Código de Pedido" (ej. "47-2026") generado por el backend.

4. **Experiencia de Usuario (UX)**
   - Animaciones suaves en secciones condicionales (usar `framer-motion` o CSS transitions simples).
   - "Resumen de Carrito" fijo (sticky) o lateral si la pantalla es ancha, indicando el total acumulado (`precioNormal * cant`).
   - Mensajes de validación claros y en línea debajo de cada campo erróneo.

5. **Compatibilidad WordPress**
   - Archivo `next.config.js` (o `.ts`):
     - Configurar Headers HTTP (`X-Frame-Options: ALLOWALL` y `Content-Security-Policy: frame-ancestors *`) para la ruta `/formulario` o globar si es necesario.
