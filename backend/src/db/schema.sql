-- SIGMAN — Schema de base de datos
-- Ejecutar: npm run migrate (aplica este schema y las migraciones incrementales)
-- Requiere PostgreSQL 12+

-- Tipos enumerados (creación idempotente)
DO $$ BEGIN
  CREATE TYPE rol_enum AS ENUM ('tecnico', 'supervisor', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_enum AS ENUM ('borrador', 'abierta', 'en_progreso', 'pendiente_aprobacion', 'aprobado', 'rechazado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE prioridad_enum AS ENUM ('baja', 'media', 'alta', 'critica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_mant_enum AS ENUM ('correctivo', 'preventivo', 'predictivo', 'mejora');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE asset_estado_enum AS ENUM ('operativo', 'en_reparacion', 'fuera_de_servicio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE solicitud_estado_enum AS ENUM ('pendiente', 'convertida', 'descartada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Usuarios del sistema
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol           rol_enum NOT NULL DEFAULT 'tecnico',
  activo        BOOLEAN NOT NULL DEFAULT true,
  login_intentos INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Activos/equipos (cache de API externa o ingreso manual)
CREATE TABLE IF NOT EXISTS assets (
  id         SERIAL PRIMARY KEY,
  codigo     VARCHAR(100) NOT NULL UNIQUE,
  nombre     VARCHAR(200),
  tipo       VARCHAR(100),
  ubicacion  VARCHAR(200),
  estado     asset_estado_enum NOT NULL DEFAULT 'operativo',
  criticidad prioridad_enum NOT NULL DEFAULT 'media',
  parent_id  INTEGER REFERENCES assets(id),
  notas      TEXT,
  datos_api  JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Catálogo de repuestos con control de stock
CREATE TABLE IF NOT EXISTS parts (
  id             SERIAL PRIMARY KEY,
  codigo         VARCHAR(100) NOT NULL UNIQUE,
  nombre         VARCHAR(200) NOT NULL,
  descripcion    TEXT,
  stock          INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo   INTEGER NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  costo_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  ubicacion      VARCHAR(200),
  activo         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Planes de mantenimiento preventivo (generan órdenes al vencer)
CREATE TABLE IF NOT EXISTS maintenance_plans (
  id              SERIAL PRIMARY KEY,
  asset_id        INTEGER NOT NULL REFERENCES assets(id),
  titulo          VARCHAR(200) NOT NULL,
  descripcion     TEXT NOT NULL DEFAULT '',
  tipo            tipo_mant_enum NOT NULL DEFAULT 'preventivo',
  prioridad       prioridad_enum NOT NULL DEFAULT 'media',
  frecuencia_dias INTEGER NOT NULL CHECK (frecuencia_dias > 0),
  proxima_fecha   DATE NOT NULL,
  assigned_to     INTEGER REFERENCES users(id),
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_by      INTEGER REFERENCES users(id),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Registros/órdenes de mantenimiento
-- Flujo orden de trabajo: abierta → en_progreso → pendiente_aprobacion → aprobado/rechazado
-- Flujo registro directo:  (borrador) → pendiente_aprobacion → aprobado/rechazado
CREATE TABLE IF NOT EXISTS maintenances (
  id                    SERIAL PRIMARY KEY,
  asset_id              INTEGER NOT NULL REFERENCES assets(id),
  user_id               INTEGER NOT NULL REFERENCES users(id),
  assigned_to           INTEGER REFERENCES users(id),
  plan_id               INTEGER REFERENCES maintenance_plans(id),
  tipo                  tipo_mant_enum NOT NULL DEFAULT 'correctivo',
  prioridad             prioridad_enum NOT NULL DEFAULT 'media',
  motivo                TEXT NOT NULL,
  descripcion_problema  TEXT NOT NULL,
  solucion              TEXT NOT NULL DEFAULT '',
  hubo_cambio           BOOLEAN NOT NULL DEFAULT false,
  estado                estado_enum NOT NULL DEFAULT 'pendiente_aprobacion',
  comentario_supervisor TEXT,
  supervisor_id         INTEGER REFERENCES users(id),
  fecha_programada      DATE,
  fecha_inicio          TIMESTAMP,
  fecha_fin             TIMESTAMP,
  horas_trabajo         NUMERIC(6,2),
  tiempo_parada_horas   NUMERIC(6,2),
  pendiente_sync        BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Piezas/componentes cambiados en un mantenimiento
-- part_id enlaza al catálogo (descuenta stock); NULL = texto libre
CREATE TABLE IF NOT EXISTS maintenance_parts (
  id             SERIAL PRIMARY KEY,
  maintenance_id INTEGER NOT NULL REFERENCES maintenances(id) ON DELETE CASCADE,
  part_id        INTEGER REFERENCES parts(id),
  descripcion    TEXT NOT NULL,
  cantidad       INTEGER NOT NULL CHECK (cantidad > 0),
  costo_unitario NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- Fotos adjuntas a un mantenimiento
CREATE TABLE IF NOT EXISTS maintenance_photos (
  id              SERIAL PRIMARY KEY,
  maintenance_id  INTEGER NOT NULL REFERENCES maintenances(id) ON DELETE CASCADE,
  ruta_archivo    TEXT NOT NULL,
  nombre_original TEXT NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Solicitudes de mantenimiento (reporte de fallas → orden de trabajo)
CREATE TABLE IF NOT EXISTS maintenance_requests (
  id                    SERIAL PRIMARY KEY,
  asset_id              INTEGER NOT NULL REFERENCES assets(id),
  descripcion           TEXT NOT NULL,
  prioridad             prioridad_enum NOT NULL DEFAULT 'media',
  estado                solicitud_estado_enum NOT NULL DEFAULT 'pendiente',
  created_by            INTEGER NOT NULL REFERENCES users(id),
  maintenance_id        INTEGER REFERENCES maintenances(id),
  resuelto_por          INTEGER REFERENCES users(id),
  comentario_resolucion TEXT,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Trazabilidad: historial de acciones sobre cada mantenimiento
CREATE TABLE IF NOT EXISTS maintenance_history (
  id              SERIAL PRIMARY KEY,
  maintenance_id  INTEGER NOT NULL REFERENCES maintenances(id) ON DELETE CASCADE,
  user_id         INTEGER REFERENCES users(id),
  accion          VARCHAR(50) NOT NULL,
  estado_anterior estado_enum,
  estado_nuevo    estado_enum,
  detalle         TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Logs de acceso (login, logout, intentos fallidos)
CREATE TABLE IF NOT EXISTS access_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id),
  ip         VARCHAR(50),
  accion     VARCHAR(50) NOT NULL,
  resultado  VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices de rendimiento
-- (los índices sobre columnas nuevas de maintenances viven en
--  migrations/001_cmms_upgrade.sql, que corre después de agregarlas)
CREATE INDEX IF NOT EXISTS idx_maintenances_user_id     ON maintenances(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_asset_id    ON maintenances(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_estado      ON maintenances(estado);
CREATE INDEX IF NOT EXISTS idx_maintenances_created     ON maintenances(created_at);
CREATE INDEX IF NOT EXISTS idx_assets_codigo            ON assets(codigo);
CREATE INDEX IF NOT EXISTS idx_plans_proxima            ON maintenance_plans(proxima_fecha) WHERE activo;
CREATE INDEX IF NOT EXISTS idx_requests_estado          ON maintenance_requests(estado);
CREATE INDEX IF NOT EXISTS idx_history_maintenance      ON maintenance_history(maintenance_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id      ON access_logs(user_id);
