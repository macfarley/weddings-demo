import { render, screen, waitFor } from '@testing-library/react';
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

const WORKER_URL = 'https://worker.example.workers.dev';

describe('Gallery page worker integration', () => {
  const originalEnv = process.env.NEXT_PUBLIC_WORKER_BASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_WORKER_BASE_URL = WORKER_URL;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_WORKER_BASE_URL = originalEnv;
    jest.restoreAllMocks();
  });

  it('shows mock photos when no worker URL is set', () => {
    delete process.env.NEXT_PUBLIC_WORKER_BASE_URL;
    render(<GalleryPage />);
    expect(screen.getByText('Gallery')).toBeInTheDocument();
    // Mock photos render as emoji placeholder tiles (role="presentation")
    expect(screen.getAllByRole('presentation').length).toBeGreaterThan(0);
  });

  it('renders approved photos returned by worker', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'abc-123',
            image_url: 'https://example.com/photo1.jpg',
            download_url: 'https://example.com/photo1.jpg?download=photo1.jpg',
            original_filename: 'photo1.jpg',
            uploader_name: 'Casey',
            caption: 'First dance!',
            label_raw: 'First Dance',
            love_count: 3,
          },
        ],
      }),
    } as Response);

    render(<GalleryPage />);

    await waitFor(() => {
      expect(screen.getByText('First Dance')).toBeInTheDocument();
    });
  });

  it('shows empty state when worker returns no photos', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    render(<GalleryPage />);

    await waitFor(() => {
      expect(screen.getByText(/no approved photos yet/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when worker returns an error response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    } as Response);

    render(<GalleryPage />);

    await waitFor(() => {
      expect(screen.getByText(/no approved photos yet/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when fetch throws (network error)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'));

    render(<GalleryPage />);

    await waitFor(() => {
      expect(screen.getByText(/no approved photos yet/i)).toBeInTheDocument();
    });
  });

  it('shows sort controls when photos are present', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'abc-123',
            image_url: 'https://example.com/photo1.jpg',
            download_url: 'https://example.com/photo1.jpg',
            original_filename: 'photo1.jpg',
            uploader_name: 'Pat',
            caption: '',
            label_raw: 'Ceremony',
            love_count: 0,
          },
        ],
      }),
    } as Response);

    render(<GalleryPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /newest first/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /most loved/i })).toBeInTheDocument();
    });
  });
});
