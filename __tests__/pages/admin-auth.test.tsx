import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminPage from '../../pages/admin';

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

describe('Admin auth modal flow', () => {
  const originalEnv = process.env.NEXT_PUBLIC_WORKER_BASE_URL;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_WORKER_BASE_URL = 'https://worker.example.workers.dev';
    sessionStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    } as Response);

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_WORKER_BASE_URL = originalEnv;
  });

  it('shows modal on auth failure and redirects after 3 failed attempts', async () => {
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText(/auto-login failed/i)).toBeInTheDocument();
    });

    const passwordInput = screen.getByPlaceholderText(/admin password/i);
    const unlockButton = screen.getByRole('button', { name: /unlock admin/i });

    for (let attempt = 1; attempt <= 3; attempt++) {
      fireEvent.change(passwordInput, { target: { value: 'wrong-password' } });
      fireEvent.click(unlockButton);

      await waitFor(() => {
        expect(sessionStorage.getItem('adminFails')).toBe(String(attempt));
      });
    }

    expect(sessionStorage.getItem('adminFails')).toBe('3');
  });
});
