import { useState } from 'react';
import ColorStoryToggle from '../components/ColorStoryToggle';
import Gallery from '../components/Gallery';

export default function Demo() {
  const [activeStory, setActiveStory] = useState(0);

  const colorStories = [
    {
      name: 'Dirt Track Sunset',
      colors: ['#B64926', '#F2C94C', '#F28C28', '#1A1A1A'],
    },
    {
      name: 'Petty Shop',
      colors: ['#C94747', '#F4B860', '#E8A87C', '#2D1B00'],
    },
  ];

  return (
    <main>
      <h2>Demo Page</h2>
      <ColorStoryToggle colorStories={colorStories} active={activeStory} setActive={setActiveStory} />
      <Gallery />
    </main>
  );
}
