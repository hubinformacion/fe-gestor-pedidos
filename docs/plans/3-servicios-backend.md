# Fase 3: Servicios Backend

## Objetivo
Implementar las API Routes en Next.js (App Router) que consumirán las utilidades creadas en la Fase 2 para interactuar con Google Sheets y Gmail.

## Tareas

1. **Catálogo de Libros API**
   - Ruta: `app/api/catalogo/route.ts`
   - Método GET: Respuesta JSON con la lista de libros en formato `{ id, titulo, precioNormal, precioCont, stock, estado }` desde la hoja `items`. Filtra y devuelve solo los "Activos" para el formulario público, pero devuelve todos (incluyendo Inactivos) si se llama con el token del dashboard.
   - Método POST/PUT: Recibe `{ id, titulo, precioNormal, precioCont, stock, estado }`. Si no hay ID, añade una nueva fila. Si hay ID, busca la fila correspondiente y actualiza sus valores. Requiere validación del token del dashboard (`DASHBOARD_SECRET`).

2. **Registro de Pedido y Correo API**
   - Ruta: `app/api/pedido/route.ts`
   - Método: POST
   - Validación (Server Side): Validar el body usando el schema de Zod (`lib/validations.ts`).
   - Lógica:
     - Obtener el número actual (`N`) de la hoja unificada `Pedidos`.
     - Generar el código de pedido: `{N}-{AÑO}` (ej. 47-2026).
     - Calcular totales (aplicando `precioCont` si el usuario es "Continental", o `precioNormal` si es "Externo"). **Esto es crucial: el backend calcula el precio final.**
     - Guardar en Google Sheets (`guardarPedido`).
     - Descontar stock en `items` (`descontarStock`).
     - Generar y enviar correo vía Gmail (`enviarCorreo`).
   - Respuesta: `{ ok: true, codigo: "47-2026" }`.

3. **Dashboard Data API**
   - Ruta: `app/api/dashboard/data/route.ts`
   - Método: GET
   - Lógica:
     - Recibir un token (`?token=xyz` o mediante un *header* de autorización si usamos Middleware).
     - Validar contra `DASHBOARD_SECRET`. Si falla, HTTP 401.
     - Obtener todos los pedidos (`getTodosPedidos`) y todo el catálogo (`getCatalogo`).
   - Respuesta: `{ pedidos: [], catalogo: [] }`.

4. **Dashboard Estado/Notas API**
   - Ruta: `app/api/dashboard/estado/route.ts`
   - Método: PATCH
   - Lógica:
     - Validar token.
     - Recibir `{ codigo: "47-2026", estado: "Pagado", observaciones: "El cliente depositó por Plin" }`.
     - Buscar la fila en la hoja `Pedidos` y actualizar.
   - Respuesta: `{ ok: true }`.

5. **Schemas de Validación (Zod)**
   - Archivo: `lib/validations.ts`.
   - Crear schema para el frontend y el backend (POST de pedidos).
   - Validaciones cruzadas:
     - Si `comunidad` es "si", `sede` es requerida.
     - Si `tipoEntrega` es "recojo", `campusRecojo` es requerido.
     - Si `tipoEntrega` es "delivery", `direccion` y `ciudad` son requeridos.
