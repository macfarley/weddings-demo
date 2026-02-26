// Chakra UI custom theme for May-Collins Wedding
import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

const customConfig = defineConfig({
  theme: {
    tokens: {
      colors: {
        'base.white': { value: '#FFFFFF' },
        'base.black': { value: '#000000' },
        'base.grayLight': { value: '#F7F7F7' },
        'base.grayDark': { value: '#111111' },
        'racing.red': { value: '#E4002B' },
        'racing.blue': { value: '#007AC2' },
        'racing.yellow': { value: '#FFD659' },
        'vintage.clay': { value: '#B64926' },
        'vintage.cream': { value: '#F8F3E6' },
        'vintage.charcoal': { value: '#1A1A1A' },
        'vintage.steel': { value: '#7A7A7A' },
        'vintage.pettyBlue': { value: '#3BA9E0' },
        'vintage.barnRed': { value: '#A83232' },
        'vintage.sunsetOrange': { value: '#F28C28' },
        'vintage.ghostSilver': { value: '#C0C0C0' },
      },
      fonts: {
        heading: { value: "'Permanent Marker', sans-serif" },
        body: { value: "'Inter', sans-serif" },
      },
    },
  },
});

export const system = createSystem(defaultConfig, customConfig);
