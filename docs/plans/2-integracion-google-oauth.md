# Fase 2: Integración Google OAuth y Utilidades

## Objetivo
Configurar el proyecto en Google Cloud para autenticación OAuth2 y crear el cliente en Next.js capaz de operar en la base de datos momentánea (Google Sheets unificado) y enviar correos mediante la API de Gmail.

## Tareas

1. **Configuración en Google Cloud Console (por parte del usuario)**
   - Crear el proyecto.
   - Habilitar: `Google Sheets API` y `Gmail API`.
   - Configurar la "OAuth consent screen" (Pantalla de consentimiento OAuth).
   - En *Credentials*, crear un *OAuth 2.0 Client ID* (tipo Desktop o Web app) y descargar:
     - `Client ID`
     - `Client Secret`
   - Generar el `Refresh Token` para la cuenta que enviará los correos y gestionará la hoja.
   - Colocar credenciales en `.env.local`.

2. **Creación del cliente OAuth en Node.js**
   - Archivo: `lib/google-api.ts`
   - Configurar el cliente usando `googleapis`:
     ```typescript
     import { google } from 'googleapis';

     const oauth2Client = new google.auth.OAuth2(
       process.env.GOOGLE_CLIENT_ID,
       process.env.GOOGLE_CLIENT_SECRET
     );

     oauth2Client.setCredentials({
       refresh_token: process.env.GOOGLE_REFRESH_TOKEN
     });
     ```

3. **Funciones de Google Sheets**
   - En `lib/google-api.ts` (o archivo separado, ej: `lib/sheets.ts` si se prefiere dividir):
     - `getCatalogo()`: Lee desde la hoja `items` (A2:G).
     - `guardarPedido()`: Escribe un nuevo registro en la hoja única `Pedidos`.
     - `descontarStock()`: Actualiza la columna de stock en la hoja `items`.
     - `getTodosPedidos()`: Lee todos los pedidos desde la hoja `Pedidos`.
     - `actualizarEstadoPedido()`: Modifica el estado y las observaciones de un pedido particular en la hoja `Pedidos`.
     - `getNumeroPedido()`: Cuenta filas en `Pedidos` para generar el ID autoincremental `N-AÑO`.

4. **Funciones de Gmail**
   - En `lib/google-api.ts` (o archivo separado, ej: `lib/gmail.ts`):
     - `enviarCorreo()`: Usa `google.gmail({ version: 'v1', auth: oauth2Client })`.
     - Compone el mensaje en base64 usando el formato RFC 2822.
     - Utiliza un template HTML generado desde una función (por ej. `lib/email-template.ts`).
