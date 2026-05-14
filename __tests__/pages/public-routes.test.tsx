import { render, screen } from '@testing-library/react';
import UnderConstruction from '../../pages/under-construction';
import About from '../../pages/about';
import GalleryPage from '../../pages/gallery';

// Bypass the DisplayNameGate and localStorage cache in tests.
jest.mock('../../lib/contentCache', () => ({
  getDisplayName: jest.fn(() => 'Test User'),
  setDisplayName: jest.fn(),
  getCached: jest.fn(() => null),
  setCached: jest.fn(),
  clearCached: jest.fn(),
  shouldRefresh: jest.fn(() => Promise.resolve(true)),
  POLL_INTERVAL_MS: 999_999,
}));

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
    // Clear worker URL so the component uses mock photos instead of firing a
    // real fetch (which would fail in the test environment and set photos=[]).
    const savedUrl = process.env.NEXT_PUBLIC_WORKER_BASE_URL;
    delete process.env.NEXT_PUBLIC_WORKER_BASE_URL;

    render(<GalleryPage />);

    process.env.NEXT_PUBLIC_WORKER_BASE_URL = savedUrl;

    expect(screen.getByText('Gallery')).toBeInTheDocument();
    // Mock photos render as emoji placeholder tiles (role="presentation")
    expect(screen.getAllByRole('presentation').length).toBeGreaterThan(0);
  });
});
