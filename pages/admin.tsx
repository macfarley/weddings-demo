// pages/admin.tsx — Photo and guestbook moderation dashboard.
//
// Auth model: password is stored in sessionStorage after first successful
// verification against the Worker's /admin/stats endpoint. The token is sent
// as a Bearer header on every request. On 3 failed attempts the session is
// invalidated and the user is redirected to /?lost=true.
//
// Two auth tiers:
//   Admin   — full access including purge/hard-delete (ADMIN_PASSWORD)
//   Client  — approve/trash only; purge buttons hidden (CLIENT_PASSWORD)
// The Worker's GET /auth/role endpoint identifies which tier is active.
//
// Data is loaded via GET /guestbook (all entries, auth-gated) and the
// /photos/* family. All five parallel requests in refreshData() must succeed
// or the UI shows an error — a 404 on any one route means the deployed Worker
// is older than the source. Run `cd worker && npx wrangler deploy` to sync.
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
  image_url?: string | null;
};

type GuestbookEntry = {
  id: string;
  display_name: string | null;
  family_name: string | null;
  message: string;
  created_at: string;
  is_visible: boolean;
  side?: string | null;
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
  const [pendingPhotos, setPendingPhotos] = useState<UploadItem[]>([]);
  const [approvedPhotos, setApprovedPhotos] = useState<UploadItem[]>([]);
  const [trashPhotos, setTrashPhotos] = useState<UploadItem[]>([]);
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
  // confirmId encodes both action and item: e.g. "trash-photo:uuid" or "purge-photo:uuid"
  const [confirmId, setConfirmId] = useState<string | null>(null);

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
      const [pendingData, approvedData, trashData, guestbookData, statsData] = await Promise.all([
        fetchJson<UploadItem[]>('/photos/pending'),
        fetchJson<{ data: UploadItem[]; total: number }>('/photos/approved?per_page=100').then((r) => r.data ?? []),
        fetchJson<UploadItem[]>('/photos/trash'),
        fetchJson<GuestbookEntry[]>('/guestbook'),
        fetchJson<AdminStats>('/admin/stats'),
      ]);

      setPendingPhotos(Array.isArray(pendingData) ? pendingData : []);
      setApprovedPhotos(Array.isArray(approvedData) ? approvedData : []);
      setTrashPhotos(Array.isArray(trashData) ? trashData : []);
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

      setPendingPhotos((current) => current.filter((item) => item.id !== id));
      setStats((current) => ({ ...current, pending_photos: Math.max(0, current.pending_photos - 1) }));
      setStatusMessage('Photo approved.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Approve failed.';
      setError(message);
    } finally {
      withActionState(actionKey, false);
    }
  }, [fetchJson, withActionState]);

  const trashPhoto = useCallback(async (id: string) => {
    const actionKey = `trash:${id}`;
    withActionState(actionKey, true);
    setError('');
    setStatusMessage('');
    setConfirmId(null);
    try {
      await fetchJson('/photos/reject', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });

      setPendingPhotos((current) => current.filter((item) => item.id !== id));
      setApprovedPhotos((current) => current.filter((item) => item.id !== id));
      setStats((current) => ({ ...current, pending_photos: Math.max(0, current.pending_photos - 1) }));
      setStatusMessage('Photo moved to trash.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Trash failed.';
      setError(message);
    } finally {
      withActionState(actionKey, false);
    }
  }, [fetchJson, withActionState]);

  const purgePhoto = useCallback(async (id: string) => {
    const actionKey = `purge:${id}`;
    withActionState(actionKey, true);
    setError('');
    setStatusMessage('');
    setConfirmId(null);
    try {
      await fetchJson('/photos/purge', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });

      setTrashPhotos((current) => current.filter((item) => item.id !== id));
      setStatusMessage('Photo permanently deleted.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Purge failed.';
      setError(message);
    } finally {
      withActionState(actionKey, false);
    }
  }, [fetchJson, withActionState]);

  const trashGuestbook = useCallback(async (id: string) => {
    const actionKey = `gb-trash:${id}`;
    withActionState(actionKey, true);
    setError('');
    setStatusMessage('');
    setConfirmId(null);
    try {
      await fetchJson('/guestbook/trash', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });

      setGuestbookEntries((current) =>
        current.map((e) => (e.id === id ? { ...e, is_visible: false } : e)),
      );
      setStatusMessage('Guestbook entry hidden.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Trash failed.';
      setError(message);
    } finally {
      withActionState(actionKey, false);
    }
  }, [fetchJson, withActionState]);

  const purgeGuestbook = useCallback(async (id: string) => {
    const actionKey = `gb-purge:${id}`;
    withActionState(actionKey, true);
    setError('');
    setStatusMessage('');
    setConfirmId(null);
    try {
      await fetchJson('/guestbook/delete', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });

      setGuestbookEntries((current) => current.filter((e) => e.id !== id));
      setStatusMessage('Guestbook entry permanently deleted.');
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

  // ── Inline confirm helpers ─────────────────────────────────────────────────
  const requestConfirm = (key: string) => setConfirmId(key);
  const cancelConfirm = () => setConfirmId(null);

  // ── Photo card ────────────────────────────────────────────────────────────
  function PhotoCard({
    item,
    showApprove = false,
    trashActionKey,
    purgeActionKey,
  }: {
    item: UploadItem;
    showApprove?: boolean;
    trashActionKey?: string;
    purgeActionKey?: string;
  }) {
    const title = item.label_raw || item.original_filename || item.filename || item.storage_path;
    const trashConfirm = trashActionKey ? `${trashActionKey}:${item.id}` : null;
    const purgeConfirm = purgeActionKey ? `${purgeActionKey}:${item.id}` : null;
    const busy = Boolean(
      actionState[`approve:${item.id}`] ||
      actionState[`trash:${item.id}`] ||
      actionState[`purge:${item.id}`],
    );
    return (
      <li className="admin-list-item">
        {item.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={title} className="admin-card-thumb" />
        )}
        <div className="admin-item-meta">
          <strong>{title}</strong>
          {item.uploader_name && <span>By: {item.uploader_name}</span>}
          {item.caption && <span>{item.caption}</span>}
          <span>{formatDate(item.created_at)}</span>
        </div>
        <div className="admin-card-actions">
          {showApprove && (
            <button
              className="admin-inline-button"
              onClick={() => approvePhoto(item.id)}
              disabled={busy}
              style={{ backgroundColor: palette.primary }}
            >
              ✓ Approve
            </button>
          )}
          {trashConfirm && (
            confirmId === trashConfirm ? (
              <span className="admin-confirm-row">
                <span className="admin-confirm-label">Are you sure?</span>
                <button className="admin-inline-button admin-delete" onClick={() => trashPhoto(item.id)} disabled={busy}>Yes, trash it</button>
                <button className="admin-inline-button admin-cancel" onClick={cancelConfirm}>Cancel</button>
              </span>
            ) : (
              <button className="admin-x-button" aria-label="Move to trash" onClick={() => requestConfirm(trashConfirm)} disabled={busy}>✕</button>
            )
          )}
          {purgeConfirm && userRole === 'admin' && (
            confirmId === purgeConfirm ? (
              <span className="admin-confirm-row">
                <span className="admin-confirm-label">Permanently delete?</span>
                <button className="admin-inline-button admin-delete" onClick={() => purgePhoto(item.id)} disabled={busy}>Yes, purge</button>
                <button className="admin-inline-button admin-cancel" onClick={cancelConfirm}>Cancel</button>
              </span>
            ) : (
              <button className="admin-x-button" aria-label="Permanently delete" onClick={() => requestConfirm(purgeConfirm)} disabled={busy}>✕</button>
            )
          )}
        </div>
      </li>
    );
  }

  // ── Guestbook card ────────────────────────────────────────────────────────
  function GuestbookCard({ entry }: { entry: GuestbookEntry }) {
    const trashConfirm = `gb-trash:${entry.id}`;
    const purgeConfirm = `gb-purge:${entry.id}`;
    const busy = Boolean(actionState[`gb-trash:${entry.id}`] || actionState[`gb-purge:${entry.id}`]);
    return (
      <li className={`admin-list-item ${entry.is_visible ? '' : 'admin-item-hidden'}`}>
        <div className="admin-item-meta">
          <strong>
            {entry.display_name || 'Guest'}{entry.family_name ? ` (${entry.family_name})` : ''}
            {entry.side && <span className="admin-side-badge"> · {entry.side}</span>}
            {!entry.is_visible && <span className="admin-hidden-badge"> · hidden</span>}
          </strong>
          <span className="admin-message-text">{entry.message}</span>
          <span>{formatDate(entry.created_at)}</span>
        </div>
        <div className="admin-card-actions">
          {entry.is_visible ? (
            confirmId === trashConfirm ? (
              <span className="admin-confirm-row">
                <span className="admin-confirm-label">Are you sure?</span>
                <button className="admin-inline-button admin-delete" onClick={() => trashGuestbook(entry.id)} disabled={busy}>Yes, hide it</button>
                <button className="admin-inline-button admin-cancel" onClick={cancelConfirm}>Cancel</button>
              </span>
            ) : (
              <button className="admin-x-button" aria-label="Hide entry" onClick={() => requestConfirm(trashConfirm)} disabled={busy}>✕</button>
            )
          ) : (
            userRole === 'admin' && (
              confirmId === purgeConfirm ? (
                <span className="admin-confirm-row">
                  <span className="admin-confirm-label">Permanently delete?</span>
                  <button className="admin-inline-button admin-delete" onClick={() => purgeGuestbook(entry.id)} disabled={busy}>Yes, delete</button>
                  <button className="admin-inline-button admin-cancel" onClick={cancelConfirm}>Cancel</button>
                </span>
              ) : (
                <button className="admin-x-button" aria-label="Permanently delete" onClick={() => requestConfirm(purgeConfirm)} disabled={busy}>✕</button>
              )
            )
          )}
        </div>
      </li>
    );
  }

  return (
    <div className="page-container">
      <main className="main-content">
        <section
          className={`section-full admin-page-container ${showAuthModal ? 'admin-locked' : ''}`}
          style={{ color: palette.text, borderColor: palette.primary }}
          aria-hidden={showAuthModal}
        >
          <h1 className="page-title admin-title" style={{ color: palette.primary }}>
            Admin Moderation
          </h1>

          <p className="admin-status">
            Pending: {stats.pending_photos} · Approved: {approvedPhotos.length} · Trash: {trashPhotos.length} · Guestbook: {guestbookEntries.length}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <a
              href="/qrcodeflyer"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '0.45rem 1.1rem',
                borderRadius: '2rem',
                border: `2px solid ${palette.primary}`,
                color: palette.primary,
                fontWeight: 'bold',
                textDecoration: 'none',
                fontSize: '0.875rem',
              }}
            >
              🖨️ Venue Flyer (PDF)
            </a>
          </div>

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
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {error && <p className="admin-error">{error}</p>}
          {statusMessage && <p className="admin-status">{statusMessage}</p>}

          <div className="admin-grid">

            {/* ── Approved Gallery ───────────────────────────────────────── */}
            <div className="admin-panel admin-panel-full" style={{ borderColor: palette.primary }}>
              <h2 style={{ color: palette.primary }}>✓ Gallery — Approved ({approvedPhotos.length})</h2>
              {approvedPhotos.length === 0 ? (
                <p className="admin-empty">No approved photos yet.</p>
              ) : (
                <ul className="admin-list admin-list-grid">
                  {approvedPhotos.map((item) => (
                    <PhotoCard key={item.id} item={item} trashActionKey="trash" />
                  ))}
                </ul>
              )}
            </div>

            {/* ── Pending ────────────────────────────────────────────────── */}
            <div className="admin-panel" style={{ borderColor: palette.primary }}>
              <h2 style={{ color: palette.primary }}>⏳ Pending — Unclassified ({pendingPhotos.length})</h2>
              {pendingPhotos.length === 0 ? (
                <p className="admin-empty">No pending photos.</p>
              ) : (
                <ul className="admin-list">
                  {pendingPhotos.map((item) => (
                    <PhotoCard key={item.id} item={item} showApprove trashActionKey="trash" />
                  ))}
                </ul>
              )}
            </div>

            {/* ── Trash ──────────────────────────────────────────────────── */}
            <div className="admin-panel admin-panel-nsfw">
              <h2 className="admin-nsfw-heading">🗑 Trash — Auto-flagged &amp; Rejected ({trashPhotos.length})</h2>
              {trashPhotos.length === 0 ? (
                <p className="admin-empty">Trash is empty.</p>
              ) : (
                <ul className="admin-list">
                  {trashPhotos.map((item) => (
                    <PhotoCard key={item.id} item={item} purgeActionKey="purge" />
                  ))}
                </ul>
              )}
              {userRole !== 'admin' && trashPhotos.length > 0 && (
                <p className="admin-empty" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                  Permanent deletion requires full admin access.
                </p>
              )}
            </div>

            {/* ── Guestbook ──────────────────────────────────────────────── */}
            <div className="admin-panel admin-panel-full" style={{ borderColor: palette.primary }}>
              <h2 style={{ color: palette.primary }}>💬 All Guestbook Entries ({guestbookEntries.length})</h2>
              {guestbookEntries.length === 0 ? (
                <p className="admin-empty">No guestbook entries yet.</p>
              ) : (
                <ul className="admin-list admin-list-guestbook">
                  {guestbookEntries.map((entry) => (
                    <GuestbookCard key={entry.id} entry={entry} />
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
