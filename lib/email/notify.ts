// Best-effort email notification for new demo requests, via Resend.
//
// Turns ON automatically once these env vars are set (server-side only):
//   RESEND_API_KEY     — your Resend API key
//   DEMO_NOTIFY_EMAIL  — where lead alerts are sent (your inbox)
//   DEMO_FROM_EMAIL    — optional verified sender; defaults to Resend's test
//                        sender (onboarding@resend.dev, which only delivers to
//                        the Resend account owner until you verify a domain)
//
// If the vars are missing, this is a no-op — the request is still saved to the
// in-app admin inbox, so nothing is lost.

export interface DemoLead {
  name: string
  restaurant: string
  email: string
  message: string
}

// Generic transactional send (same Resend transport). Returns false when the
// transport isn't configured or the API rejects — callers surface that to the
// user instead of failing silently.
export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return false
  const from = process.env.DEMO_FROM_EMAIL || 'Stokly <onboarding@resend.dev>'
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function sendDemoEmail(lead: DemoLead): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const to = process.env.DEMO_NOTIFY_EMAIL
  if (!apiKey || !to) return // not configured → skip silently

  const from = process.env.DEMO_FROM_EMAIL || 'Stokly <onboarding@resend.dev>'

  const html = `
    <h2>Yeni demo sorğusu</h2>
    <p><strong>Ad:</strong> ${escapeHtml(lead.name)}</p>
    <p><strong>Restoran:</strong> ${escapeHtml(lead.restaurant || '—')}</p>
    <p><strong>E-poçt:</strong> ${escapeHtml(lead.email)}</p>
    <p><strong>Mesaj:</strong> ${escapeHtml(lead.message || '—')}</p>
  `

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: lead.email,
        subject: `Demo sorğusu — ${lead.restaurant || lead.name}`,
        html,
      }),
    })
  } catch {
    // Never let an email failure break the submission.
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
