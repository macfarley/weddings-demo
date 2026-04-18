import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GuestbookPage, { validateGuestbookEntry } from '../../pages/guestbook';

const insertMock = jest.fn();

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
  isSupabaseConfigured: jest.fn(() => true),
  getWeddingSlug: jest.fn(() => 'default'),
  getSupabaseBrowserClient: jest.fn(() => ({
    from: (_table: string) => ({
      insert: insertMock,
    }),
  })),
}));

describe('Guestbook form validation', () => {
  beforeEach(() => {
    insertMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
  });

  it('shows error when submitted with no name', async () => {
    render(<GuestbookPage />);

    fireEvent.click(screen.getByRole('button', { name: /sign guestbook/i }));

    await waitFor(() => {
      expect(screen.getByText(/please enter your name/i)).toBeInTheDocument();
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('shows error when submitted with no message', async () => {
    render(<GuestbookPage />);

    fireEvent.change(screen.getByPlaceholderText(/first name/i), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByPlaceholderText(/uncle tony/i), { target: { value: 'Smith' } });
    // leave message blank
    fireEvent.click(screen.getByRole('button', { name: /sign guestbook/i }));

    await waitFor(() => {
      expect(screen.getByText(/please enter a message/i)).toBeInTheDocument();
    });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('shows error when name exceeds 50 characters', () => {
    // The onChange handler slices input to 50 chars, so this is tested as a unit
    const errs = validateGuestbookEntry('A'.repeat(51), 'Smith', 'Hello!');
    expect(errs).toContain('Name must be 50 characters or less');
  });

  it('shows error when message exceeds 500 characters', () => {
    // The onChange handler slices input to 500 chars, so this is tested as a unit
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
    expect(insertMock).not.toHaveBeenCalled();
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
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('shows toast error when Supabase insert fails', async () => {
    insertMock.mockResolvedValue({ error: { message: 'DB connection failed' } });

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

  it('shows unavailable toast when Supabase is not configured', async () => {
    const { isSupabaseConfigured } = jest.requireMock('../../lib/supabase');
    (isSupabaseConfigured as jest.Mock).mockReturnValueOnce(false);

    render(<GuestbookPage />);

    fireEvent.change(screen.getByPlaceholderText(/first name/i), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByPlaceholderText(/uncle tony/i), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByPlaceholderText(/share your well wishes/i), {
      target: { value: 'Congrats!' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign guestbook/i }));

    await waitFor(() => {
      expect(screen.getByText(/guestbook is not available yet/i)).toBeInTheDocument();
    });
    expect(insertMock).not.toHaveBeenCalled();
  });
});
