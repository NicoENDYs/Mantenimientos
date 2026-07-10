-- Migración 001 — Ampliación CMMS
-- Actualiza bases de datos existentes al schema con órdenes de trabajo,
-- planes preventivos, inventario de repuestos, solicitudes e historial.
-- Idempotente: en instalaciones nuevas (schema.sql ya completo) no hace nada.

-- Estados nuevos del ciclo de vida de una orden de trabajo
ALTER TYPE estado_enum ADD VALUE IF NOT EXISTS 'abierta' BEFORE 'pendiente_aprobacion';
ALTER TYPE estado_enum ADD VALUE IF NOT EXISTS 'en_progreso' BEFORE 'pendiente_aprobacion';

-- Columnas nuevas en assets
ALTER TABLE assets ADD COLUMN IF NOT EXISTS estado     asset_estado_enum NOT NULL DEFAULT 'operativo';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS criticidad prioridad_enum NOT NULL DEFAULT 'media';
ALTER TABLE assets ADD COLUMN IF NOT EXISTS parent_id  INTEGER REFERENCES assets(id);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS notas      TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Columnas nuevas en maintenances
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS assigned_to         INTEGER REFERENCES users(id);
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS plan_id             INTEGER REFERENCES maintenance_plans(id);
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS tipo                tipo_mant_enum NOT NULL DEFAULT 'correctivo';
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS prioridad           prioridad_enum NOT NULL DEFAULT 'media';
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS fecha_programada    DATE;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS fecha_inicio        TIMESTAMP;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS fecha_fin           TIMESTAMP;
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS horas_trabajo       NUMERIC(6,2);
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS tiempo_parada_horas NUMERIC(6,2);
ALTER TABLE maintenances ALTER COLUMN solucion SET DEFAULT '';

-- Columnas nuevas en maintenance_parts (enlace a catálogo + costo snapshot)
ALTER TABLE maintenance_parts ADD COLUMN IF NOT EXISTS part_id        INTEGER REFERENCES parts(id);
ALTER TABLE maintenance_parts ADD COLUMN IF NOT EXISTS costo_unitario NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Índices nuevos
CREATE INDEX IF NOT EXISTS idx_maintenances_assigned ON maintenances(assigned_to);
CREATE INDEX IF NOT EXISTS idx_maintenances_plan     ON maintenances(plan_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_tipo     ON maintenances(tipo);
CREATE INDEX IF NOT EXISTS idx_plans_proxima         ON maintenance_plans(proxima_fecha) WHERE activo;
CREATE INDEX IF NOT EXISTS idx_requests_estado       ON maintenance_requests(estado);
CREATE INDEX IF NOT EXISTS idx_history_maintenance   ON maintenance_history(maintenance_id);
