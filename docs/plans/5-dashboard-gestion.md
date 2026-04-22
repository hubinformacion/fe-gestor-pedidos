# Fase 5: Dashboard de Gestión

## Objetivo
Implementar la interfaz de administración (dashboard) protegida por un token simple, desde donde el Fondo Editorial gestionará todos los pedidos unificados (cambios de estado, visualización y actualización de notas), stock, y visualización de métricas.

## Tareas

1. **Diseño de Interfaz de Dashboard (shadcn/ui)**
   - Layout: Sidebar/Topnav con diseño limpio, tipo panel administrativo (lucide-react icons, Cards, Tables).
   - Componentes Reutilizables: `DashboardShell`, `MetricCards`, `TablaPedidos`, `FiltroPedidos`.
   - Utilizar Tailwind para colores de fondo suaves y bordes de Cards.

2. **Integración con API (Protegida)**
   - Uso de `useEffect` (o SWR/React Query) para `app/api/dashboard/data/route.ts?token=xyz`.
   - Carga inicial: Mostrar esqueletos (skeletons) mientras llegan los datos.
   - Datos recibidos:
     - `pedidos`: Lista completa de la hoja unificada `Pedidos`.
     - `catalogo`: Lista completa de libros de `items`.

3. **Visualización de Datos**
   - **Métricas:** Cards mostrando Total Pedidos, Ingresos (S/), Stock Crítico.
   - **Gráficos (Opcionales por ahora):** Uso de `recharts` si se desea un gráfico simple de barras (Top 5 libros vendidos, Estado de Pedidos).
   - **Tabla Principal:** Listado de `pedidos`, con columnas:
     - Código
     - Fecha
     - Tipo (Continental / Externo)
     - Cliente (Nombre + Sede si aplica)
     - Libros y Cantidad (Colapsado o truncado si es muy largo)
     - Total
     - Estado (Badge coloreado: Gris/Pendiente, Azul/Pagado, Verde/Entregado, Rojo/Cancelado).
     - Notas/Observaciones (Icono indicando si hay o no).

4. **Gestión de Pedidos (Interactiva y Tiempos)**
   - **Filtros:** Búsqueda por código/nombre, Dropdown por Estado (Pendiente, Pagado, Entregado, Cancelado), Dropdown por Tipo.
   - **Asignación de Personal:** Dropdown para indicar quién atiende el pedido (Julia Falla, Valeria Trujillo, Yesenia Mandujano). Al asignar, se captura automáticamente la `Fecha inicio atención` (vía `dayjs` UTC-5).
   - **Acciones en la Fila:**
     - *Botón Rápido*: Pasar estado. Si el pedido no tenía asignado a nadie, puede obligar a asignarlo primero.
     - *Ver Detalles (Modal/Dialog)*: Muestra toda la info del pedido. **Calcula y muestra el tiempo transcurrido (SLA)** usando las fechas de inicio y fin (si aplica). Permite en este modal (si es admin/gestor) alterar el stock de manera manual en caso de pedidos no cumplidos al 100%.
     - *Editar Notas (Modal/Dialog)*: Permite al admin escribir en el campo de "Observaciones" de la fila de Sheets. (Dispara PATCH).
   - Al cambiar el estado a "Entregado" o "Cancelado", el sistema debe registrar automáticamente la `Fecha fin atención`.

5. **Gestión del Catálogo (Nueva Pestaña/Vista)**
   - Listado en tabla de los libros actuales de la hoja `items`.
   - Botón "Nuevo Libro": Abre un modal con campos Título, Precio Normal, Precio Continental, Stock Inicial.
   - Acciones por libro:
     - Editar: Permite cambiar precios o el stock disponible directamente si hay diferencias de inventario real contra sistema.
     - Cambiar Estado: Toggle (Switch) para Activo/Inactivo. Los inactivos no se muestran en el formulario público.
   - Estas acciones disparan peticiones POST o PUT hacia `app/api/catalogo/route.ts` con el token de seguridad.
