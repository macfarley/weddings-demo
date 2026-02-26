// ColorSwatches component: shows vertical bar of color squares with names
import React from 'react';
import '../styles/components/color-swatches.css';

interface ColorSwatchesProps {
  colors: string[];
  names: string[];
  show: boolean;
}

export default function ColorSwatches({ colors, names, show }: ColorSwatchesProps) {
  if (!show) return null;

  // Helper to determine best text color (black/white) for contrast
  function getTextColor(bg: string) {
    if (!bg) return 'black';
    // Remove # and parse hex
    const hex = bg.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? 'black' : 'white';
  }

  return (
    <div
      className="color-swatch-container"
      aria-label="Color swatches"
      role="list"
    >
      {colors.map((color, i) => {
        const textColor = getTextColor(color);
        return (
          <div
            key={i}
            className="color-swatch-box"
            style={{
              backgroundColor: color,
            }}
            role="listitem"
          >
            <div
              className="color-swatch-label"
              style={{
                background: textColor === 'white' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)',
                color: textColor,
              }}
            >
              {names[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
