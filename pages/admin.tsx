import { useCallback, useMemo, useState } from 'react';
import { usePalette } from '../context/PaletteContext';
import '../styles/pages/admin.css';

type UploadItem = {
  id?: string;
  name: string;
  created_at?: string;
  updated_at?: string;
  metadata?: { size?: number };
};

type GuestbookEntry = {
  id: string;
  display_name: string | null;
  family_name: string | null;
  message: string;
  created_at: string;
  is_visible?: boolean;
};

type WorkerResponse<T> = {
  data?: T;
  error?: string;
};

function cleanBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function formatDate(value?: string): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
}

export default function AdminPage() {
  const { palette } = usePalette();
  const [workerBaseUrl, setWorkerBaseUrl] = useState(process.env.NEXT_PUBLIC_WORKER_BASE_URL || '');
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [guestbookEntries, setGuestbookEntries] = useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionState, setActionState] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const normalizedBaseUrl = useMemo(() => cleanBaseUrl(workerBaseUrl), [workerBaseUrl]);

  const withActionState = useCallback((key: string, active: boolean) => {
    setActionState((current) => ({ ...current, [key]: active }));
  }, []);

  const fetchJson = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${normalizedBaseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });

    const payload = (await response.json()) as WorkerResponse<T>;
    if (!response.ok || payload.error) {
      throw new Error(payload.error || `Request failed (${response.status})`);
    }

    return payload.data as T;
  }, [normalizedBaseUrl]);

  const refreshData = useCallback(async () => {
    setError('');
    setStatusMessage('');

    if (!normalizedBaseUrl) {
      setError('Set NEXT_PUBLIC_WORKER_BASE_URL (or enter URL below) to load moderation data.');
      return;
    }

    setLoading(true);
    try {
      const [uploadsData, guestbookData] = await Promise.all([
        fetchJson<UploadItem[]>('/list-uploads'),
        fetchJson<GuestbookEntry[]>('/guestbook'),
      ]);

      setUploads(Array.isArray(uploadsData) ? uploadsData.filter((item) => item.name) : []);
      setGuestbookEntries(Array.isArray(guestbookData) ? guestbookData : []);
      setStatusMessage('Moderation data refreshed.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load admin data.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [fetchJson, normalizedBaseUrl]);

  const approvePhoto = useCallback(async (filename: string) => {
    const actionKey = `approve:${filename}`;
    withActionState(actionKey, true);
    setError('');
    setStatusMessage('');
    try {
      await fetchJson('/approve', {
        method: 'POST',
        body: JSON.stringify({ filename }),
      });

      setUploads((current) => current.filter((item) => item.name !== filename));
      setStatusMessage(`Approved ${filename}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Approve failed.';
      setError(message);
    } finally {
      withActionState(actionKey, false);
    }
  }, [fetchJson, withActionState]);

  const deletePhoto = useCallback(async (filename: string) => {
    const actionKey = `delete:${filename}`;
    withActionState(actionKey, true);
    setError('');
    setStatusMessage('');
    try {
      await fetchJson('/delete', {
        method: 'POST',
        body: JSON.stringify({ filename }),
      });

      setUploads((current) => current.filter((item) => item.name !== filename));
      setStatusMessage(`Deleted ${filename}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed.';
      setError(message);
    } finally {
      withActionState(actionKey, false);
    }
  }, [fetchJson, withActionState]);

  return (
    <div className="page-container">
      <main className="main-content">
        <section
          className="section-full admin-page-container"
          style={{
            color: palette.text,
            borderColor: palette.primary,
          }}
        >
          <h1 className="page-title admin-title" style={{ color: palette.primary }}>
            Admin Moderation
          </h1>

          <div className="admin-url-row">
            <input
              type="url"
              className="admin-url-input"
              value={workerBaseUrl}
              onChange={(e) => setWorkerBaseUrl(e.target.value)}
              placeholder="https://your-worker.workers.dev"
              style={{ color: palette.text, borderColor: palette.primary }}
            />
            <button
              className="admin-button"
              onClick={refreshData}
              disabled={loading}
              style={{ backgroundColor: palette.primary }}
            >
              {loading ? 'Loading…' : 'Load'}
            </button>
          </div>

          {error && <p className="admin-error">{error}</p>}
          {statusMessage && <p className="admin-status">{statusMessage}</p>}

          <div className="admin-grid">
            <div className="admin-panel" style={{ borderColor: palette.primary }}>
              <h2 style={{ color: palette.primary }}>Pending Uploads ({uploads.length})</h2>
              {uploads.length === 0 ? (
                <p className="admin-empty">No pending uploads.</p>
              ) : (
                <ul className="admin-list">
                  {uploads.map((item) => {
                    const approveKey = `approve:${item.name}`;
                    const deleteKey = `delete:${item.name}`;
                    return (
                      <li key={item.id || item.name} className="admin-list-item">
                        <div className="admin-item-meta">
                          <strong>{item.name}</strong>
                          <span>Created: {formatDate(item.created_at)}</span>
                        </div>
                        <div className="admin-actions">
                          <button
                            className="admin-inline-button"
                            onClick={() => approvePhoto(item.name)}
                            disabled={Boolean(actionState[approveKey] || actionState[deleteKey])}
                            style={{ backgroundColor: palette.primary }}
                          >
                            Approve
                          </button>
                          <button
                            className="admin-inline-button admin-delete"
                            onClick={() => deletePhoto(item.name)}
                            disabled={Boolean(actionState[approveKey] || actionState[deleteKey])}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="admin-panel" style={{ borderColor: palette.primary }}>
              <h2 style={{ color: palette.primary }}>Guestbook Entries ({guestbookEntries.length})</h2>
              {guestbookEntries.length === 0 ? (
                <p className="admin-empty">No guestbook entries.</p>
              ) : (
                <ul className="admin-list">
                  {guestbookEntries.map((entry) => (
                    <li key={entry.id} className="admin-list-item">
                      <div className="admin-item-meta">
                        <strong>{entry.display_name || 'Guest'} {entry.family_name ? `(${entry.family_name})` : ''}</strong>
                        <span>{entry.message}</span>
                        <span>Created: {formatDate(entry.created_at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
