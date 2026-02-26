// ColorStoryToggle component stub
import '../styles/components/color-story-toggle.css';

interface ColorStoryToggleProps {
  colorStories: { name: string; colors: string[] }[];
  active: number;
  setActive: (i: number) => void;
}

export default function ColorStoryToggle({ colorStories, active, setActive }: ColorStoryToggleProps) {
  const theme = colorStories[active].colors;
  // Accessible keyboard navigation
  const handleKeyDown = (e, i) => {
    if (e.key === 'Enter' || e.key === ' ') {
      setActive(i);
    }
  };
  return (
    <section
      aria-label="Color story selector"
      className="color-story-selector"
      style={{ backgroundColor: theme[1], color: theme[3] }}
    >
      <div className="color-story-tablist" role="tablist" aria-label="Color stories">
        {colorStories.map((story, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={active === i}
            tabIndex={0}
            className={`color-story-tab ${active === i ? 'active' : 'inactive'}`}
            onClick={() => setActive(i)}
            onKeyDown={e => handleKeyDown(e, i)}
          >
            {story.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-6" aria-label="Color swatches">
        {theme.map((color, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded border border-gray-400"
            style={{ background: color }}
            title={color}
            aria-label={`Swatch ${color}`}
          ></div>
        ))}
      </div>
    </section>
  );
}
