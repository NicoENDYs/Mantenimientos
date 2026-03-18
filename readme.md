# SIGMAN — Sistema de Gestión de Mantenimientos

## Descripción general

SIGMAN es una aplicación web full-stack para gestionar el ciclo completo de mantenimientos sobre activos/equipos. Permite a técnicos registrar trabajos realizados (con fotos y repuestos), a supervisores aprobar o rechazar esos registros, y a administradores gestionar usuarios. También genera reportes exportables en Excel y PDF.

---

## Stack tecnológico

| Capa                      | Tecnología |
|------                     |-----------|
| Backend                   | Node.js + Fastify 4 |
| Base de datos             | PostgreSQL |
| Autenticación             | JWT en cookie httpOnly |
| Frontend                  | React 18 + Vite 5 |
| Estilos                   | Tailwind CSS 4 |
| Íconos                    | lucide-react |
| Formularios               | react-hook-form |
| HTTP cliente              | Axios |
| Reportes                  | exceljs + pdfkit |
| Procesamiento de imágenes | sharp (conversión WebP → JPEG para PDF) |
| Escaneo QR                | html5-qrcode |

---

## Estructura del proyecto

```
sigman/
├── backend/
|   ├── private/photos/
│   └── src/
│       ├── server.js
│       ├── app.js
│       ├── controllers/
│       ├── services/
│       ├── routes/
│       ├── middlewares/
│       ├── plugins/
│       └── db/
│     
└── frontend/
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api/
        ├── context/
        ├── hooks/
        ├── pages/
        └── components/
```

---

## Flujo general de la aplicación

```
Usuario abre la app
       │
       ▼
  ¿Tiene sesión?  ──No──▶  /login  ──▶  POST /api/auth/login
       │                                        │
      Sí                                   JWT en cookie
       │◄──────────────────────────────────────┘
       ▼
  AuthContext carga el usuario (GET /api/auth/me)
       │
       ▼
  Layout + ProtectedRoute
  (verifica rol antes de renderizar cada ruta)
       │
  ┌────┴────────────────────────────────┐
  │                                     │
  ▼                                     ▼
Técnico                           Supervisor / Admin
  │                                     │
  ├─ /maintenances/new                  ├─ /maintenances  (todos)
  ├─ /maintenances        (propios)     ├─ /reports
  └─ /maintenances/:id                  └─ /users  (solo admin)
```

---

## Flujo de un mantenimiento

```
1. Técnico abre /maintenances/new
2. Escanea QR del equipo  ──▶  GET /api/assets/search?code=XXX
3. Se muestra info del activo (AssetInfo)
4. Rellena el formulario: motivo, problema, solución, repuestos
5. Adjunta fotos (PhotoUpload)
6. Submit  ──▶  POST /api/maintenances  (crea registro en estado "borrador")
               POST /api/maintenances/:id/photos  (sube fotos)
7. Redirige a /maintenances/:id

8. Supervisor ve el mantenimiento  ──▶  PATCH /api/maintenances/:id/approve
                                    o   PATCH /api/maintenances/:id/reject
9. Estado cambia a "aprobado" o "rechazado"

Si el mantenimiento fue rechazado:
10. Técnico abre el detalle  ──▶  puede ver el comentario del supervisor y hacer clic en "Editar"
11. Edita y guarda  ──▶  PUT /api/maintenances/:id  (estado vuelve a "pendiente_aprobacion")
12. Supervisor ve el detalle  ──▶  aparecen botones Aprobar / Rechazar nuevamente
```

---

## Estados de un mantenimiento

```
[formulario nuevo]  ──▶  pendiente_aprobacion  ──▶  aprobado
                                ▲               └──▶  rechazado
                                │                         │
                                └─── técnico edita ────────┘
```

> **Nota:** El estado `borrador` existe en el ENUM de la BD pero **no se usa** como estado inicial. El schema define `DEFAULT 'pendiente_aprobacion'`, por lo que todo mantenimiento creado via el formulario entra directamente en `pendiente_aprobacion`. El concepto de "borrador" se maneja de forma **puramente local** mediante `localStorage` en `NewMaintenancePage`.

| Estado | Quién puede actuar | Acción posible |
|--------|--------------------|----------------|
| `pendiente_aprobacion` | Supervisor / Admin | Aprobar o Rechazar |
| `rechazado` | Técnico | Editar (vuelve a `pendiente_aprobacion`) |
| `aprobado` | — | Solo lectura |

---

## Roles y permisos

| Acción              | tecnico  | supervisor |  admin  |
|--------             |--------- |--------  --| ------- |
| Crear mantenimiento |    ✅   |    ✅      |   ✅   |
| Ver propios         |    ✅   |    ✅      |   ✅   |
| Ver todos           |    ❌   |    ✅      |   ✅   |
| Aprobar/rechazar    |    ❌   |    ✅      |   ✅   |
| Exportar reportes   |    ❌   |    ✅      |   ✅   |
| Gestionar usuarios  |    ❌   |    ❌      |   ✅   |

---

## Esquema de base de datos

```
users
  id, nombre, email, password_hash, rol, activo, login_intentos, created_at

assets
  id, codigo (único), nombre, tipo, ubicacion, datos_api (JSON), created_at

maintenances
  id, asset_id → assets, user_id → users, motivo, descripcion_problema,
  solucion, hubo_cambio, estado, comentario_supervisor, supervisor_id → users,
  pendiente_sync, created_at, updated_at

maintenance_parts
  id, maintenance_id → maintenances, descripcion, cantidad

maintenance_photos
  id, maintenance_id → maintenances, ruta_archivo, nombre_original, created_at

access_logs
  id, user_id → users, ip, accion, resultado, created_at
```

---

## API REST — Endpoints

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Inicia sesión, devuelve JWT en cookie |
| GET | /api/auth/me | Devuelve el usuario autenticado |
| POST | /api/auth/logout | Elimina la cookie |
| POST | /api/auth/recover-password | Recuperación de contraseña |

### Mantenimientos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/maintenances | Lista paginada (filtrada por rol). Query params: `asset_code`, `estado`, `fecha_desde`, `fecha_hasta`, `page` (default 1), `limit` (default 20, máx 100). Responde `{ data, total, page, limit, totalPages }` |
| GET | /api/maintenances/stats | Conteo de mantenimientos por estado (`borrador`, `pendiente_aprobacion`, `aprobado`, `rechazado`, `total`). Técnicos ven solo los propios; supervisores/admin ven todos |
| GET | /api/maintenances/:id | Detalle |
| POST | /api/maintenances | Crear |
| PUT | /api/maintenances/:id | Actualizar |
| PATCH | /api/maintenances/:id/approve | Aprobar |
| PATCH | /api/maintenances/:id/reject | Rechazar |
| POST | /api/maintenances/:id/photos | Subir fotos |
| GET | /api/maintenances/:id/photos/:photoId | Servir foto (requiere auth) |
| DELETE | /api/maintenances/:id/photos/:photoId | Eliminar foto |

### Reportes
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/reports/excel | Exportar Excel con filtros |
| GET | /api/reports/pdf | Exportar PDF con filtros |
| GET | /api/reports/history/:assetCode | Historial de un activo |

### Activos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/assets/search | Buscar activo por código QR |
| POST | /api/assets | Crear activo |

### Usuarios (solo admin)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/users | Listar usuarios |
| POST | /api/users | Crear usuario |
| PUT | /api/users/:id | Actualizar usuario |
| PATCH | /api/users/:id/toggle | Activar/desactivar |

---

## Archivos del backend

### `src/server.js`
Punto de entrada. Importa `app.js`, llama a `fastify.listen()` en el puerto configurado (default 3000).

### `src/app.js`
Configura la instancia de Fastify: registra todos los plugins, monta las rutas bajo `/api/*`, exporta la app para server.js.

### `src/plugins/`

| Archivo | Propósito |
|---------|-----------|
| `cookie.js` | Habilita lectura/escritura de cookies con `@fastify/cookie` |
| `cors.js` | Configura CORS para el origen del frontend |
| `helmet.js` | Agrega cabeceras de seguridad HTTP, incluyendo CSP configurado con directivas específicas para la app (ver sección Seguridad) |
| `jwt.js` | Registra `@fastify/jwt` con el secreto del `.env` |
| `multipart.js` | Habilita subida de archivos con `@fastify/multipart` |
| `rateLimit.js` | Configura `@fastify/rate-limit` en modo `global: false`. El límite se aplica por ruta explícitamente: 5 req/min en `/login`; 20–30 req/min en todas las rutas de escritura (POST, PUT, PATCH, DELETE) de mantenimientos y usuarios. |

### `src/routes/`

| Archivo | Prefijo | Descripción |
|---------|---------|-------------|
| `auth.routes.js` | `/api/auth` | Rutas públicas y de sesión |
| `maintenances.routes.js` | `/api/maintenances` | CRUD + fotos, aplica middleware de autenticación |
| `users.routes.js` | `/api/users` | Solo accesible por admin |
| `reports.routes.js` | `/api/reports` | Supervisor y admin |
| `assets.routes.js` | `/api/assets` | Búsqueda y creación de activos |

### `src/controllers/`
Reciben la request de Fastify, llaman al servicio correspondiente y devuelven la respuesta. No contienen lógica de negocio.

| Archivo | Responsabilidad |
|---------|----------------|
| `auth.controller.js` | Login, logout, /me, recover-password |
| `maintenances.controller.js` | CRUD de mantenimientos y gestión de fotos |
| `users.controller.js` | ABM de usuarios |

### `src/services/`
Contienen toda la lógica de negocio y acceso a base de datos.

| Archivo | Responsabilidad |
|---------|----------------|
| `auth.service.js` | Verifica credenciales, firma/verifica JWT, hashea passwords |
| `maintenances.service.js` | Queries SQL de mantenimientos, cambios de estado, reglas de negocio. Al editar un mantenimiento en estado `rechazado`, el servicio lo pasa automáticamente a `pendiente_aprobacion` y limpia el comentario del supervisor. |
| `users.service.js` | Queries de usuarios, validaciones |
| `reports.service.js` | Construye documentos Excel (exceljs) y PDF (pdfkit). Las fotos se pre-cargan como buffers JPEG antes de crear el PDF; las imágenes en formato WebP son convertidas automáticamente a JPEG con `sharp` para garantizar compatibilidad con pdfkit. |
| `assets.service.js` | Búsqueda de activos por código |

### `src/middlewares/`

| Archivo | Propósito |
|---------|-----------|
| `authenticate.js` | Extrae y verifica el JWT desde cookie o header `Authorization` |
| `authorize.js` | Verifica que el rol del usuario tenga permiso para la ruta |
| `validateMime.js` | Valida que los archivos subidos sean imágenes válidas (jpg/png/webp) |

### `src/db/`

| Archivo | Propósito |
|---------|-----------|
| `pool.js` | Crea el pool de conexiones PostgreSQL con `pg` |
| `schema.sql` | DDL completo: tablas, enums, índices |
| `seed.js` | Inserta datos de prueba (usuarios, activos, mantenimientos) |

### `private/photos/`
Directorio donde se almacenan las fotos subidas, con nombres UUID para evitar colisiones. Las fotos **no son públicas** — se sirven a través del endpoint autenticado `/api/maintenances/:id/photos/:photoId`.

---

## Archivos del frontend

### `src/main.jsx`
Monta la aplicación React en el DOM. Envuelve todo en `<BrowserRouter>` y `<AuthProvider>`.

### `src/App.jsx`
Define todas las rutas con `react-router-dom`. Envuelve rutas protegidas en `<ProtectedRoute>`.

### `src/api/axiosInstance.js`
Configura Axios con la `baseURL` del backend. Incluye interceptor para manejar errores 401 (sesión expirada).

### `src/context/AuthContext.jsx`
Context global de autenticación. Al cargar la app llama a `GET /api/auth/me` para restaurar la sesión. Expone `user`, `login()`, `logout()`.

### `src/hooks/useAuthImage.js`
Hook personalizado que carga imágenes protegidas convirtiendo la URL a un blob URL, enviando las credenciales (cookie).

### `src/pages/`

| Archivo | Ruta | Descripción |
|---------|------|-------------|
| `LoginPage.jsx` | `/login` | Formulario de email + contraseña. Incluye atributos `autocomplete="email"` y `autocomplete="current-password"` para compatibilidad con gestores de contraseñas |
| `DashboardPage.jsx` | `/` | Pantalla de inicio con tarjetas de estadísticas por estado (pendientes, aprobados, rechazados) y accesos rápidos |
| `NewMaintenancePage.jsx` | `/maintenances/new` | Formulario completo de nuevo mantenimiento. Guarda automáticamente un borrador en `localStorage` con cada cambio de campo. Al volver a la página, muestra un banner ámbar ofreciendo continuar o descartar el borrador. Al hacer submit exitoso, borra el draft. Las fotos no se guardan en el draft (objetos `File` no serializables) |
| `MaintenanceListPage.jsx` | `/maintenances` | Lista paginada de mantenimientos con filtros. Muestra controles Anterior/Siguiente y contador de resultados cuando hay más de una página. Al cambiar cualquier filtro la página vuelve a 1 automáticamente |
| `MaintenanceDetailPage.jsx` | `/maintenances/:id` | Detalle del mantenimiento. Muestra botón "Editar" al técnico si el estado es `borrador` o `rechazado`. Muestra botones "Aprobar" / "Rechazar" al supervisor o admin si el estado es `pendiente_aprobacion`. |
| `ReportsPage.jsx` | `/reports` | Filtros y botones de exportación |
| `UsersPage.jsx` | `/users` | ABM de usuarios (solo admin) |

### `src/components/`

| Archivo | Propósito |
|---------|-----------|
| `Layout.jsx` | Barra de navegación + contenedor principal. Incluye íconos en cada enlace, badge de rol con color por tipo (técnico/supervisor/admin) y resaltado del enlace activo. En móvil muestra botón hamburguesa con menú desplegable; en `md+` muestra la barra horizontal completa |
| `ProtectedRoute.jsx` | Guard que redirige a `/login` si no hay sesión, o a `/` si el rol no tiene acceso |
| `QRScanner.jsx` | Activa la cámara y decodifica QR con `html5-qrcode` |
| `AssetInfo.jsx` | Muestra nombre, tipo y ubicación del activo encontrado |
| `PhotoUpload.jsx` | Input de archivos con preview, validación de tipo y límite de tamaño |
| `PartsSubform.jsx` | Subformulario dinámico para agregar/quitar repuestos |
| `AuthImage.jsx` | Renderiza una imagen que requiere autenticación usando `useAuthImage` |
| `Button.jsx` | Componente de botón reutilizable con variantes (`primary`, `secondary`, `danger`, `success`, `ghost`), tamaños (`sm`, `md`, `lg`) y soporte para íconos |
| `StatusBadge.jsx` | Badge de color con ícono según el estado del mantenimiento (`pendiente_aprobacion`, `aprobado`, `rechazado`) |

---

## Diseño responsive

La aplicación adapta su layout a tres rangos de dispositivo usando los breakpoints de Tailwind CSS:

| Dispositivo | Breakpoint | Comportamiento principal |
|-------------|-----------|--------------------------|
| Móvil | `< 640px` (base) | Una columna, tarjetas apiladas verticalmente, menú hamburguesa |
| PDA / tablet pequeña | `sm` ≥ 640px | Dos columnas en grillas de filtros, tarjetas en fila horizontal |
| Tablet / escritorio | `md` ≥ 768px | Cuatro columnas en filtros, nav bar completa visible |

### Decisiones de diseño por componente

**`Layout.jsx`**
- `< md`: el nav colapsa en un botón ☰ (hamburguesa). Al pulsarlo, los links se despliegan verticalmente debajo del logo.
- `md+`: nav horizontal con todos los links, nombre de usuario y botón Salir en una sola fila.

**`MaintenanceListPage.jsx`**
- Filtros: `grid-cols-1 → sm:grid-cols-2 → md:grid-cols-4`
- Tarjetas: `flex-col` en móvil, `sm:flex-row` en tablet+. Botones de acción con `flex-wrap` para no desbordar.

**`MaintenanceDetailPage.jsx`**
- Grilla de datos del activo: `grid-cols-1 → sm:grid-cols-2 → md:grid-cols-4`
- Cabecera (volver + título + badge): `flex-wrap` para adaptarse a pantallas angostas.
- Botones Aprobar/Rechazar: `flex-wrap` para apilarse si no caben en una fila.

**`ReportsPage.jsx`**
- Filtros: `grid-cols-1 → sm:grid-cols-2 → md:grid-cols-4`

**`UsersPage.jsx`**
- Tarjetas de usuario: `flex-col` en móvil, `sm:flex-row` en tablet+.

---

## Variables de entorno

### Backend (`.env`)
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sigman
DB_USER=postgres
DB_PASS=secret
PORT=3000
NODE_ENV=development
JWT_SECRET=clave_muy_secreta
JWT_EXPIRES_IN=8h
PHOTOS_DIR=./private/photos
API_KEY=                    # API externa de activos (opcional)
```

### Frontend (`.env`)
```env
VITE_API_BASE_URL=http://localhost:3000
```

---

## Comandos

### Backend
```bash
npm run dev      # Inicia con nodemon (recarga automática)
npm start        # Producción
npm run seed     # Poblar la base de datos con datos de prueba
```

### Frontend
```bash
npm run dev      # Servidor de desarrollo Vite (proxy al backend)
npm run build    # Build de producción en dist/
npm run preview  # Previsualizar el build
```

---

## Seguridad implementada

- **JWT en httpOnly cookie**: imposible de leer desde JavaScript del navegador (mitiga XSS).
- **Rate limiting por ruta**:
  - `/api/auth/login`: 5 req/min por IP (protección fuerza bruta)
  - Rutas de escritura de mantenimientos (`POST`, `PUT`, `PATCH`, `DELETE`): 20–30 req/min
  - Rutas de escritura de usuarios (`POST`, `PUT`, `PATCH`): 20–30 req/min
- **Content Security Policy (CSP)** configurado explícitamente en Helmet:
  ```
  default-src 'self'
  script-src  'self'
  style-src   'self' 'unsafe-inline'   ← Tailwind genera estilos inline
  img-src     'self' data: blob:       ← data: previews, blob: QR scanner
  connect-src 'self'
  font-src    'self'
  object-src  'none'
  media-src   'self'
  frame-src   'none'
  worker-src  'self' blob:             ← html5-qrcode usa Web Workers
  ```
- **Helmet**: demás cabeceras HTTP de seguridad (X-Frame-Options, X-Content-Type-Options, etc.).
- **CORS**: solo acepta peticiones del origen configurado en `FRONTEND_ORIGIN`.
- **RBAC**: cada endpoint verifica el rol antes de ejecutar la lógica.
- **Validación MIME**: las fotos son verificadas por magic bytes, no solo extensión (jpg/png/webp).
- **Fotos privadas**: servidas solo con sesión válida, nunca expuestas como estáticas.
- **Bcrypt**: passwords hasheadas con bcryptjs (SALT_ROUNDS = 12) antes de guardar.
- **Bloqueo de cuenta**: tras 5 intentos fallidos de login consecutivos, la cuenta queda bloqueada.
- **Access logs**: tabla `access_logs` registra logins y acciones relevantes con IP y resultado.
