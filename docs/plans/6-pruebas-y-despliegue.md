# Fase 6: Pruebas y Despliegue

## Objetivo
Verificar la integridad del sistema desde el frontend hasta la base de datos momentánea (Google Sheets unificada) y la API de Gmail (OAuth2), y desplegar la aplicación en Vercel de manera segura.

## Tareas

1. **Pruebas End-to-End (Locales)**
   - Correr `pnpm run dev`.
   - **Formulario (Cliente Normal):** Llenar el formulario seleccionando "Externo". Validar que no se muestre el `precioCont` y verificar la hoja unificada.
   - **Formulario (Comunidad UC):** Llenar el formulario seleccionando "Continental". Validar que se guarde el precio con descuento. Verificar que el correo generado muestre el cálculo correcto.
   - Verificar si el stock disminuye.
   - Verificar la recepción del correo (formato HTML, sin caracteres rotos).
   - Validaciones negativas: campos vacíos, correos mal formados, selección de recojo sin especificar campus.

2. **Dashboard (Local)**
   - Entrar con un token correcto en la URL (o cookie según se haya implementado).
   - Comprobar que carga todos los registros unificados en la hoja `Pedidos`.
   - Filtrar la lista.
   - Editar estado y observar el cambio reflejado en Google Sheets.
   - Añadir una nota de atención, guardarla y comprobarla de nuevo tras recargar la página.
   - Entrar con token incorrecto para validar rechazo (HTTP 401).

3. **Despliegue en Vercel**
   - Configurar Vercel (conectar repositorio de GitHub si aplica, o CLI `vercel --prod`).
   - Agregar TODAS las variables de entorno en "Environment Variables" del dashboard de Vercel.
     - Prestar especial atención a `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, y `GOOGLE_REFRESH_TOKEN`.
     - `DASHBOARD_SECRET`.
     - `EMAIL_CC`.
   - Verificar que el *Build Command* es correcto (Next.js usa por defecto `next build`).
   - Verificar que el framework detectado es "Next.js".

4. **Verificación Post-Despliegue**
   - Abrir la URL de Vercel y hacer un pedido de prueba real.
   - Revisar la respuesta del Dashboard.
   - Confirmar recepción de correo de confirmación.
   - Verificar que la página del formulario puede ser incrustada (`<iframe>`) en una web externa como se configuró (ej. `X-Frame-Options`).

5. **Documentación Final (Opcional)**
   - Actualizar `README.md` del repositorio con instrucciones sobre cómo inicializar en un nuevo equipo de desarrollo.
   - Detallar cómo revocar o renovar el `Refresh Token` en caso expire o se desee cambiar de cuenta.
   - Indicar las limitaciones y notas futuras sobre la migración de base de datos a una más robusta (ej. PostgreSQL, MongoDB, Prisma, etc.).
