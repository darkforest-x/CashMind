# CashMind Design System

## 1. Atmosphere & Identity

CashMind now uses a Phantom-inspired mobile finance surface: black canvas, compact pill navigation, large balance-first hierarchy, rounded graphite cards, purple action accents, bottom search plus floating action button, side account drawer, and bottom sheets for decisions.

This is not a crypto clone. The borrowed language is interaction and material: friendly, dark, fast, thumb-first, and finance-native. The product content remains automatic bookkeeping.

## 2. Color

### Palette

| Role | Token | Value | Usage |
|------|-------|-------|-------|
| Canvas | `--cm-black` | `#050505` | App background |
| Shell | `--cm-shell` | `#0A0A0B` | Phone frame and overlay panels |
| Card | `--cm-card` | `#1C1C1E` | Primary cards and list rows |
| Card raised | `--cm-card-raised` | `#242426` | Sheets, drawers, selected rows |
| Chip | `--cm-chip` | `#19191A` | Inactive tabs and compact controls |
| Border | `--cm-border` | `rgba(255,255,255,0.08)` | Hairline separation |
| Text primary | `--cm-text` | `#F7F7F8` | Main text |
| Text secondary | `--cm-text-soft` | `#A8A8AE` | Labels and metadata |
| Text muted | `--cm-text-muted` | `#6F6F76` | Disabled and helper text |
| Purple | `--cm-purple` | `#AB9BFF` | Primary action, active tab |
| Purple strong | `--cm-purple-strong` | `#8B6DFF` | Pressed and focus states |
| Green | `--cm-green` | `#2FEA76` | Income, positive deltas |
| Red | `--cm-red` | `#FF4D6A` | Expense risk and delete |
| Amber | `--cm-amber` | `#FF9F1C` | Wallet/source highlights |

### Rules

- Black is the default surface. There is no pale/light theme for the Phantom shell.
- Purple is used for selected navigation, the primary CTA, and automation affordances.
- Green and red only describe money movement or risk.
- Cards are solid graphite with a subtle border, not translucent glass.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Display | 56px | 750 | 1.0 | Main balance and amount entry |
| H1 | 30px | 700 | 1.15 | Section titles |
| H2 | 22px | 700 | 1.25 | Cards and sheets |
| H3 | 17px | 650 | 1.35 | Row titles |
| Body | 15px | 450 | 1.45 | Default copy |
| Body/sm | 13px | 450 | 1.35 | Metadata |
| Caption | 11px | 600 | 1.25 | Tiny labels |

### Font Stack

- Primary: system UI, `-apple-system`, BlinkMacSystemFont, `Segoe UI`, sans-serif.
- Mono: SFMono-Regular, ui-monospace, Menlo, Consolas, monospace.

### Rules

- Letter spacing stays `0`.
- Large numbers are the hero. Keep labels short and below or above the number.
- Chinese labels must not wrap to one-character orphan lines. Short labels use `white-space: nowrap`.

## 4. Spacing & Layout

### Base Unit

All spacing derives from 4px.

| Token | Value | Usage |
|-------|-------|-------|
| `--cm-space-1` | 4px | Icon nudge |
| `--cm-space-2` | 8px | Dense gaps |
| `--cm-space-3` | 12px | Chip padding |
| `--cm-space-4` | 16px | Row rhythm |
| `--cm-space-5` | 20px | Card padding |
| `--cm-space-6` | 24px | Page gutter |
| `--cm-space-8` | 32px | Section gaps |

### Grid

- Primary target: 375px to 430px mobile viewport.
- Page gutter: 28px on the Phantom shell.
- Horizontal modules scroll instead of compressing.
- Bottom search and FAB reserve 96px of safe area.

## 5. Components

### Phantom Shell

- **Structure**: black phone canvas, app navigation, service state inside content, pill tabs, content, bottom search, floating action button.
- **States**: tab selected/inactive, FAB expanded/collapsed, drawer open/closed.
- **Motion**: tab/page changes use opacity, vertical offset, and blur.

### Pill Tabs

- **Structure**: avatar chip plus four rounded tabs.
- **Selected**: purple fill with black text.
- **Inactive**: graphite fill with soft text.
- **Sizing**: 44px minimum height, no wrapping.

### Balance Hero

- **Structure**: account selector, large value, subtitle, primary CTA, four quick action tiles.
- **CashMind mapping**: total net balance, monthly expense, current budget, automation health.
- **Motion**: no decorative animation; value remains stable.

### Finance Cards

- **Structure**: rounded 24px to 28px graphite card, icon coin, title, metric, delta.
- **Variants**: horizontal source card, insight card, settings list card, chart panel.
- **States**: tap scale and tonal raise only.

### Action Rows

- **Structure**: one row, circular icon, title, secondary detail, right chevron/status.
- **Usage**: settings actions, shortcut setup actions, transaction sheet actions.
- **States**: raised graphite default, purple selected, red destructive.
- **Sizing**: 56px to 72px height depending on content; labels never wrap into single-character lines.

### Status Pills

- **Structure**: compact rounded pill with a small dot or icon and one short status string.
- **Usage**: automation ready state, budget progress, copy/self-test state.
- **Color**: green for ready/synced, amber for setup, red for error.

### Bottom Search

- **Structure**: fixed pill input at bottom-left with search icon.
- **Behavior**: on Home, filters transaction list; elsewhere remains a global-looking search affordance.
- **Sizing**: leaves room for FAB at bottom-right.

### Floating Action Menu

- **Structure**: purple circular FAB; expanded menu uses blurred page scrim and right-aligned actions.
- **Actions**: 手动补记, 自动化, 设置预算, 快捷说明.
- **Motion**: opacity + transform only.

### Bottom Sheet

- **Structure**: blurred dark scrim, rounded top sheet, drag handle, close icon or cancel action.
- **Variants**: transaction actions, settings modals, budget/currency selectors.
- **Accessibility**: visible close button; focus trap is accepted debt for 1.0.

### Account Drawer

- **Structure**: left slide panel with avatar, handle, account row, profile/history/settings/support rows.
- **Motion**: panel slides from left; content behind is dimmed and shifted visually by overlay only.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Tap | 100ms | ease-out | Buttons and tiles |
| Page | 220ms | ease-out | Tab changes |
| Sheet | 280ms | spring/ease-out | Bottom sheets |
| Drawer | 260ms | ease-out | Side drawer |

Rules:

- Animate `transform`, `opacity`, and `filter` only.
- Hover/tap states must communicate clickability.
- No decorative bouncing or idle motion.

## 7. Depth & Surface

### Strategy

Solid dark material with subtle edges and larger-radius cards.

| Level | Value | Usage |
|-------|-------|-------|
| Card | `inset 0 1px 0 rgba(255,255,255,0.04)` | Graphite cards |
| Floating | `0 18px 44px rgba(0,0,0,0.45)` | Bottom search and FAB |
| Sheet | `0 -24px 70px rgba(0,0,0,0.55)` | Bottom sheets |
| Drawer | `28px 0 70px rgba(0,0,0,0.55)` | Account drawer |

Rules:

- Avoid nested cards inside cards; lists are rows on one parent surface.
- Avoid decorative orbs and bokeh blobs.
- If a component appears twice, use a shared CSS utility or primitive.
- Bottom floating controls must not cover the primary reading target; long pages reserve extra bottom padding and sheets portal above the shell.
- Never render fake iOS system chrome, status bars, or Dynamic Island pills inside the app surface.

## Reference Notes

- Phantom official positioning: money app for trading, predictions, move money, security, and 20M+ community.
- Phantom mobile screenshots show a dark balance-first wallet, top navigation/chips, quick action tiles, bottom tab/search patterns, action sheets, and large rounded graphite cards.
- Phantom brand notes describe purple as a core brand color and the identity as friendly, trustworthy, approachable, expressive, and fun.
