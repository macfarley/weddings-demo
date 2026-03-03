import { render, screen } from '@testing-library/react';
import UnderConstruction from '../../pages/under-construction';
import About from '../../pages/about';
import GalleryPage from '../../pages/gallery';

jest.mock('../../context/PaletteContext', () => ({
  usePalette: () => ({
    palette: {
      primary: '#111111',
      secondary: '#ffffff',
      text: '#222222',
      highlight: '#cccccc',
      background: '#f7f7f7',
    },
  }),
}));

describe('Public page routes', () => {
  it('renders /under-construction content', () => {
    render(<UnderConstruction />);
    expect(screen.getByText(/wedding site is in progress/i)).toBeInTheDocument();
  });

  it('renders /about content', () => {
    render(<About />);
    expect(screen.getByText(/our story/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /john and crystal smiling together/i })).toBeInTheDocument();
  });

  it('renders /gallery content', () => {
    render(<GalleryPage />);
    expect(screen.getByText('Gallery')).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });
});
