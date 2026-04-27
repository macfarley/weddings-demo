# Wedding Site — Style Guide

**John & Crystal May-Collins — May 9, 2026**
**Auglaize County Fairgrounds — Wapakoneta, Ohio**

Visual identity: black-and-white checkered flag background (fixed, semi-transparent),
semi-transparent white cards floating above, 4 selectable racing-themed color palettes,
hand-painted / display heading font, and mobile-first custom CSS.

> **Active palette for this deployment:** `petty-shop` (Petty Blue + Silver)
> Set in `context/PaletteContext.tsx`. Change it by updating the `useState` default.

---

## Color Palettes

Four named palettes are defined in `lib/palettes.ts`. Each drives the entire site via
`PaletteContext` — `primary`, `secondary`, `highlight`, `background`, and `text` tokens.

### Palette 1 — Dirt Track Sunset
**Vibe:** Warm, bold, nostalgic Americana. County-fair evenings, dirt-track authenticity.

| Token | Color Name | Hex |
|-------|-----------|-----|
| `primary` | Clay Red | `#B64926` |
| `secondary` | Number-Plate Yellow | `#F2C94C` |
| `highlight` | Sunset Orange | `#F28C28` |
| `background` | Cream White | `#F8F3E6` |
| `text` | Charcoal Black | `#1A1A1A` |

### Palette 2 — Petty Shop Accident *(active)*
**Vibe:** Bright, clean, iconic. Vintage stock-car garage meets modern wedding.

| Token | Color Name | Hex |
|-------|-----------|-----|
| `primary` | Petty Blue | `#3BA9E0` |
| `secondary` | Shop Red | `#E74A4A` |
| `highlight` | Silver | `#C4C4C4` |
| `background` | Off-White | `#FAFAFA` |
| `text` | Black | `#000000` |

### Palette 3 — Victory Lane Neon
**Vibe:** Fun, bold, celebratory. Throwback weekend meets wedding party.

| Token | Color Name | Hex |
|-------|-----------|-----|
| `primary` | Electric Blue | `#007AC2` |
| `secondary` | Victory Yellow | `#FFD659` |
| `highlight` | Cherry Red | `#E4002B` |
| `background` | White | `#FFFFFF` |
| `text` | Gunmetal | `#2E2E2E` |

### Palette 4 — Moonshine Runner
**Vibe:** Bootlegging heritage + rural Ohio. Mason jars, backroads, outlaw Americana.

| Token | Color Name | Hex |
|-------|-----------|-----|
| `primary` | Barn Red | `#A83232` |
| `secondary` | Mason-Jar Blue | `#6BAED6` |
| `highlight` | Corn Whiskey Gold | `#D4AF37` |
| `background` | Cream Paper | `#FFF4D9` |
| `text` | Asphalt Black | `#111111` |

---

## Typography

Fonts are loaded in `pages/fonts.tsx` (rendered via iframe to `/font-preview.html`)
and applied in `styles/globals.css`.

| Role | Font | Notes |
|------|------|-------|
| Display / H1 | Permanent Marker | Hand-painted, Google Fonts |
| Body | Inter | 400 and 700 weights |

**Sizing scale (base: 1.125rem):**
- `h1` - 2.25rem
- `h2` - 1.875rem
- `body` - 1.125rem
- `caption` - 0.75rem

`Permanent Marker` is used for hero headings and major page titles to reinforce the
Americana theme. `Inter` is used for all body content to keep readability high for
older guests.

---

## Layout

The site uses custom CSS. Chakra UI is scoped to modals/overlays only - not layout.

### Containers
`.section-full` is the standard full-width section wrapper. Max-width is `900px`,
centered via `margin: 0 auto`.

### Cards
All content floats in semi-transparent white cards above the checkered background:
- `background: rgba(255, 255, 255, 0.96)`
- `border-radius: 1rem`
- `padding: 2rem`
- `box-shadow: 0 4px 6px 0 rgba(0, 0, 0, 0.1)`
- Border color driven by `palette.primary`

### Background
`/photos/checkered-flag.jpg` - fixed position, CSS `opacity: 0.15` overlay, full viewport.

### Gallery Grid
- Desktop: 4 columns
- Tablet (<= 1024px): 3 columns
- Mobile (<= 768px): 2 columns
- Small mobile (<= 480px): 1 column
- Gap: 1rem
- Thumbnail aspect ratio: 1:1 (square crop)

---

## Responsive Breakpoints

| Breakpoint | Width | Notes |
|-----------|-------|-------|
| Mobile | <= 480px | 1 column, large tap targets |
| Tablet | <= 768px | 2-column gallery, fluid containers (`90vw`) |
| Desktop | > 768px | Full layout, navbar links visible |
| Wide navbar | > 1100px | Hamburger collapses below this |

---

## Tone and Personality

The site should feel:
- Warm and nostalgic - not corporate
- Authentically rural Ohio - recognizable to locals
- Racing-adjacent without being a NASCAR fan page
- Respectful of the sport's working-class and outlaw roots
- Modern enough to be usable by older guests on mobile
- Celebratory - this is a wedding, not a history exhibit

**Target aesthetic:** *"Moonshine-runner Americana meets modern wedding elegance."*
