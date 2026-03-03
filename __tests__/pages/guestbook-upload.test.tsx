import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GuestbookPage from '../../pages/guestbook';
import UploadPage from '../../pages/sendyourphotos';

const insertMock = jest.fn();
const uploadMock = jest.fn();
const removeMock = jest.fn();

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
    from: (table: string) => ({
      insert: insertMock,
    }),
    storage: {
      from: () => ({
        upload: uploadMock,
        remove: removeMock,
      }),
    },
  })),
}));

describe('Guestbook + upload public flows', () => {
  beforeEach(() => {
    insertMock.mockReset();
    uploadMock.mockReset();
    removeMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
    uploadMock.mockResolvedValue({ error: null });
    removeMock.mockResolvedValue({ error: null });
  });

  it('submits guestbook form successfully', async () => {
    render(<GuestbookPage />);

    fireEvent.change(screen.getByPlaceholderText(/first name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText(/last name or nickname/i), { target: { value: 'May' } });
    fireEvent.change(screen.getByPlaceholderText(/share your well wishes/i), { target: { value: 'Congrats to you both!' } });

    fireEvent.click(screen.getByRole('button', { name: /sign guestbook/i }));

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
      expect(screen.getByText(/message has been saved/i)).toBeInTheDocument();
    });
  });

  it('submits photo upload flow successfully', async () => {
    render(<UploadPage />);

    const file = new File(['image-bytes'], 'photo.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    expect(fileInput).toBeInTheDocument();
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.change(screen.getByPlaceholderText(/first name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText(/last name or nickname/i), { target: { value: 'May' } });
    fireEvent.change(screen.getByPlaceholderText(/e.g., 'cutting the cake'/i), { target: { value: 'First Dance' } });

    fireEvent.click(screen.getByRole('button', { name: /upload photo & message/i }));

    await waitFor(() => {
      expect(uploadMock).toHaveBeenCalled();
      expect(insertMock).toHaveBeenCalled();
      expect(screen.getByText(/photo uploaded successfully/i)).toBeInTheDocument();
    });
  });
});
