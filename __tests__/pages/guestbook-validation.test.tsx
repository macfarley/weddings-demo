import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GuestbookPage, { validateGuestbookEntry } from '../../pages/guestbook';

const fetchMock = jest.fn();

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

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('Guestbook form validation', () => {
  it('shows error when submitted with no name', async () => {
    render(<GuestbookPage />);
    fireEvent.click(screen.getByRole('button', { name: /sign guestbook/i }));
    await waitFor(() => {
      expect(screen.getByText(/please enter your name/i)).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalledWith('/api/guestbook', expect.anything());
  });

  it('shows error when submitted with no message', async () => {
    render(<GuestbookPage />);
    fireEvent.change(screen.getByPlaceholderText(/first name/i), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByPlaceholderText(/uncle tony/i), { target: { value: 'Smith' } });
    fireEvent.click(screen.getByRole('button', { name: /sign guestbook/i }));
    await waitFor(() => {
      expect(screen.getByText(/please enter a message/i)).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalledWith('/api/guestbook', expect.anything());
  });

  it('shows error when name exceeds 50 characters', () => {
    const errs = validateGuestbookEntry('A'.repeat(51), 'Smith', 'Hello!');
    expect(errs).toContain('Name must be 50 characters or less');
  });

  it('shows error when message exceeds 500 characters', () => {
    const errs = validateGuestbookEntry('Alex', 'Smith', 'X'.repeat(501));
    expect(errs).toContain('Message must be 500 characters or less');
  });

  it('blocks script injection in name field', async () => {
    render(<GuestbookPage />);
    fireEvent.change(screen.getByPlaceholderText(/first name/i), {
      target: { value: '<script>alert(1)</script>' },
    });
    fireEvent.change(screen.getByPlaceholderText(/uncle tony/i), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByPlaceholderText(/share your well wishes/i), { target: { value: 'Hello!' } });
    fireEvent.click(screen.getByRole('button', { name: /sign guestbook/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid characters detected/i)).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalledWith('/api/guestbook', expect.anything());
  });

  it('blocks javascript: injection in message field', async () => {
    render(<GuestbookPage />);
    fireEvent.change(screen.getByPlaceholderText(/first name/i), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByPlaceholderText(/uncle tony/i), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByPlaceholderText(/share your well wishes/i), {
      target: { value: 'Click javascript:alert(1)' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign guestbook/i }));
    await waitFor(() => {
      expect(screen.getByText(/invalid characters detected/i)).toBeInTheDocument();
    });
    expect(fetchMock).not.toHaveBeenCalledWith('/api/guestbook', expect.anything());
  });

  it('shows error when API returns an error', async () => {
    // First call: on-load fetch of approved guestbook entries (worker)
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [] }) });
    // Second call: form submit to /api/guestbook
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'DB connection failed' }),
    });
    render(<GuestbookPage />);
    fireEvent.change(screen.getByPlaceholderText(/first name/i), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByPlaceholderText(/uncle tony/i), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByPlaceholderText(/share your well wishes/i), {
      target: { value: 'Congrats!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign guestbook/i }));
    await waitFor(() => {
      expect(screen.getByText(/DB connection failed/i)).toBeInTheDocument();
    });
  });
});
