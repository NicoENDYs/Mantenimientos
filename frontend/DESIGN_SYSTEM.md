# Sistema de diseño — SIGMAN

Guía del sistema de diseño del frontend: tokens, temas y componentes.
El objetivo es que toda la interfaz se construya con **tokens semánticos**,
de modo que el modo claro/oscuro funcione automáticamente y la apariencia
se mantenga consistente.

> Las reglas de diseño de alto nivel (las 7 reglas) viven en `CLAUDE.md`.
> Este documento explica **cómo aplicarlas en código**.

---

## 1. Dónde vive todo

| Archivo | Contenido |
|---------|-----------|
| `src/index.css` | Tokens, temas, clases utilitarias (`.input`, `.skeleton`…), animaciones |
| `index.html` | Carga de fuentes (Fontshare) + script anti-FOUC que aplica el tema |
| `src/components/` | Componentes base reutilizables |

Stack relevante: **Tailwind CSS v4** (directivas `@theme`, `@theme inline`,
`@custom-variant`, `@utility`).

---

## 2. Temas (claro / oscuro)

El tema se controla con el atributo `data-theme` en `<html>` (`light` | `dark`).

**Cómo funciona:**

1. `index.html` ejecuta un script *antes* del render que aplica `data-theme`
   según `localStorage['sigman-theme']` o, si no existe, `prefers-color-scheme`.
   Esto evita el parpadeo de tema (FOUC).
2. `index.css` define cada token de color dos veces — en `:root` (claro) y en
   `[data-theme=dark]` (oscuro) — como variables CSS normales.
3. El bloque `@theme inline` mapea esas variables a utilidades de Tailwind
   (`bg-surface`, `text-foreground`…). Como son variables **vivas**, cambiar
   `data-theme` re-colorea toda la app sin recargar.
4. `<ThemeToggle />` conmuta el atributo y lo persiste en `localStorage`.

### Reglas de oro

- ❌ **Nunca** usar colores fijos de Tailwind (`bg-white`, `text-gray-700`,
  `bg-blue-600`, `bg-yellow-50`…). No reaccionan al tema → texto/fondos rotos
  en modo oscuro.
- ❌ **Nunca** usar variantes `dark:` en el JSX. Los tokens ya cambian solos.
- ✅ Usar siempre tokens semánticos (`bg-surface`, `text-muted`, `border-border`).
- ✅ Si un color te falta, **agrégalo como token** en `index.css` (en ambos
  temas), no lo hardcodees.
- Excepciones permitidas: `text-white` sobre `bg-danger` y `bg-black/55` del
  scrim de `Modal` (un scrim oscuro es correcto en ambos temas).

---

## 3. Tokens de color

Todos disponibles como utilidades `bg-*`, `text-*`, `border-*`, `ring-*`.

### Superficies y texto

| Token | Uso |
|-------|-----|
| `bg` | Fondo de página |
| `surface` | Fondo de cards, nav, paneles |
| `surface-2` | Superficie secundaria (hover, chips, zonas hundidas) |
| `surface-3` | Superficie terciaria (brillo del skeleton) |
| `foreground` | Texto principal |
| `muted` | Texto secundario (descripciones, labels) |
| `faint` | Texto terciario (timestamps, captions) |
| `border` | Borde neutro estándar |
| `border-strong` | Borde con más presencia (hover de inputs, divisores) |

### Acento (teal petróleo) — color de marca único

| Token | Uso |
|-------|-----|
| `accent` | Relleno de botones primarios, enlaces |
| `accent-hover` | Hover del acento |
| `accent-fg` | Texto/icono sobre `accent` |
| `accent-soft` | Fondo suave (estado activo de nav, realces) |
| `accent-soft-fg` | Texto sobre `accent-soft` |

### Semánticos de estado

Reservados para **información de estado**, no para decoración.
Cada familia tiene 3 piezas: sólido / suave / texto-sobre-suave.

| Familia | Sólido | Fondo suave | Texto sobre suave |
|---------|--------|-------------|-------------------|
| Éxito (aprobado) | `success` | `success-soft` | `success-fg` |
| Advertencia (pendiente) | `warning` | `warning-soft` | `warning-fg` |
| Peligro (rechazado/error) | `danger` (+`danger-hover`) | `danger-soft` | `danger-fg` |

> ⚠️ Para **texto** de error usa siempre `text-danger-fg` (alto contraste en
> ambos temas). `text-danger` es solo para rellenos sólidos; como texto sobre
> fondo neutro falla el contraste AA en modo oscuro.

---

## 4. Tipografía

Dos familias, cargadas desde Fontshare:

| Familia | Token / utilidad | Uso |
|---------|------------------|-----|
| **Cabinet Grotesk** | `font-display` | Titulares grandes (≥ 24px). Aplicada automáticamente a `<h1>` |
| **General Sans** | `font-sans` (por defecto) | Todo el resto: body, botones, labels |

Escala de tamaños (utilidades `text-*`):

| Token | Tamaño | Uso típico |
|-------|--------|------------|
| `text-xs` | 12px | Labels, captions |
| `text-sm` | 14px | Body, botones, nav |
| `text-base` | 16px | Body largo |
| `text-lg` | 18px | Subtítulos |
| `text-xl` | 24px | `<h1>` de página · umbral del display |
| `text-2xl` | 30px | Titulares de sección destacados |
| `text-3xl` / `text-4xl` | 40px / 52px | Hero (Login) |

Regla: `font-display` solo a partir de `text-xl` (24px). Por debajo, body.

---

## 5. Spacing, radios y sombras

- **Spacing:** usar utilidades de Tailwind (`p-4`, `gap-3`…) — ya son base 4px.
  Para valores crudos en CSS existen `--space-1` … `--space-24`.
- **Radios — jerarquía por tamaño de elemento:**

  | Utilidad | Valor | Uso |
  |----------|-------|-----|
  | `rounded-full` | — | Badges, pills, avatares |
  | `rounded-md` | 8px | Inputs, botones |
  | `rounded-lg` | 12px | Cards pequeñas, filas |
  | `rounded-xl` | 16px | Cards, paneles |
  | `rounded-2xl` | 20px | Modales, paneles grandes |

- **Sombras:** `shadow-card` (cards), `shadow-raised` (elementos elevados),
  `shadow-overlay` (modales). Cambian con el tema.

---

## 6. Componentes base

Todos en `src/components/`.

### `Button` — `Button.jsx`
Botón sólido sobre tokens. Exporta también `buttonClasses()` para estilizar
un `<Link>` con el mismo aspecto.

| Prop | Valores | Por defecto |
|------|---------|-------------|
| `variant` | `primary` · `secondary` · `danger` · `ghost` | `primary` |
| `size` | `sm` · `md` (44px) · `lg` | `md` |
| `icon` | componente de icono (lucide) | — |
| `iconRight` | `boolean` — coloca el icono a la derecha | `false` |

```jsx
<Button icon={Plus} onClick={...}>Nuevo</Button>
<Button variant="danger" onClick={...}>Eliminar</Button>

// Link con aspecto de botón:
<Link to="/x" className={buttonClasses('primary', 'md')}>Ir</Link>
```

> Para acciones reales usar `md` o `lg` (touch target ≥ 44px). `sm` (36px) solo
> en contextos densos de escritorio.

### `Card` — `Card.jsx`
Superficie elevada. El padding lo define el consumidor.

```jsx
<Card className="p-5">…</Card>
<Card as="section" className="divide-y divide-border">…</Card>
```

### `Field` — `Field.jsx`
Envoltura de campo: label + control + ayuda/error. El control va como children
(usa la clase `.input`).

```jsx
<Field label="Correo" htmlFor="email" required error={errors.email?.message}>
  <input id="email" type="email" className="input" {...register('email')} />
</Field>
```

### `Modal` — `Modal.jsx`
Diálogo con scrim oscuro, cierre por Escape / clic fuera y bloqueo de scroll.

```jsx
{open && (
  <Modal title="Confirmar" onClose={() => setOpen(false)}>
    …contenido…
  </Modal>
)}
```

### `EmptyState` — `EmptyState.jsx`
Estado vacío: visual + mensaje cálido + acción.

```jsx
<EmptyState
  icon={ClipboardList}
  title="No hay mantenimientos"
  message="Registra el primero del periodo."
  action={<Link to="/maintenances/new" className={buttonClasses()}>Nuevo</Link>}
/>
```

### `Skeleton` — `Skeleton.jsx`
Bloque de carga con shimmer. Componer varios para armar el esqueleto de una
vista (preferir sobre spinners).

```jsx
<Skeleton className="h-28 w-full rounded-xl" />
```

### `StatusBadge` — `StatusBadge.jsx`
Badge de estado de mantenimiento (`borrador`, `pendiente_aprobacion`,
`aprobado`, `rechazado`). El color codifica el dato.

```jsx
<StatusBadge estado={m.estado} />
```

### `ThemeToggle` — `ThemeToggle.jsx`
Botón sol/luna. Ya integrado en `Layout`; rara vez se usa suelto.

### `Layout` — `Layout.jsx`
Cascarón de página: nav superior pegajosa, contenido y footer. Envuelve cada
página: `<Layout>…</Layout>`.

---

## 7. Clases utilitarias (`index.css`)

| Clase | Uso |
|-------|-----|
| `.input` | Estilo estándar de `<input>`, `<select>`, `<textarea>` (44px, focus ring) |
| `.skeleton` | Animación shimmer de carga |
| `.dot-grid` | Textura geométrica sutil de puntos (fondo del panel de Login) |
| `.animate-rise` | Aparición con desvanecido + desplazamiento |

---

## 8. Checklist para UI nueva

Antes de dar por terminado un componente o página:

- [ ] Solo tokens semánticos — cero `bg-white` / `text-gray-*` / colores fijos.
- [ ] Sin variantes `dark:`. Probado el toggle de tema en claro y oscuro.
- [ ] Texto de error con `text-danger-fg`; mensajes de error contextuales.
- [ ] Carga con `Skeleton`, no spinners. Vacío con `EmptyState`.
- [ ] Radios según la jerarquía (badge → `full`, input → `md`, card → `xl`…).
- [ ] Targets táctiles ≥ 44px; `:focus-visible` visible; `aria-label` en
      botones de solo icono; `alt` en imágenes.
- [ ] Contenido alineado a la izquierda (centrar solo titulares hero cortos).
