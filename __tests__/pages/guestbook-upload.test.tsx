import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GuestbookPage from '../../pages/guestbook';

const fetchMock = jest.fn();
const startUploadMock = jest.fn();

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

jest.mock('../../lib/supabase', () => ({
  getWeddingSlug: jest.fn(() => 'default'),
}));

jest.mock('../../lib/uploadthing-client', () => ({
  useUploadThing: jest.fn(() => ({ startUpload: startUploadMock })),
}));

beforeEach(() => {
  fetchMock.mockReset();
  startUploadMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('Guestbook public form', () => {
  it('submits guestbook form successfully', async () => {
    render(<GuestbookPage />);

    fireEvent.change(screen.getByPlaceholderText(/first name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText(/uncle tony/i), { target: { value: 'May' } });
    fireEvent.change(screen.getByPlaceholderText(/share your well wishes/i), {
      target: { value: 'Congrats to you both!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign guestbook/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/guestbook',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(screen.getByText(/message has been saved/i)).toBeInTheDocument();
    });
  });
});
