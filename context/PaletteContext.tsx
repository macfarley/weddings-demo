// PaletteContext - globally available palette state
import { createContext, useContext, useState, ReactNode } from 'react';
import { PaletteName, getPalette, Palette } from '../lib/palettes';

interface PaletteContextType {
  activePalette: PaletteName;
  palette: Palette;
  setPalette: (name: PaletteName) => void;
}

const PaletteContext = createContext<PaletteContextType | undefined>(undefined);

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [activePalette] = useState<PaletteName>('petty-shop');
  const palette = getPalette(activePalette);
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
