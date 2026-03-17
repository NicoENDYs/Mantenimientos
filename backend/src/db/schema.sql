-- SIGMAN — Schema de base de datos
-- Ejecutar: psql -U postgres -d sigman -f schema.sql

CREATE TYPE rol_enum AS ENUM ('tecnico', 'supervisor', 'admin');
CREATE TYPE estado_enum AS ENUM ('borrador', 'pendiente_aprobacion', 'aprobado', 'rechazado');

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

-- Cache de activos consultados (API externa o ingreso manual)
CREATE TABLE IF NOT EXISTS assets (
  id         SERIAL PRIMARY KEY,
  codigo     VARCHAR(100) NOT NULL UNIQUE,
  nombre     VARCHAR(200),
  tipo       VARCHAR(100),
  ubicacion  VARCHAR(200),
  datos_api  JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Registros de mantenimiento
CREATE TABLE IF NOT EXISTS maintenances (
  id                    SERIAL PRIMARY KEY,
  asset_id              INTEGER NOT NULL REFERENCES assets(id),
  user_id               INTEGER NOT NULL REFERENCES users(id),
  motivo                TEXT NOT NULL,
  descripcion_problema  TEXT NOT NULL,
  solucion              TEXT NOT NULL,
  hubo_cambio           BOOLEAN NOT NULL DEFAULT false,
  estado                estado_enum NOT NULL DEFAULT 'pendiente_aprobacion',
  comentario_supervisor TEXT,
  supervisor_id         INTEGER REFERENCES users(id),
  pendiente_sync        BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Piezas/componentes cambiados en un mantenimiento
CREATE TABLE IF NOT EXISTS maintenance_parts (
  id             SERIAL PRIMARY KEY,
  maintenance_id INTEGER NOT NULL REFERENCES maintenances(id) ON DELETE CASCADE,
  descripcion    TEXT NOT NULL,
  cantidad       INTEGER NOT NULL CHECK (cantidad > 0)
);

-- Fotos adjuntas a un mantenimiento
CREATE TABLE IF NOT EXISTS maintenance_photos (
  id              SERIAL PRIMARY KEY,
  maintenance_id  INTEGER NOT NULL REFERENCES maintenances(id) ON DELETE CASCADE,
  ruta_archivo    TEXT NOT NULL,
  nombre_original TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_maintenances_user_id  ON maintenances(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_asset_id ON maintenances(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_estado   ON maintenances(estado);
CREATE INDEX IF NOT EXISTS idx_maintenances_created  ON maintenances(created_at);
CREATE INDEX IF NOT EXISTS idx_assets_codigo         ON assets(codigo);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id   ON access_logs(user_id);
