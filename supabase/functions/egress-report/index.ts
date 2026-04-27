// Supabase Edge Function: egress-report
// Invoked by the Cloudflare Worker weekly cron (Sunday 10:00 UTC) OR manually via:
//   curl -X POST https://<project>.supabase.co/functions/v1/egress-report \
//     -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
//
// Required secrets (set via `supabase secrets set`):
//   SLACK_WEBHOOK_URL  — Slack incoming webhook URL (optional)
//   RESEND_API_KEY     — Resend API key (optional, used if Slack not set)
//   RESEND_TO          — Recipient email address for Resend delivery
//   RESEND_FROM        — Sender email address for Resend delivery
//
// The function queries your project's own tables; it does NOT require
// Supabase platform-level dashboard API access.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BUCKET = 'wedding-photos';

Deno.serve(async (req: Request) => {
  // Require POST or GET; reject other methods.
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Auth: require the service role key via Authorization header.
  const authHeader = req.headers.get('Authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dayAgo  = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // -------------------------------------------------------------------------
  // Query application data
  // -------------------------------------------------------------------------
  const [
    allPhotos,
    weeklyPhotos,
    dailyPhotos,
    pendingPhotos,
    weeklyGuestbook,
    storageList,
  ] = await Promise.all([
    supabase.from('photos').select('id', { count: 'exact', head: true }),
    supabase.from('photos').select('status, uploader_name, created_at').gte('created_at', weekAgo),
    supabase.from('photos').select('id', { count: 'exact', head: true }).gte('created_at', dayAgo),
    supabase.from('photos').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('guestbook_entries').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabase.storage.from(BUCKET).list('approved', {
      limit: 1000,
      sortBy: { column: 'created_at', order: 'desc' },
    }),
  ]);

  const weekPhotos = weeklyPhotos.data ?? [];
  const approved  = weekPhotos.filter((p) => p.status === 'approved').length;
  const pending   = weekPhotos.filter((p) => p.status === 'pending').length;
  const rejected  = weekPhotos.filter((p) => p.status === 'rejected').length;

  // Upload frequency per uploader — flag anomalies.
  const uploaderCounts: Record<string, number> = {};
  for (const p of weekPhotos) {
    const name = p.uploader_name ?? 'unknown';
    uploaderCounts[name] = (uploaderCounts[name] ?? 0) + 1;
  }
  const topUploaders = Object.entries(uploaderCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
  const suspicious = topUploaders.filter((u) => u.count > 20);

  // Estimate storage usage from object list.
  const storageObjects = storageList.data ?? [];
  // Supabase storage list returns metadata including size in object.metadata.size
  const totalStorageBytes = storageObjects.reduce((sum, obj) => {
    const size = (obj as { metadata?: { size?: number } }).metadata?.size ?? 0;
    return sum + size;
  }, 0);
  const totalStorageMB = (totalStorageBytes / (1024 * 1024)).toFixed(1);

  // -------------------------------------------------------------------------
  // Build report payload
  // -------------------------------------------------------------------------
  const report = {
    generated_at: new Date().toUTCString(),
    period: 'last 7 days',
    photos: {
      total_all_time:     allPhotos.count ?? 0,
      this_week:          weekPhotos.length,
      last_24h:           dailyPhotos.count ?? 0,
      approved,
      pending,
      rejected,
      currently_in_review: pendingPhotos.count ?? 0,
    },
    guestbook: {
      new_entries_this_week: weeklyGuestbook.count ?? 0,
    },
    storage: {
      approved_object_count: storageObjects.length,
      estimated_approved_mb: totalStorageMB,
    },
    top_uploaders: topUploaders,
    suspicious_uploaders: suspicious,
    alerts: suspicious.length > 0
      ? [`⚠️ ${suspicious.length} uploader(s) submitted > 20 photos this week`]
      : [],
  };

  // -------------------------------------------------------------------------
  // Deliver notification
  // -------------------------------------------------------------------------
  const slackUrl  = Deno.env.get('SLACK_WEBHOOK_URL');
  const resendKey = Deno.env.get('RESEND_API_KEY');

  if (slackUrl) {
    await sendSlack(slackUrl, report);
  } else if (resendKey) {
    await sendResend(resendKey, report);
  }

  return new Response(JSON.stringify(report), {
    headers: { 'Content-Type': 'application/json' },
  });
});

// ---------------------------------------------------------------------------
// Slack delivery
// ---------------------------------------------------------------------------
async function sendSlack(webhookUrl: string, report: ReturnType<typeof buildSlackText>['report']): Promise<void> {
  const text = buildSlackText(report);
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}

// deno-lint-ignore no-explicit-any
function buildSlackText(report: any): string {
  const { photos, guestbook, storage, top_uploaders, suspicious_uploaders } = report;
  const lines = [
    '*📸 Weekly Wedding Site Report*',
    '',
    `*Photos this week:* ${photos.this_week}  (✅ approved: ${photos.approved} | ⏳ pending: ${photos.pending} | 🗑 rejected: ${photos.rejected})`,
    `*Photos last 24h:* ${photos.last_24h} | *Currently in review:* ${photos.currently_in_review}`,
    `*Total photos:* ${photos.total_all_time}`,
    `*New guestbook entries:* ${guestbook.new_entries_this_week}`,
    `*Approved storage:* ~${storage.estimated_approved_mb} MB (${storage.approved_object_count} objects)`,
  ];

  if (top_uploaders?.length > 0) {
    lines.push('', '*Top uploaders this week:*');
    for (const u of top_uploaders.slice(0, 5)) lines.push(`  • ${u.name}: ${u.count} photos`);
  }

  if (suspicious_uploaders?.length > 0) {
    lines.push('', `*⚠️ Suspicious activity:* ${suspicious_uploaders.length} uploader(s) submitted > 20 photos`);
    for (const u of suspicious_uploaders) lines.push(`  • ${u.name}: ${u.count} photos — review recommended`);
  }

  lines.push('', `_Generated: ${report.generated_at}_`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Resend (email) delivery — fallback when Slack is not configured
// ---------------------------------------------------------------------------
// deno-lint-ignore no-explicit-any
async function sendResend(apiKey: string, report: any): Promise<void> {
  const to   = Deno.env.get('RESEND_TO');
  const from = Deno.env.get('RESEND_FROM') ?? 'reports@noreply.example.com';
  if (!to) return;

  const { photos, guestbook, storage, suspicious_uploaders } = report;
  const html = `
<h2>📸 Weekly Wedding Site Report</h2>
<p><strong>Period:</strong> last 7 days &nbsp;|&nbsp; <strong>Generated:</strong> ${report.generated_at}</p>
<h3>Photos</h3>
<ul>
  <li>Total all-time: ${photos.total_all_time}</li>
  <li>This week: ${photos.this_week} (approved: ${photos.approved}, pending: ${photos.pending}, rejected: ${photos.rejected})</li>
  <li>Last 24h: ${photos.last_24h}</li>
  <li>Currently in review: ${photos.currently_in_review}</li>
</ul>
<h3>Guestbook</h3>
<p>New entries this week: ${guestbook.new_entries_this_week}</p>
<h3>Storage</h3>
<p>Approved objects: ${storage.approved_object_count} (~${storage.estimated_approved_mb} MB estimated)</p>
${suspicious_uploaders?.length > 0
  ? `<h3>⚠️ Suspicious Activity</h3><p>${suspicious_uploaders.length} uploader(s) submitted &gt; 20 photos this week. Review the admin panel.</p>`
  : ''}
`.trim();

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Weekly Wedding Site Report — ${new Date().toDateString()}`,
      html,
    }),
  });
}
