# SIGMAN — Issues pendientes

> Última actualización: 2026-03-19
> Issues ya resueltos no aparecen aquí. Ver historial de commits para contexto.

---

## Crítico (0)

### ~~C-1 · PUT `/api/users/:id` sin schema de validación~~ ✅ RESUELTO
Schema AJV añadido al PUT: `nombre` (minLength 1, maxLength 100), `email` (format email), `password` (minLength 8, opcional), `rol` (enum).

---

## Alta Prioridad (0)

### ~~A-1 · PUT `/api/maintenances/:id` sin schema~~ ✅ RESUELTO
Schema AJV añadido con `motivo`, `descripcion_problema`, `solucion` (requeridos, minLength/maxLength), `hubo_cambio` y `partes` validados.

### ~~A-2 · QRScanner sin feedback al fallar~~ ✅ RESUELTO
Estado `errorMsg` con mensaje diferenciado (permisos vs cámara ocupada). Ya no cierra silenciosamente.

### ~~A-3 · PartsSubform sin validación~~ ✅ RESUELTO
Descripción vacía muestra borde rojo y mensaje "Descripción requerida" en tiempo real.

### ~~A-4 · Formato de errores inconsistente~~ ✅ RESUELTO
`maintenances.controller.js` y `auth.controller.js` estandarizados a `{ statusCode, error, message }`.

### ~~A-5 · Extracción de extensión sin fallback~~ ✅ RESUELTO
Usa `resolvedPath` con verificación de punto. Fallback a `''` evita `undefined`.

---

## Media Prioridad (0)

### ~~M-1 · Uso de `alert()` nativo en lugar de UI de error~~ ✅ RESUELTO
`PhotoUpload.jsx`: estado `photoErrors[]` renderizado inline con `bg-red-50 border-red-200`. `UsersPage.jsx`: `setError()` con display visible fuera del form. `MaintenanceListPage.jsx` y `EditMaintenancePage.jsx`: reemplazado por `setError()`/`setSubmitError()`.

---

### ~~M-2 · Sin validación de rango de fechas en frontend~~ ✅ RESUELTO
`MaintenanceListPage.jsx`: estado `dateRangeError` en `handleFilterChange`, `fetchItems` retorna tempranamente si el rango es inválido. `ReportsPage.jsx`: variable derivada `dateRangeError` deshabilita botones de descarga cuando el rango es inválido.

---

### ~~M-3 · Sin `maxLength` en campos de texto libre~~ ✅ RESUELTO
Añadido `maxLength` HTML (500/5000) y validación react-hook-form con mensaje en `NewMaintenancePage.jsx` y `EditMaintenancePage.jsx`. `maxLength={100}` añadido al campo `nombre` en `UsersPage.jsx`.

---

### ~~M-4 · Fetch sin `AbortController` en `EditMaintenancePage`~~ ✅ RESUELTO
`useEffect` usa `AbortController` + variable `mounted`. Cleanup llama `controller.abort()` y pone `mounted = false`. El catch ignora `ERR_CANCELED` y no actualiza state si `!mounted`.

---

### ~~M-5 · Sin `ErrorBoundary` en la aplicación React~~ ✅ RESUELTO
Componente `ErrorBoundary` creado en `frontend/src/components/ErrorBoundary.jsx`. Envuelve todo el árbol en `main.jsx`. Muestra UI de fallback con botón "Recargar página" cuando un componente lanza un error en render.

---

## Baja Prioridad (0)

### ~~B-1 · Magic numbers/strings sin centralizar~~ ✅ RESUELTO
Creados `backend/src/constants.js` (`MAX_FOTOS`, `MAX_ITEMS_POR_PAGINA`, `MAX_INTENTOS_LOGIN`, `MAX_FILE_SIZE`) y `frontend/src/constants.js` (`MAX_FOTOS`, `MAX_FILE_SIZE`, `DRAFT_KEY`). Actualizados `multipart.js`, `auth.service.js`, `maintenances.service.js`, `PhotoUpload.jsx`, `EditMaintenancePage.jsx`, `NewMaintenancePage.jsx`.

---

### ~~B-2 · Sin HSTS configurado en Helmet para producción~~ ✅ RESUELTO
`helmet.js`: `hsts: IS_PROD ? { maxAge: 31536000, includeSubDomains: true } : false`. Solo activo cuando `NODE_ENV === 'production'`.

---

### ~~B-3 · Validación de password débil en login~~ ✅ RESUELTO
`auth.routes.js`: `minLength: 1` → `minLength: 8` en schema del POST `/api/auth/login`. Consistente con la creación de usuarios.

---

### ~~B-4 · `validateMime.js` usa magic bytes manuales en lugar de `file-type`~~ ✅ RESUELTO
`validateMime.js` reescrito usando `fileTypeFromBuffer()` de `file-type` vía dynamic import (necesario por ser `file-type@19` pure ESM). La función ahora es async; se añadió `await` en la llamada en `maintenances.service.js`.

---

### ~~B-5 · `assets.service.js` no loguea errores del fetch externo~~ ✅ RESUELTO
`assets.service.js`: `catch` ahora captura `err` y llama `logger.warn({ err }, 'API activos no disponible — usando cache local')` usando instancia pino independiente.

---

## Deuda técnica

| Item | Descripción |
|------|-------------|
| Sin tests | No hay archivos `*.test.js` ni `*.spec.js`. Ningún flujo crítico (auth, aprobación, fotos) tiene cobertura automatizada. |
| Sin CI/CD | No hay pipeline de integración continua (GitHub Actions, etc.). |
