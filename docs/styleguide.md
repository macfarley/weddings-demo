# Wedding Site Style Guide

**John & Crystal May‑Collins — May 9, 2026**  
**Auglaize County Fairgrounds — Wapakoneta, Ohio**

This style guide defines the visual identity for a wedding site with:

- A **black/white checkered flag** background (fixed, semi-transparent overlay)
- **4 selectable color palettes** to demonstrate different site vibes
- **Eldora dirt-track racing** heritage and bootlegging Americana
- **Semi-transparent white cards** floating over the background
- **Responsive, mobile-first design** with Chakra UI

---

## 🎨 Color Palettes

We have **4 curated palettes**, each designed to work with the checkered background and complement the racing/Americana theme. Select any palette from the color picker on the homepage to see the entire site transform.

### Palette 1 — "Dirt Track Sunset"

**Vibe:** Warm, bold, nostalgic Americana. County-fair evenings, dirt-track authenticity.

| Element | Color | Hex |
|---------|-------|------|
| **Primary Accent** | Clay Red | `#B64926` |
| **Secondary Accent** | Sunset Orange | `#F28C28` |
| **Highlight** | Number-Plate Yellow | `#F2C94C` |
| **Background** | Cream White | `#F8F3E6` |
| **Text** | Charcoal Black | `#1A1A1A` |

**Use:** Hero sections, main CTAs, section headers, buttons.

---

### Palette 2 — "Petty Shop Accident"

**Vibe:** Bright, clean, iconic. Vintage stock-car garage meets modern wedding.

| Element | Color | Hex |
|---------|-------|------|
| **Primary Accent** | Petty Blue | `#3BA9E0` |
| **Secondary Accent** | Shop Red | `#D62828` |
| **Highlight** | Silver | `#C4C4C4` |
| **Background** | Off-White | `#FAFAFA` |
| **Text** | Black | `#000000` |

**Use:** Timeline sections, RSVP buttons, modern accent pieces.

---

### Palette 3 — "Victory Lane Neon"

**Vibe:** Fun, bold, celebratory. Throwback weekend meets wedding party.

| Element | Color | Hex |
|---------|-------|------|
| **Primary Accent** | Electric Blue | `#007AC2` |
| **Secondary Accent** | Victory Yellow | `#FFD659` |
| **Highlight** | Cherry Red | `#E4002B` |
| **Background** | White | `#FFFFFF` |
| **Text** | Gunmetal | `#2E2E2E` |

**Use:** High-energy buttons, callouts, celebratory sections.

---

### Palette 4 — "Moonshine Runner"

**Vibe:** Bootlegging heritage + rural Ohio + racing roots. Mason jars, backroads, outlaw Americana — but classy.

| Element | Color | Hex |
|---------|-------|------|
| **Primary Accent** | Barn Red | `#A83232` |
| **Secondary Accent** | Mason-Jar Blue | `#6BAED6` |
| **Highlight** | Corn Whiskey Gold | `#D4AF37` |
| **Background** | Cream Paper | `#FFF4D9` |
| **Text** | Asphalt Black | `#111111` |

**Use:** Guestbook, footer, heritage storytelling, printed materials.

---

## 🖼️ Design Elements

### Background
- **Wavy Checkered Flag Pattern** (`/photos/checkered-flag.jpg`)
- **Fixed Position** — stays in place while scrolling
- **15% Opacity Overlay** — creates depth and prevents images from being too bright
- **Visible Throughout** — cards and sections float above with semi-transparent backgrounds to show pattern

### Cards & Sections
- **Background Opacity:** 85% white (varies by palette)
- **Border Radius:** 1rem
- **Padding:** 2rem
- **Box Shadow:** `0 4px 6px 0 rgba(0, 0, 0, 0.1)`
- **Border Option:** 2px solid primary color for emphasis

### Gallery
- **Grid:** 4 columns (desktop), 3 columns (tablet), 2 columns (mobile), 1 column (small mobile)
- **Thumbnail Background:** Semi-transparent white (90% opacity)
- **Aspect Ratio:** 1:1 (square)
- **Gap:** 1rem between items

---

## 📝 Typography

- **Headings:** Permanent Marker (display), Inter bold (secondary)
- **Body:** Inter 400 (regular), Inter 700 (bold)
- **Sizes:**
  - H1: 2.25rem
  - H2: 1.875rem
  - Body: 1.125rem
  - Caption: 0.75rem

---

## 🎯 Responsive Breakpoints

- **Desktop:** Full width, all features visible
- **Tablet (768px):** Gallery 2 columns, simplified layouts
- **Mobile (480px):** Gallery 1 column, touch-friendly buttons, readable text

---

## 🎪 Tone & Personality

The site should feel:

- Warm and nostalgic
- Authentically rural Ohio
- Racing-adjacent without being corporate
- Respectful of the sport's outlaw roots
- Modern and readable
- Celebratory

**Think:** *"Moonshine-runner Americana meets modern wedding elegance."*

This style guide defines the visual identity, layout rules, and component patterns for the wedding website using **Chakra UI**. The design blends:

- old‑school stock‑car racing  
- Eldora dirt‑track culture  
- bootlegging heritage  
- Ohio county‑fair Americana  
- modern, readable UI components  

Chakra UI provides a stable, predictable foundation for layout, spacing, color, and responsive behavior.

---

# 🏁 1. Chakra Theme Overview

We extend Chakra’s theme with:

- a **custom color palette** inspired by early NASCAR and dirt‑track racing  
- **hand‑painted H1 font** for the hero  
- **condensed racing fonts** for section headers  
- **clean sans‑serif** for body text  
- **subtle checkered textures** as background layers  
- **responsive grid layouts** for the gallery  

Everything is built using Chakra’s `theme`, `extendTheme`, and component props.

---

# 🎨 2. Color System

## **Base Colors**
Used for backgrounds, cards, and text.

```ts
colors: {
  base: {
    white: "#FFFFFF",
    black: "#000000",
    grayLight: "#F7F7F7",
    grayDark: "#111111",
  },
```

---

## **Accent Colors (Racing‑Inspired, Trademark‑Safe)**

```ts
  racing: {
    red: "#E4002B",
    blue: "#007AC2",
    yellow: "#FFD659",
  },
```

---

## **Vintage Racing Palettes**

```ts
  vintage: {
    clay: "#B64926",
    cream: "#F8F3E6",
    charcoal: "#1A1A1A",
    steel: "#7A7A7A",
    pettyBlue: "#3BA9E0",
    barnRed: "#A83232",
    sunsetOrange: "#F28C28",
    ghostSilver: "#C0C0C0",
  },
}
```

These palettes are used for:

- hero backgrounds  
- section dividers  
- gallery frames  
- buttons  
- accents  

---

# 🏁 3. Typography

## **H1 — Hand‑Painted / Bootlegger Style**
Use a free brush font loaded via Google Fonts:

- **Permanent Marker**  
- **Rock Salt**  
- **Shrikhand**

Chakra theme:

```ts
fonts: {
  heading: "'Permanent Marker', sans-serif",
  body: "'Inter', sans-serif",
}
```

---

## **H2 / H3 — Racing / Speed Fonts**
Use condensed, bold, fast‑feeling fonts:

- **Barlow Condensed**  
- **Russo One**  
- **Antonio**

Example:

```tsx
<Text fontFamily="'Barlow Condensed'" fontSize="2xl" textTransform="uppercase">
  Lap 1 — Ceremony
</Text>
```

---

## **Body Text**
Readable, modern:

- Inter  
- Roboto  
- Source Sans 3  

---

# 🧱 4. Layout Rules (Chakra‑Native)

## **Global Layout**
Use Chakra’s `Container`:

```tsx
<Container maxW="900px" centerContent py={10}>
  {/* content */}
</Container>
```

This guarantees:

- centered layout  
- no horizontal scrolling  
- consistent spacing  

---

## **Page Structure**

```tsx
<VStack spacing={12} w="100%">
  <HeroSection />
  <Timeline />
  <Gallery />
  <Guestbook />
</VStack>
```

Chakra’s `VStack` keeps everything centered and evenly spaced.

---

# 🏁 5. Checkered Pattern Usage

Use a **background image layer** with low opacity:

```tsx
<Box
  bgImage="url('/checkered.png')"
  bgSize="200px"
  bgRepeat="repeat"
  opacity={0.05}
/>
```

Then overlay with a semi‑transparent layer:

```tsx
<Box bg="rgba(255,255,255,0.85)">
  {/* content */}
</Box>
```

Readable, subtle, racing‑adjacent.

---

# 🖼️ 6. Gallery Layout (Chakra Grid)

## **Desktop (4×4)**

```tsx
<Grid
  templateColumns="repeat(4, 1fr)"
  gap={4}
>
  {photos.map(...)}
</Grid>
```

## **Tablet (3×4)**

```tsx
templateColumns={{ base: "repeat(3, 1fr)", md: "repeat(4, 1fr)" }}
```

## **Mobile (3×5)**

```tsx
templateColumns={{ base: "repeat(3, 1fr)" }}
```

---

# 🔍 7. Photo Modal (Chakra Modal)

Chakra’s modal solves everything:

```tsx
<Modal isOpen={isOpen} onClose={onClose} size="xl">
  <ModalOverlay />
  <ModalContent bg="black">
    <Image src={selectedPhoto} maxH="90vh" objectFit="contain" />
  </ModalContent>
</Modal>
```

- ESC closes  
- clicking outside closes  
- X button optional  
- responsive out of the box  

---

# 🏁 8. Bootlegging Heritage Motifs

Use subtle, thematic elements:

### **Mason‑Jar Motif**
```tsx
<Icon as={GiMasonJar} color="vintage.clay" />
```

### **Garage‑Painted Numbers**
Use the brush font for section numbers.

### **Backroad Runner Vibe**
- thin racing stripes  
- dusty textures at 5–8% opacity  
- barn‑red accents  
- cream backgrounds  

---

# 🧡 9. Tone & Personality

The site should feel:

- warm  
- nostalgic  
- a little gritty  
- celebratory  
- authentically rural Ohio  
- racing‑adjacent without being corporate  
- respectful of the sport’s outlaw roots  

Think:  
**“Moonshine‑runner Americana meets modern wedding elegance.”**

