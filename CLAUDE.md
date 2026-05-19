# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Descripción del Proyecto

**SIGMAN** es un sistema de gestión de mantenimientos de activos/equipos. Incluye registro de mantenimientos con fotos y repuestos, flujo de aprobación por supervisor, gestión de usuarios y generación de reportes en Excel y PDF.

## Comandos de Desarrollo

### Backend (`/backend`)
```bash
npm run dev      # Servidor de desarrollo con nodemon (auto-reload)
npm start        # Producción
npm run migrate  # Ejecutar migraciones de base de datos
npm run seed     # Poblar datos de prueba
```

### Frontend (`/frontend`)
```bash
npm run dev      # Servidor Vite en puerto 5173
npm run build    # Build de producción
npm run preview  # Vista previa del build de producción
```

### Documentación de la API
En modo desarrollo: `http://localhost:3000/docs` (Swagger UI, deshabilitado en producción)

## Arquitectura

### Stack Tecnológico
- **Backend:** Node.js + Fastify 4 + PostgreSQL (via `pg`)
- **Frontend:** React 18 + Vite 5 + Tailwind CSS v4
- **Auth:** JWT en cookies httpOnly
- **Reportes:** exceljs (Excel) + pdfkit (PDF)
- **Imágenes:** Sharp (conversión WebP→JPEG para PDFs)
- **QR:** html5-qrcode
- **Forms:** react-hook-form + axios

### Estructura del Backend (`backend/src/`)
```
server.js          → Punto de entrada, configura Pino logger
app.js             → Instancia Fastify, registra plugins y rutas
constants.js       → Constantes globales
plugins/           → cors, helmet, jwt, cookie, multipart, rateLimit
routes/            → Definición de rutas (auth, maintenances, users, reports, assets)
controllers/       → Manejadores de requests (auth, maintenances, users)
services/          → Lógica de negocio y consultas SQL (auth, maintenances, users, reports, assets)
middlewares/       → authenticate.js, authorize.js, validateMime.js
db/
  pool.js          → Pool de conexiones PostgreSQL
  schema.sql       → DDL completo de la base de datos
  migrate.js       → Script de migración
  seed.js          → Datos de prueba
private/photos/    → Almacenamiento de fotos subidas
```

### Estructura del Frontend (`frontend/src/`)
```
main.jsx           → Entrada React
App.jsx            → Definición de rutas (React Router)
constants.js       → Constantes del frontend
api/axiosInstance.js → Cliente HTTP con baseURL y credentials
context/AuthContext.jsx → Estado global de autenticación
hooks/useAuthImage.js  → Hook para cargar imágenes protegidas
components/        → Layout, ProtectedRoute, QRScanner, PhotoUpload,
                     PartsSubform, StatusBadge, Button, AuthImage, ErrorBoundary
pages/             → LoginPage, DashboardPage, NewMaintenancePage,
                     MaintenanceListPage, MaintenanceDetailPage,
                     EditMaintenancePage, ReportsPage, UsersPage, ProfilePage
```

### Base de Datos

**Tablas principales:**
- `users` — roles: `tecnico`, `supervisor`, `admin`; incluye bloqueo por intentos fallidos
- `assets` — caché de activos/equipos (código, nombre, tipo, ubicación, metadata JSON)
- `maintenances` — registros de mantenimiento con estados: `borrador` → `pendiente_aprobacion` → `aprobado` / `rechazado`
- `maintenance_parts` — repuestos utilizados por mantenimiento
- `maintenance_photos` — fotos adjuntas (ruta de archivo en disco)
- `access_logs` — auditoría de accesos

### Flujo de Mantenimiento
1. Técnico crea mantenimiento (`borrador`)
2. Sube fotos
3. Envía a aprobación (`pendiente_aprobacion`)
4. Supervisor aprueba (`aprobado`) o rechaza (`rechazado`)
5. Si rechazado, técnico puede editar y reenviar
6. Una vez aprobado, el registro es de solo lectura

### Roles y Permisos
- **tecnico:** Crear/ver sus propios mantenimientos, subir fotos
- **supervisor:** Ver todos los mantenimientos, aprobar/rechazar, exportar reportes
- **admin:** Acceso completo incluyendo gestión de usuarios

## Configuración de Entorno

### Backend (`.env`)
```env
PORT=3000
DB_HOST=...
DB_PORT=5432
DB_NAME=sigman
DB_USER=...
DB_PASS=...
JWT_SECRET=...           # Mínimo 32 caracteres
JWT_EXPIRES_IN=8h
API_ACTIVOS_URL=...      # API externa de activos
FRONTEND_ORIGIN=http://localhost:5173
PHOTOS_DIR=./private/photos
```

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:3000
```

El frontend usa un proxy en Vite (`/api` → `http://localhost:3000`) en desarrollo.

## Aspectos Relevantes de Implementación

- **Logger:** Pino con doble salida en dev (pretty console + JSON file en `private/logs/app.log`), solo JSON en producción
- **Validación de archivos:** MIME types verificados por magic bytes (no por extensión) en `validateMime.js`
- **Rate limiting:** 5 req/min en login, 20–30 req/min en escrituras
- **Bloqueo de cuentas:** Tras 5 intentos fallidos de login
- **Imágenes en PDF:** Se convierten de WebP a JPEG con Sharp antes de incrustar en pdfkit
- **Drafts locales:** El frontend guarda borradores en `localStorage`; las fotos no se guardan (File objects no serializables)
- **requestId:** El manejador de errores global lo incluye para correlación con logs



## Reglas de Diseño Frontend

### REGLA 1 — Sin gradientes decorativos
- NUNCA usar `linear-gradient` o `radial-gradient` en botones
- NUNCA usar esquemas de color azul-violeta/morado/índigo
- NUNCA usar "blobs" o "orbs" de luz como decoración de fondo
- NUNCA aplicar `background-clip: text` con gradientes en headings
- Botones: siempre `background: var(--color-primary)` sólido
- Fondos de sección: siempre `var(--color-bg)` o `var(--color-surface)`

### REGLA 2 — Layout de features asimétrico
- NUNCA hacer 3 columnas idénticas con ícono + título + descripción
- NUNCA usar íconos dentro de círculos o cuadrados con color de fondo
- Layout de features debe ser asimétrico: 2+1, bento grid, o narrativo
- Una feature principal grande + varias pequeñas es preferible
- Las cards deben diferenciarse por contenido y jerarquía, no por color

### REGLA 3 — Alineación izquierda por defecto
- NUNCA centrar body copy, descripciones de features, o contenido de cards
- `text-align: center` solo está permitido en: hero headlines cortos y taglines de una línea
- Formularios, listas, cards, y secciones de contenido: siempre left-aligned

### REGLA 4 — Sin borders de acento en cards
- NUNCA usar `border-left: Xpx solid var(--color-primary)` en cards
- Para indicar estado o categoría: usar badge de texto, punto de color, o label
- Separación entre cards: usar sombra o cambio de superficie (background diferente)
- Borde neutral permitido: `1px solid oklch(from var(--color-text) l c h / 0.12)`

### REGLA 5 — Border-radius con jerarquía
- Elementos pequeños (badges, chips, pills): `var(--radius-full)`
- Elementos medianos (inputs, buttons, cards pequeñas): `var(--radius-md)` a `var(--radius-lg)`
- Elementos grandes (cards, modales, paneles): `var(--radius-xl)`
- Radio anidado SIEMPRE: `inner-radius = outer-radius - padding` (nunca el mismo en ambos)
- NUNCA hardcodear `border-radius: 16px` en todo sin jerarquía

### REGLA 6 — Copy específico, no genérico
- NUNCA usar frases como: "Empowering your journey", "Unlock the power of", "Your all-in-one solution", "Welcome to [nombre]", "Transform your business"
- Hero headline: qué hace el producto + para quién + resultado concreto
- El copy debe ser tan específico que solo pueda pertenecer a ESTE producto

### REGLA 7 — Ritmo de secciones variado
- NUNCA dar el mismo `padding-block` a todas las secciones
- Alternar entre secciones densas y generosas: `clamp(var(--space-8), 6vw, var(--space-24))`
- Variar estructura de grid sección por sección (no todas con la misma cantidad de columnas)
- Máximo 1-2 momentos de ruptura de grid por página (asimetría, full-bleed)

### Sistema de Tipografía
- `body`: `--text-base` (mínimo 16px); botones/nav: `--text-sm`; labels: `--text-xs` (mínimo 12px)
- `--font-display` SOLO a partir de `--text-xl` (24px) para arriba
- Máximo 2 familias tipográficas; máximo 5 estilos distintos por página
- NO usar Inter, Roboto, Open Sans, Montserrat, Poppins como fuente principal
- Preferir Fontshare: Satoshi, General Sans, Cabinet Grotesk, Boska, Zodiak

### Sistema de Color
- UN solo color de acento + superficies neutras
- Máximo 2 colores no-neutrales visibles en cualquier viewport
- Colores adicionales (naranja, gold, blue, purple) SOLO para data visualization
- Siempre light + dark mode con `data-theme` en `<html>`

### Sistema de Spacing
- Todo spacing referencia tokens CSS (`--space-1` a `--space-20`)
- NUNCA valores arbitrarios en px sin token
- Base: múltiplos de 4px

### Estados Defensivos
- Loading: skeleton shimmer (no spinners)
- Empty state: mensaje cálido + acción primaria + visual (no "No hay datos")
- Error: mensaje específico en contexto, no código de error crudo

### Accesibilidad
- Touch targets mínimo 44×44px
- `:focus-visible` en todos los elementos interactivos
- Contraste WCAG AA: 4.5:1 en texto body, 3:1 en texto grande
- `alt` en todas las imágenes; `aria-label` en botones solo con ícono
