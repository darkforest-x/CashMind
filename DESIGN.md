# CashMind Design System

## 1. Atmosphere & Identity

CashMind feels like a private mobile finance console: calm, glassy, and personal, with soft depth instead of heavy chrome. The signature is translucent financial cards floating over a pale gradient surface, using a restrained indigo accent for actions and trust.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/page | `--surface-page` | `#F8FAFC` | `#09090B` | App background |
| Surface/glass | `--surface-glass` | `rgba(255,255,255,0.40)` | `rgba(0,0,0,0.40)` | Primary cards |
| Surface/field | `--surface-field` | `rgba(255,255,255,0.50)` | `rgba(0,0,0,0.50)` | Token inputs |
| Surface/elevated | `--surface-elevated` | `#FFFFFF` | `#18181B` | Modals |
| Text/primary | `--text-primary` | `#111827` | `#FFFFFF` | Headings and body |
| Text/secondary | `--text-secondary` | `#4B5563` | `#D1D5DB` | Labels and control text |
| Text/muted | `--text-muted` | `#6B7280` | `#9CA3AF` | Captions and hints |
| Border/glass | `--border-glass` | `rgba(255,255,255,0.40)` | `rgba(255,255,255,0.10)` | Glass card borders |
| Border/subtle | `--border-subtle` | `rgba(0,0,0,0.05)` | `rgba(255,255,255,0.10)` | Dividers |
| Accent/primary | `--accent-primary` | `#4F46E5` | `#6366F1` | Primary actions |
| Accent/soft | `--accent-soft` | `rgba(99,102,241,0.10)` | `rgba(99,102,241,0.20)` | Callout buttons |
| Status/error | `--status-error` | `#EF4444` | `#F87171` | Destructive actions |

### Rules

- Indigo is functional, not decorative: primary actions, selected nav, trusted setup states.
- Glass cards use tint, saturation, blur, border, and shadow together.
- Status color appears only when communicating result or risk.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| H1 | 24px | 600 | 1.25 | 0 | Page titles |
| H2 | 18px | 600 | 1.35 | 0 | Section titles |
| H3 | 16px | 600 | 1.4 | 0 | Card titles |
| Body | 14px | 400 | 1.5 | 0 | Default copy |
| Body/sm | 12px | 400 | 1.4 | 0 | Help text |
| Caption | 10px | 500 | 1.3 | 0 | Metadata and tiny labels |

### Font Stack

- Primary: system UI, `-apple-system`, BlinkMacSystemFont, `Segoe UI`, sans-serif.
- Mono: SFMono-Regular, ui-monospace, Menlo, Consolas, monospace.

### Rules

- No negative letter spacing.
- Chinese labels should stay compact and avoid one-character orphan lines.
- Body text never drops below 12px unless it is metadata already supported by icon context.

## 4. Spacing & Layout

### Base Unit

All spacing derives from 4px.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Dense icon gaps |
| `--space-2` | 8px | Compact groups |
| `--space-3` | 12px | Button padding |
| `--space-4` | 16px | List items |
| `--space-5` | 20px | Card internal rhythm |
| `--space-6` | 24px | Page gutters and large cards |
| `--space-8` | 32px | Major vertical separation |

### Grid

- Primary target: mobile viewport between 375px and 430px.
- Page gutter: 24px.
- Cards are full-width within the mobile gutter.
- Bottom navigation is fixed and content pads with `pb-24`.

### Rules

- All icon buttons and action rows keep stable height.
- Setup controls use one-column layouts on mobile; two-column grids are allowed only for short labels.

## 5. Components

### Glass Card

- **Structure**: rounded container, glass background, backdrop blur, subtle border, soft shadow.
- **Variants**: standard card, settings card, modal body.
- **Spacing**: 24px outer padding for setup cards, 8px for dense list cards.
- **States**: default, hover for clickable rows.
- **Accessibility**: contrast relies on text opacity and background tint; never place pale text on pale tint.
- **Motion**: enters with 20px vertical offset and opacity fade.

### Token Input

- **Structure**: label, password input, save button, optional copy button, status text.
- **Variants**: app token, shortcut token.
- **Spacing**: 8px label gap, 4px inner button shell, 12px input padding.
- **States**: default, focus, hover, disabled not currently used; action buttons keep a fixed minimum width on mobile.
- **Accessibility**: label remains visible; button text is explicit.
- **Motion**: no layout animation.

### Shortcut Automation Card

- **Structure**: header, token inputs, universal capture URL, self-test, copy actions, guide entry, manual copy fallback panel.
- **Variants**: normal, testing state, and manual copy fallback when the system blocks automatic clipboard access.
- **Spacing**: 24px card padding, 16px stacked groups, 8px button grid.
- **States**: default, hover, disabled while testing, success/info/error toast.
- **Accessibility**: every icon button has text; loading state keeps label visible.
- **Motion**: card uses standard mount motion; loader spins only during request.

### Modal

- **Structure**: scrim, elevated panel, fixed header, scrollable content.
- **Variants**: tutorial, privacy, app-store, budget, currency.
- **Spacing**: 24px content padding.
- **States**: open and exit animation.
- **Accessibility**: close button is visible; current implementation does not yet trap focus.
- **Motion**: opacity and transform only.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 100-150ms | ease-out | Tap scale, hover tint |
| Standard | 200-300ms | ease-in-out | Modal and row transitions |
| Emphasis | 400ms | ease-in-out | Section card entry |

Rules:

- Animate transform and opacity only.
- Do not animate layout dimensions.
- Hover and active states must not shift layout.

## 7. Depth & Surface

### Strategy

Mixed glass: translucent fills, blur, saturation, thin borders, and soft shadows.

| Level | Value | Usage |
|-------|-------|-------|
| Card | `0 8px 30px rgb(0,0,0,0.04)` | Light mode cards |
| Card/dark | `0 8px 30px rgb(0,0,0,0.20)` | Dark mode cards |
| Modal | `0 25px 50px -12px rgb(0,0,0,0.25)` | Dialogs |

Rules:

- Cards should not be nested inside cards except controls framed inside settings cards.
- Do not add decorative orbs or bokeh blobs.
- Use border plus tint to separate surfaces before increasing shadow.
