import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { usePalette } from '../context/PaletteContext';

type UploadItem = {
  id: string;
  storage_path: string;
  label_raw?: string | null;
  label_slug?: string | null;
  filename?: string;
  original_filename?: string | null;
  uploader_name?: string | null;
  caption?: string | null;
  status?: string;
  created_at?: string;
};

type GuestbookEntry = {
  id: string;
  display_name: string | null;
  family_name: string | null;
  message: string;
  created_at: string;
  is_visible?: boolean;
};

type AdminStats = {
  pending_photos: number;
  pending_guestbook: number;
};

type WorkerResponse<T> = {
  data?: T;
  error?: string;
};

type RequestFailure = Error & {
  status?: number;
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
  const [stats, setStats] = useState<AdminStats>({ pending_photos: 0, pending_guestbook: 0 });
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [actionState, setActionState] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'client' | null>(null);

  const normalizedBaseUrl = useMemo(() => cleanBaseUrl(workerBaseUrl), [workerBaseUrl]);

  const withActionState = useCallback((key: string, active: boolean) => {
    setActionState((current) => ({ ...current, [key]: active }));
  }, []);

  const getSessionValue = useCallback((key: string): string => {
    if (typeof window === 'undefined') {
      return '';
    }

    return window.sessionStorage.getItem(key) || '';
  }, []);

  const setSessionValue = useCallback((key: string, value: string) => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(key, value);
    }
  }, []);

  const removeSessionValue = useCallback((key: string) => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(key);
    }
  }, []);

  const redirectLost = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.assign('/?lost=true');
    }
  }, []);

  const incrementFailures = useCallback(() => {
    const currentFails = Number(getSessionValue('adminFails') || 0);
    const nextFails = currentFails + 1;
    setSessionValue('adminFails', String(nextFails));
    if (nextFails >= 3) {
      redirectLost();
    }
    return nextFails;
  }, [getSessionValue, redirectLost, setSessionValue]);

  const resetFailures = useCallback(() => {
    setSessionValue('adminFails', '0');
  }, [setSessionValue]);

  const fetchJson = useCallback(async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const token = getSessionValue('adminToken');
    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'application/json');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${normalizedBaseUrl}${path}`, {
      ...init,
      headers,
    });

    const payload = (await response.json()) as WorkerResponse<T>;
    if (!response.ok || payload.error) {
      const err = new Error(payload.error || `Request failed (${response.status})`) as RequestFailure;
      err.status = response.status;
      throw err;
    }

    return payload.data as T;
  }, [getSessionValue, normalizedBaseUrl]);

  const refreshData = useCallback(async () => {
    setError('');
    setStatusMessage('');

    if (!normalizedBaseUrl) {
      setError('Set NEXT_PUBLIC_WORKER_BASE_URL (or enter URL below) to load moderation data.');
      return;
    }

    setLoading(true);
    try {
      const [uploadsData, guestbookData, statsData] = await Promise.all([
        fetchJson<UploadItem[]>('/photos/pending'),
        fetchJson<GuestbookEntry[]>('/guestbook/pending'),
        fetchJson<AdminStats>('/admin/stats'),
      ]);

      setUploads(Array.isArray(uploadsData) ? uploadsData : []);
      setGuestbookEntries(Array.isArray(guestbookData) ? guestbookData : []);
      setStats(statsData || { pending_photos: 0, pending_guestbook: 0 });
      setStatusMessage('Moderation data refreshed.');
    } catch (err) {
      const requestError = err as RequestFailure;
      if (requestError?.status === 401 || requestError?.status === 403) {
        setShowAuthModal(true);
        setAuthError('');
        setError('');
        setStatusMessage('');
      } else {
        const message = err instanceof Error ? err.message : 'Failed to load admin data.';
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchJson, normalizedBaseUrl]);

  const approvePhoto = useCallback(async (id: string) => {
    const actionKey = `approve:${id}`;
    withActionState(actionKey, true);
    setError('');
    setStatusMessage('');
    try {
      await fetchJson('/photos/approve', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });

      setUploads((current) => current.filter((item) => item.id !== id));
      setStats((current) => ({ ...current, pending_photos: Math.max(0, current.pending_photos - 1) }));
      setStatusMessage('Photo approved.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Approve failed.';
      setError(message);
    } finally {
      withActionState(actionKey, false);
    }
  }, [fetchJson, withActionState]);

  const rejectPhoto = useCallback(async (id: string) => {
    const actionKey = `reject:${id}`;
    withActionState(actionKey, true);
    setError('');
    setStatusMessage('');
    try {
      await fetchJson('/photos/reject', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });

      setUploads((current) => current.filter((item) => item.id !== id));
      setStats((current) => ({ ...current, pending_photos: Math.max(0, current.pending_photos - 1) }));
      setStatusMessage('Photo rejected.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed.';
      setError(message);
    } finally {
      withActionState(actionKey, false);
    }
  }, [fetchJson, withActionState]);

  const handleAuthSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError('');

    const candidate = authPassword.trim();
    if (!candidate) {
      setAuthError('Please enter your admin password.');
      return;
    }

    setAuthLoading(true);
    setSessionValue('adminToken', candidate);

    try {
      await fetchJson<AdminStats>('/admin/stats');

      // Determine role so the UI can hide admin-only actions
      try {
        const roleRes = await fetchJson<{ role: string }>('/auth/role');
        setUserRole(roleRes.role === 'admin' ? 'admin' : 'client');
      } catch {
        setUserRole('client');
      }

      resetFailures();
      setShowAuthModal(false);
      setAuthPassword('');
      setAuthError('');
      await refreshData();
    } catch (err) {
      const requestError = err as RequestFailure;
      if (requestError?.status === 401 || requestError?.status === 403) {
        removeSessionValue('adminToken');
        const fails = incrementFailures();
        if (fails < 3) {
          setAuthError('Incorrect password. Please try again.');
        }
      } else {
        const message = err instanceof Error ? err.message : 'Authentication failed.';
        setAuthError(message);
      }
    } finally {
      setAuthLoading(false);
    }
  }, [authPassword, fetchJson, incrementFailures, refreshData, removeSessionValue, resetFailures, setSessionValue]);

  useEffect(() => {
    if (!normalizedBaseUrl) {
      return;
    }

    void refreshData();
  }, [normalizedBaseUrl, refreshData]);

  const approveGuestbook = useCallback(async (id: string) => {
    const actionKey = `guestbook-approve:${id}`;
    withActionState(actionKey, true);
    setError('');
    setStatusMessage('');
    try {
      await fetchJson('/guestbook/approve', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });

      setGuestbookEntries((current) => current.filter((entry) => entry.id !== id));
      setStats((current) => ({ ...current, pending_guestbook: Math.max(0, current.pending_guestbook - 1) }));
      setStatusMessage('Guestbook entry approved.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Guestbook approve failed.';
      setError(message);
    } finally {
      withActionState(actionKey, false);
    }
  }, [fetchJson, withActionState]);

  const deleteGuestbook = useCallback(async (id: string) => {
    const actionKey = `guestbook-delete:${id}`;
    withActionState(actionKey, true);
    setError('');
    setStatusMessage('');
    try {
      await fetchJson('/guestbook/delete', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });

      setGuestbookEntries((current) => current.filter((entry) => entry.id !== id));
      setStats((current) => ({ ...current, pending_guestbook: Math.max(0, current.pending_guestbook - 1) }));
      setStatusMessage('Guestbook entry deleted.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Guestbook delete failed.';
      setError(message);
    } finally {
      withActionState(actionKey, false);
    }
  }, [fetchJson, withActionState]);

  return (
    <div className="page-container">
      <main className="main-content">
        <section
          className={`section-full admin-page-container ${showAuthModal ? 'admin-locked' : ''}`}
          style={{
            color: palette.text,
            borderColor: palette.primary,
          }}
          aria-hidden={showAuthModal}
        >
          <h1 className="page-title admin-title" style={{ color: palette.primary }}>
            Admin Moderation
          </h1>

          <p className="admin-status">
            Pending photos: {stats.pending_photos} · Pending guestbook: {stats.pending_guestbook}
          </p>

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
              <h2 style={{ color: palette.primary }}>Pending Photos ({uploads.length})</h2>
              {uploads.length === 0 ? (
                <p className="admin-empty">No pending photos.</p>
              ) : (
                <ul className="admin-list">
                  {uploads.map((item) => {
                    const approveKey = `approve:${item.id}`;
                    const rejectKey = `reject:${item.id}`;
                    const title = item.label_raw || item.original_filename || item.filename || item.storage_path;
                    return (
                      <li key={item.id} className="admin-list-item">
                        <div className="admin-item-meta">
                          <strong>{title}</strong>
                          {item.label_slug && <span>Slug: {item.label_slug}</span>}
                          {item.uploader_name && <span>By: {item.uploader_name}</span>}
                          {item.caption && <span>{item.caption}</span>}
                          <span>Created: {formatDate(item.created_at)}</span>
                        </div>
                        <div className="admin-actions">
                          <button
                            className="admin-inline-button"
                            onClick={() => approvePhoto(item.id)}
                            disabled={Boolean(actionState[approveKey] || actionState[rejectKey])}
                            style={{ backgroundColor: palette.primary }}
                          >
                            Approve
                          </button>
                          <button
                            className="admin-inline-button admin-delete"
                            onClick={() => rejectPhoto(item.id)}
                            disabled={Boolean(actionState[approveKey] || actionState[rejectKey])}
                          >
                            Reject
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="admin-panel" style={{ borderColor: palette.primary }}>
              <h2 style={{ color: palette.primary }}>Pending Guestbook Entries ({guestbookEntries.length})</h2>
              {guestbookEntries.length === 0 ? (
                <p className="admin-empty">No pending guestbook entries.</p>
              ) : (
                <ul className="admin-list">
                  {guestbookEntries.map((entry) => (
                    <li key={entry.id} className="admin-list-item">
                      <div className="admin-item-meta">
                        <strong>{entry.display_name || 'Guest'} {entry.family_name ? `(${entry.family_name})` : ''}</strong>
                        <span>{entry.message}</span>
                        <span>Created: {formatDate(entry.created_at)}</span>
                      </div>
                      <div className="admin-actions">
                        <button
                          className="admin-inline-button"
                          onClick={() => approveGuestbook(entry.id)}
                          disabled={Boolean(actionState[`guestbook-approve:${entry.id}`] || actionState[`guestbook-delete:${entry.id}`])}
                          style={{ backgroundColor: palette.primary }}
                        >
                          Approve
                        </button>
                        {userRole === 'admin' && (
                          <button
                            className="admin-inline-button admin-delete"
                            onClick={() => deleteGuestbook(entry.id)}
                            disabled={Boolean(actionState[`guestbook-approve:${entry.id}`] || actionState[`guestbook-delete:${entry.id}`])}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        {showAuthModal && (
          <div className="admin-auth-overlay" role="dialog" aria-modal="true" aria-labelledby="admin-auth-title">
            <div className="admin-auth-card">
              <h2 id="admin-auth-title">Auto-login failed</h2>
              <p>Enter your admin password to continue.</p>

              <form onSubmit={handleAuthSubmit} className="admin-auth-form">
                <input
                  type="password"
                  className="admin-url-input"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Admin password"
                  autoFocus
                />
                <button
                  className="admin-button"
                  type="submit"
                  disabled={authLoading}
                  style={{ backgroundColor: palette.primary }}
                >
                  {authLoading ? 'Checking…' : 'Unlock Admin'}
                </button>
              </form>

              {authError && <p className="admin-error">{authError}</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
