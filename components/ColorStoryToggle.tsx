// ColorStoryToggle component stub
import { useState } from 'react';

const colorStories = [
  {
    name: 'Dusty Blue + Slate + Cream',
    colors: ['#A8C1D1', '#6C7A89', '#F7F4ED', '#2F3A45'],
  },
  {
    name: 'Mauve + Rosewood + Champagne',
    colors: ['#C9A9A6', '#8B5E6A', '#F7E7CE', '#B8A39A'],
  },
  {
    name: 'Sage + Ivory + Gold',
    colors: ['#A3B18A', '#6B705C', '#F8F5F0', '#D4AF37'],
  },
];

export default function ColorStoryToggle() {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div style={{display:'flex',gap:8}}>
        {colorStories.map((story, i) => (
          <button key={i} onClick={() => setActive(i)} style={{fontWeight:active===i?'bold':'normal'}}>
            {story.name}
          </button>
        ))}
      </div>
      <div style={{display:'flex',gap:8,marginTop:8}}>
        {colorStories[active].colors.map((color, i) => (
          <div key={i} style={{width:32,height:32,background:color,borderRadius:4,border:'1px solid #ccc'}} title={color}></div>
        ))}
      </div>
    </div>
  );
}
