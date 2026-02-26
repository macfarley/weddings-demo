// PalettePicker Component - allows users to select from 4 color palettes
import { PALETTES, PALETTE_NAMES, PaletteName, Palette } from '../lib/palettes';
import styles from '../styles/palette-picker.module.css';

interface PalettePickerProps {
  selected: PaletteName;
  onSelect: (paletteName: PaletteName) => void;
}

export default function PalettePicker({ selected, onSelect }: PalettePickerProps) {
  return (
    <div className={styles.container}>
      <div className={styles.label}>Select a Color Palette</div>
      <div className={styles.grid}>
        {PALETTE_NAMES.map((paletteKey) => {
          const palette = PALETTES[paletteKey];
          const isSelected = selected === paletteKey;
          
          return (
            <button
              key={paletteKey}
              className={`${styles.paletteCard} ${isSelected ? styles.selected : ''}`}
              onClick={() => onSelect(paletteKey as PaletteName)}
              title={palette.vibe}
            >
              {/* Palette color swatches */}
              <div className={styles.swatches}>
                <div
                  className={styles.swatch}
                  style={{ backgroundColor: palette.primary }}
                  title="Primary"
                />
                <div
                  className={styles.swatch}
                  style={{ backgroundColor: palette.secondary }}
                  title="Secondary"
                />
                <div
                  className={styles.swatch}
                  style={{ backgroundColor: palette.highlight }}
                  title="Highlight"
                />
                <div
                  className={styles.swatch}
                  style={{ backgroundColor: palette.background }}
                  title="Background"
                />
                <div
                  className={styles.swatch}
                  style={{ backgroundColor: palette.text }}
                  title="Text"
                />
              </div>
              
              {/* Palette name and vibe */}
              <div className={styles.info}>
                <div className={styles.name}>{palette.label}</div>
                <div className={styles.vibe}>{palette.vibe}</div>
              </div>

              {/* Selection indicator */}
              {isSelected && <div className={styles.checkmark}>✓</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
