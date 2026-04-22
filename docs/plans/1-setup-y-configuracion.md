# Fase 1: Setup y Configuración

## Objetivo
Inicializar el proyecto Next.js en la carpeta actual utilizando `pnpm` y las mejores prácticas, configurar las herramientas base (shadcn/ui, Tailwind) y establecer las variables de entorno.

## Tareas

1. **Inicialización de Next.js**
   - No usar una subcarpeta. Inicializar en la raíz actual (`/home/asus/projects/fe-gestor-pedidos`).
   - Comando: `pnpm create next-app@latest . --typescript --tailwind --app` (aceptar ESLint, src/ no requerido o sí según convención, App Router sí, import alias `@/*`).

2. **Configuración de shadcn/ui**
   - Ejecutar: `pnpm dlx shadcn@latest init`
   - Instalar componentes base: `pnpm dlx shadcn@latest add button input label select checkbox card badge table separator progress`

3. **Instalación de Dependencias Adicionales**
   - APIs de Google: `pnpm add googleapis`
   - Formularios y Validación: `pnpm add react-hook-form zod @hookform/resolvers`
   - Fechas y Tiempos: `pnpm add dayjs` (para uso general y cálculo de SLAs en zona UTC-5)
   - UI Extra: `pnpm add lucide-react @radix-ui/react-progress`

4. **Variables de Entorno**
   - Crear archivo `.env.local`.
   - Definir variables (vacías por ahora para OAuth, pero con los nombres listos):
     ```env
     GOOGLE_CLIENT_ID=""
     GOOGLE_CLIENT_SECRET=""
     GOOGLE_REFRESH_TOKEN=""
     GOOGLE_SPREADSHEET_ID="1wWp1mRRCboqW6tSsYnXYVMKu6VndPgqyUXtemFox0gA"
     DASHBOARD_SECRET="fondo2026secreto"
     EMAIL_CC="fondoeditorial@continental.edu.pe,jfalla@continental.edu.pe,ymandujanog@continental.edu.pe,vtrujillo@continental.edu.pe"
     ```

5. **Limpieza y Estructura Base**
   - Limpiar `app/page.tsx` para que simplemente redirija a `/formulario` o sirva como *landing* temporal.
   - Crear carpetas estructurales: `components/`, `lib/`, `app/api/`, `app/formulario/`, `app/dashboard/`.
