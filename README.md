# Gestor de Pedidos - Fondo Editorial UC

Sistema web para la gestión de pedidos de libros del Fondo Editorial de la Universidad Continental. Este proyecto incluye un formulario público de compra y un panel de administración (Dashboard) construido sobre Next.js, utilizando Google Sheets como base de datos momentánea y la API de Gmail para el envío de notificaciones automáticas.

## Tecnologías Utilizadas

- **Framework**: Next.js (App Router)
- **Lenguaje**: TypeScript
- **UI & Estilos**: Tailwind CSS + shadcn/ui
- **Base de Datos**: Google Sheets API (googleapis)
- **Correos**: Gmail API
- **Autenticación (Dashboard)**: Token simple (`DASHBOARD_SECRET`)
- **Gestión de Fechas**: Day.js (Configurado a UTC-5)

## Requisitos Previos

- Node.js (v18 o superior)
- `pnpm` (Gestor de paquetes recomendado)
- Credenciales OAuth 2.0 de Google Cloud Console (Client ID y Client Secret)

## Instalación en un Nuevo Equipo de Desarrollo

1. Clona el repositorio:
   ```bash
   git clone <url-del-repositorio>
   cd fe-gestor-pedidos
   ```

2. Instala las dependencias:
   ```bash
   pnpm install
   ```

3. Configura las variables de entorno:
   - Copia o crea el archivo `.env.local` en la raíz del proyecto basándote en la siguiente estructura:

   ```env
   # Google OAuth2 Credentials
   GOOGLE_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="tu-client-secret"
   GOOGLE_REFRESH_TOKEN="tu-refresh-token"
   
   # Spreadsheet
   GOOGLE_SPREADSHEET_ID="id-del-google-sheet"
   
   # Dashboard
   DASHBOARD_SECRET="tu-password-secreto"
   
   # CC de correos (Correos adicionales para recibir notificaciones separados por comas)
   EMAIL_CC="correo1@continental.edu.pe,correo2@continental.edu.pe"
   ```

4. Ejecuta el entorno de desarrollo:
   ```bash
   pnpm dev
   ```

   El proyecto estará disponible en `http://localhost:3000`. 
   - El formulario público está en `/formulario`
   - El Dashboard está en `/dashboard`

## Revocar o Renovar el Refresh Token

El proyecto utiliza OAuth2 de Google. El `Refresh Token` permite que la aplicación genere automáticamente "Access Tokens" temporales sin requerir intervención manual constante. 

Si el Refresh Token expira, se revoca o se requiere cambiar la cuenta de correo que envía las notificaciones, sigue estos pasos:

1. Ingresa a **Google OAuth 2.0 Playground** (https://developers.google.com/oauthplayground/).
2. Haz clic en la rueda dentada (Opciones) en la esquina superior derecha y marca la casilla **"Use your own OAuth credentials"**.
3. Ingresa tu `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` configurados en tu proyecto de Google Cloud.
4. En la lista de APIs, selecciona y autoriza:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/gmail.send`
5. Haz clic en **"Authorize APIs"** e inicia sesión con la cuenta de Gmail desde la cual quieres que salgan los correos.
6. Una vez redireccionado de vuelta, haz clic en **"Exchange authorization code for tokens"**.
7. Copia el nuevo `Refresh Token` proporcionado y reemplázalo en tu variable de entorno `GOOGLE_REFRESH_TOKEN` en Vercel o en tu `.env.local`.

## Consideraciones sobre la Base de Datos y Futuras Migraciones

El proyecto actualmente usa **Google Sheets** como una base de datos momentánea para facilitar la rápida transición desde Google Forms y permitir un manejo intuitivo por parte del personal administrativo.

**Limitaciones actuales de Google Sheets:**
- **Rendimiento y Escalabilidad:** Google API tiene límites estrictos de peticiones (Rate Limits). Operaciones masivas pueden causar demoras o errores `429 Too Many Requests`.
- **Concurrencia:** Modificar registros de forma paralela desde múltiples dispositivos puede generar condiciones de carrera, sobrescribiendo información.
- **Relaciones Complejas:** La gestión de inventario y pedidos está desnormalizada.

**Recomendaciones para el futuro:**
A medida que el Fondo Editorial y el volumen de pedidos crezca, se recomienda migrar a un sistema de base de datos relacional robusto:
- **Base de Datos:** PostgreSQL.
- **ORM:** Prisma o Drizzle ORM.
- **Hosting de BD:** Supabase, Vercel Postgres o AWS RDS.
- **Implementación:** La arquitectura actual está diseñada de tal forma que la lógica de Google Sheets se concentra exclusivamente en `src/lib/google-api.ts`. Migrar a SQL significará únicamente reescribir este archivo, conservando intactos todos los flujos de frontend (Formulario y Dashboard) y casi todos los endpoint en `/api`.

## Despliegue en Vercel

1. Desde Vercel, crea un nuevo proyecto e importa este repositorio.
2. Asegúrate de configurar la variable `Framework Preset` en **Next.js**.
3. En **Environment Variables**, añade todas las claves de tu `.env.local`.
4. Vercel realizará el despliegue automático con el comando de build por defecto (`next build`).
