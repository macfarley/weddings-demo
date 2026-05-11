// PaletteContext — globally available palette state for the wedding site theme system.
//
// The active palette drives all inline-style color values across pages and components.
// setPalette is intentionally a no-op stub: the couple has chosen a single palette
// ('petty-shop') for the live site. The switcher UI exists in the codebase for demos
// and future multi-client deployments but is not exposed to guests.
//
// If you need to change the active palette for a new deployment, update the
// `useState<PaletteName>('petty-shop')` default below.
import { createContext, useContext, useState, ReactNode } from 'react';
import { PaletteName, getPalette, Palette } from '../lib/palettes';

interface PaletteContextType {
  activePalette: PaletteName;
  palette: Palette;
  setPalette: (name: PaletteName) => void;
}

const PaletteContext = createContext<PaletteContextType | undefined>(undefined);

export function PaletteProvider({ children }: { children: ReactNode }) {
  // 'petty-shop' is the chosen theme for John & Crystal's live site.
  // Change this default when deploying for a new couple.
  const [activePalette] = useState<PaletteName>('petty-shop');
  const palette = getPalette(activePalette);
  // No-op: palette switching is disabled on the live site.
  // The switcher component still exists for demo/portfolio use.
  const setPalette = (_name: PaletteName) => {};

  return (
    <PaletteContext.Provider value={{ activePalette, palette, setPalette }}>
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette() {
  const context = useContext(PaletteContext);
  if (!context) {
    throw new Error('usePalette must be used within PaletteProvider');
  }
  return context;
}
