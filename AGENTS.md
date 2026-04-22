# AGENTS.md — Fondo Editorial UC
## Sistema de compra de libros: Formulario público + Dashboard de gestión

---

## 1. CONTEXTO DEL PROYECTO

El **Fondo Editorial de la Universidad Continental** necesita reemplazar un flujo manual basado en Google Forms + Apps Script por una aplicación web moderna con:

- **Formulario público** de pedido de libros (embebible en WordPress via iframe)
- **Dashboard interno** de gestión de pedidos, stock y estadísticas. La gestión se realiza **exclusivamente** desde el dashboard.
- **Google Sheets** como base de datos momentánea (una sola hoja para todos los pedidos).
- **Gmail API** para envío de correos de confirmación usando credenciales OAuth2.
- **Sin backend propio**: todo vía Google APIs desde Next.js (API Routes para operaciones server-side con credenciales).

---

## 2. STACK TÉCNICO

```
Framework:     Next.js (App Router, versión más reciente vía Context7)
Gestor:        pnpm
UI:            shadcn/ui + Tailwind CSS
Google Sheets: googleapis (pnpm) — @googleapis/sheets
Gmail:         googleapis (pnpm) — @googleapis/gmail
Auth Google:   OAuth2 (Client ID, Client Secret, Refresh Token)
Fechas:        dayjs (Configurado con zona horaria UTC-5, Lima)
Estado:        React hooks (useState, useEffect) — sin Redux
Forms:         react-hook-form + zod
Email HTML:    react-email o template string plano
Deploy:        Vercel (recomendado) o cualquier Node hosting
```

### Dependencias principales a instalar (usando pnpm):
```bash
pnpm create next-app@latest fondo-editorial --typescript --tailwind --app
cd fondo-editorial
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input label select checkbox card badge table separator progress
pnpm add googleapis zod react-hook-form @hookform/resolvers dayjs
pnpm add @radix-ui/react-progress lucide-react
```

---

## 3. CREDENCIALES GOOGLE (OAuth2)

El usuario tiene acceso a Google Cloud Console y proveerá credenciales OAuth2. **No se usarán cuentas de servicio**.

### 3.1 Google Cloud Console (OAuth2)
1. Habilitar APIs: **Google Sheets API** + **Gmail API**
2. Google Cloud Console → APIs & Services → Credentials → Crear OAuth 2.0 Client IDs
3. Autorizar la app con la cuenta de correo deseada (la misma que enviará los correos).
4. Obtener el **Refresh Token** usando Google OAuth Playground o script local.

### 3.2 Variables de entorno (.env.local)
```env
# Google OAuth2 Credentials
GOOGLE_CLIENT_ID="tu-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="tu-client-secret"
GOOGLE_REFRESH_TOKEN="tu-refresh-token"

# Spreadsheet
GOOGLE_SPREADSHEET_ID=15rHy61t5xYDauyvxL5hbVNhRtL7Lh4hzhoLqdflg0FE

# Dashboard
DASHBOARD_SECRET=fondo2026secreto   # token para proteger /dashboard

# CC de correos
EMAIL_CC=fondoeditorial@continental.edu.pe,jfalla@continental.edu.pe,ymandujanog@continental.edu.pe,vtrujillo@continental.edu.pe
```

---

## 4. ESTRUCTURA DE GOOGLE SHEETS (Base de datos momentánea)

### Spreadsheet ID: `15rHy61t5xYDauyvxL5hbVNhRtL7Lh4hzhoLqdflg0FE`

### Hoja: `items` — Catálogo de libros (Simplificado y Gestionable)
| Col | Letra | Campo | Tipo |
|-----|-------|-------|------|
| 1 | A | ID | string/number |
| 2 | B | Título | string |
| 3 | C | Precio normal (S/) | number |
| 4 | D | Precio Continental (S/) | number |
| 5 | E | Stock | number |
| 6 | F | Estado | string (Activo / Inactivo) |

### Hoja: `Pedidos` — Todos los pedidos (Unificada y Extendida)
| Col | Letra | Campo |
|-----|-------|-------|
| 1 | A | Marca temporal (dd/MM/yyyy HH:mm) |
| 2 | B | Tipo de Cliente (Continental / Externo) |
| 3 | C | Nombre completo |
| 4 | D | Correo electrónico |
| 5 | E | Teléfono |
| 6 | F | Tipo de documento |
| 7 | G | N° de documento |
| 8 | H | Sede Continental (Vacío si es externo) |
| 9 | I | Libros (formato: "Título x2 \| Título2 x1") |
| 10 | J | Cantidad total |
| 11 | K | Tipo de entrega (recojo/delivery) |
| 12 | L | Detalle entrega (campus o dirección) |
| 13 | M | Total (formato: "S/ 150.00") |
| 14 | N | Código pedido (formato: "47-2026") |
| 15 | O | Observaciones |
| 16 | P | Estado (Pendiente/Pagado/Entregado/Cancelado) |
| 17 | Q | Atendido por (Julia Falla / Valeria Trujillo / Yesenia Mandujano) |
| 18 | R | Fecha inicio atención (Marca de tiempo inicial) |
| 19 | S | Fecha fin atención (Marca de tiempo finalización) |

---

## 5. REGLAS DE NEGOCIO

### Tipos de usuario y Gestión
- **Comunidad Continental**: estudiantes/docentes/staff de la UC. Precio: `precioCont`.
- **Público externo**: cualquier persona fuera de la UC. Precio: `precioNormal`.
- **Dashboard como centro de gestión**: Los cambios de estado, adición de notas de atención y asignación se hacen desde el dashboard y esto actualiza el Sheets.

### Responsables y Tiempos de Atención
- Existen 3 personas encargadas del área para la gestión de un pedido: **Julia Falla**, **Valeria Trujillo**, y **Yesenia Mandujano**.
- Cuando una persona toma un pedido (o cambia su estado desde "Pendiente"), se registra su nombre en "Atendido por" y se guarda la "Fecha inicio atención" (usando dayjs UTC-5).
- Cuando el pedido pasa al estado final (ej. "Entregado" o "Cancelado"), se registra la "Fecha fin atención" automáticamente.
- Esto permite calcular el SLA (Tiempo total de atención).

### Precios en el formulario
- El formulario siempre muestra el `precioNormal`. El cálculo del `precioCont` ocurre en backend antes de enviar el correo y guardar en base de datos, garantizando que no se revela en el frontend.

### Código de pedido
- Formato: `{N}-{AÑO}` donde N = número de fila - 1 en la hoja `Pedidos`.

---

## 6. ESTRUCTURA DE ARCHIVOS DEL PROYECTO

```
fondo-editorial/
├── app/
│   ├── layout.tsx                    # layout raíz con fuentes
│   ├── page.tsx                      # redirige a /formulario
│   ├── formulario/
│   │   └── page.tsx                  # formulario público
│   ├── dashboard/
│   │   ├── page.tsx                  # dashboard (protegido)
│   │   └── layout.tsx                # layout con auth check
│   └── api/
│       ├── catalogo/
│       │   └── route.ts              # GET → devuelve libros
│       ├── pedido/
│       │   └── route.ts              # POST → guarda pedido + envía correo
│       ├── dashboard/
│       │   ├── data/
│       │   │   └── route.ts          # GET → todos los pedidos + catalogo
│       │   └── estado/
│       │       └── route.ts          # PATCH → actualizar estado/notas/fechas
│       └── auth/
│           └── route.ts              # GET ?token=xxx → valida token
├── components/
├── lib/
│   ├── google-api.ts                 # cliente Sheets & Gmail (OAuth2)
│   ├── email-template.ts             # HTML del correo
│   ├── validations.ts                # schemas Zod
│   ├── date-utils.ts                 # utilidades de dayjs para formato y cálculo
│   └── types.ts                      # tipos compartidos
├── docs/
│   └── plans/                        # Planes de desarrollo por fase
├── .env.local                        
└── AGENTS.md                         
```

---

## 7. ORDEN DE DESARROLLO RECOMENDADO (Ver docs/plans/)

1. `1-setup-y-configuracion.md`
2. `2-integracion-google-oauth.md`
3. `3-servicios-backend.md`
4. `4-formulario-publico.md`
5. `5-dashboard-gestion.md`
6. `6-pruebas-y-despliegue.md`

_Nota: No inicializar dentro de una subcarpeta, el proyecto Next.js debe estar en la raíz de la ruta actual `/home/asus/projects/fe-gestor-pedidos`._