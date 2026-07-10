export const MAX_FOTOS    = 5
export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
export const DRAFT_KEY    = 'sigman_draft_maintenance'

export const TIPO_LABEL = {
  correctivo: 'Correctivo',
  preventivo: 'Preventivo',
  predictivo: 'Predictivo',
  mejora:     'Mejora',
}

export const PRIORIDAD_LABEL = {
  baja:    'Baja',
  media:   'Media',
  alta:    'Alta',
  critica: 'Crítica',
}

export const ASSET_ESTADO_LABEL = {
  operativo:         'Operativo',
  en_reparacion:     'En reparación',
  fuera_de_servicio: 'Fuera de servicio',
}

export const TIPO_OPCIONES      = Object.entries(TIPO_LABEL).map(([value, label]) => ({ value, label }))
export const PRIORIDAD_OPCIONES = Object.entries(PRIORIDAD_LABEL).map(([value, label]) => ({ value, label }))
