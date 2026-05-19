const VARIANTS = {
  primary:   'bg-accent text-accent-fg hover:bg-accent-hover',
  secondary: 'bg-surface text-foreground border border-border hover:bg-surface-2 hover:border-border-strong',
  danger:    'bg-danger text-white hover:bg-danger-hover',
  ghost:     'bg-transparent text-accent hover:bg-accent-soft',
}

const SIZES = {
  sm: 'h-9 px-3 text-sm gap-1.5',   // uso compacto en escritorio
  md: 'h-11 px-4 text-sm gap-2',    // por defecto — 44px touch target
  lg: 'h-12 px-6 text-base gap-2',
}

const ICON_SIZE = { sm: 15, md: 16, lg: 18 }

const BASE =
  'inline-flex items-center justify-center font-medium rounded-md select-none transition-colors ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'

/** Clases de un botón — útil para estilizar <Link> con el mismo aspecto. */
export function buttonClasses(variant = 'primary', size = 'md', extra = '') {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${extra}`
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight = false,
  className = '',
  disabled,
  ...props
}) {
  return (
    <button
      disabled={disabled}
      className={buttonClasses(variant, size, className)}
      {...props}
    >
      {Icon && !iconRight && <Icon size={ICON_SIZE[size]} aria-hidden="true" />}
      {children}
      {Icon && iconRight && <Icon size={ICON_SIZE[size]} aria-hidden="true" />}
    </button>
  )
}
