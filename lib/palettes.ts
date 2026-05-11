// Color palettes for the wedding site theme system.
//
// Each palette is a complete color set: primary accent, secondary, highlight,
// background, and text. All inline styles across pages and components reference
// values from the active palette via usePalette().
//
// Palette concept: John & Crystal's shared passion is NASCAR / motorsports.
// All four palettes are themed around that culture — Petty Blue, victory lanes,
// dirt-track evenings, Appalachian backroads. This was a deliberate creative
// choice that made the site feel personal rather than generic wedding-template.
//
// The live site uses 'petty-shop'. Other palettes are available for demos.
// To add a new palette: add a key here, add its Palette object to PALETTES, and
// add it to the PaletteName union type.
export type PaletteName = 'dirt-track-sunset' | 'petty-shop' | 'victory-lane' | 'moonshine-runner';

export interface Palette {
  name: string;
  label: string;
  vibe: string;
  primary: string;      // Main accent color
  secondary: string;    // Secondary accent
  highlight: string;    // Button/highlight color
  background: string;   // Card background
  text: string;        // Text color
}

export const PALETTES: Record<PaletteName, Palette> = {
  'dirt-track-sunset': {
    name: 'dirt-track-sunset',
    label: 'Dirt Track Sunset',
    vibe: 'Warm, bold, nostalgic Americana. County-fair evenings.',
    primary: '#B64926',      // Clay Red (border)
    secondary: '#F2C94C',    // Number-Plate Yellow (card background)
    highlight: '#F28C28',    // Sunset Orange (text outline effect)
    background: '#F8F3E6',   // Cream White
    text: '#1A1A1A',         // Charcoal (maximum sunset contrast on yellow)
  },
  'petty-shop': {
    name: 'petty-shop',
    label: 'Petty Shop Accident',
    vibe: 'Bright, clean, iconic. Vintage garage meets modern wedding.',
    primary: '#3BA9E0',      // Petty Blue
    secondary: '#E74A4A',    // Shop Red (lifted for better readability)
    highlight: '#C4C4C4',    // Silver
    background: '#FAFAFA',   // Off-White
    text: '#000000',         // Black
  },
  'victory-lane': {
    name: 'victory-lane',
    label: 'Victory Lane Neon',
    vibe: 'Fun, bold, celebratory. Throwback weekend energy.',
    primary: '#007AC2',      // Electric Blue
    secondary: '#FFD659',    // Victory Yellow
    highlight: '#E4002B',    // Cherry Red
    background: '#FFFFFF',   // White
    text: '#2E2E2E',         // Gunmetal
  },
  'moonshine-runner': {
    name: 'moonshine-runner',
    label: 'Moonshine Runner',
    vibe: 'Bootlegging heritage + rural Ohio. Mason jars & backroads.',
    primary: '#A83232',      // Barn Red
    secondary: '#6BAED6',    // Mason-Jar Blue
    highlight: '#D4AF37',    // Corn Whiskey Gold
    background: '#FFF4D9',   // Cream Paper
    text: '#111111',         // Asphalt Black
  },
};

export const PALETTE_NAMES = Object.keys(PALETTES) as PaletteName[];

export function getPalette(name: PaletteName): Palette {
  return PALETTES[name] || PALETTES['dirt-track-sunset'];
}
