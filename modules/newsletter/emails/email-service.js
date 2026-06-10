/* ════════════════════════════════════════════════════════
   NAGRIVA — Email Automation Service (Preparation)
   Architecture ready for:
     - Welcome Emails
     - Weekly Newsletter Campaigns
     - Broadcast Emails
     - Subscriber Management
     - Unsubscribe Functionality
   ════════════════════════════════════════════════════════
   NOTE: This is a preparation structure.
   External email providers (Resend, SendGrid, etc.) are
   NOT connected yet. Connect by implementing the `send`
   function below.
   ════════════════════════════════════════════════════════ */

const NAGRIVA_EmailService = (() => {
  /* ─── Configuration ─── */
  const CONFIG = {
    fromName: 'Nagriva',
    fromEmail: 'newsletter@nagriva.com',
    replyTo: 'hello@nagriva.com',
    /* Set to true once an email provider is connected */
    enabled: false,
    /* Provider: 'resend', 'sendgrid', 'ses', etc. */
    provider: null,
    /* Provider API key (set via env or admin settings) */
    apiKey: null,
    /* Base URL for tracking pixels / links */
    baseUrl: 'https://nagriva.com'
  };

  /* ─── Welcome Email Template ─── */
  function getWelcomeEmail(subscriberEmail) {
    return {
      to: subscriberEmail,
      subject: 'Welcome to the Nagriva Newsletter!',
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Nagriva</title>
</head>
<body style="margin:0;padding:0;background:#040404;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#040404;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#0b0f0f;border:1px solid rgba(255,255,255,0.06);border-radius:16px;">
          <tr>
            <td style="padding:40px 32px;">
              <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:#ffffff;margin:0 0 8px;">Welcome to Nagriva</h1>
              <p style="font-size:15px;color:#a1a1aa;line-height:1.6;margin:0 0 24px;">
                Hey there! You're now part of the Nagriva community. We're thrilled to have you on board.
              </p>
              <p style="font-size:15px;color:#a1a1aa;line-height:1.6;margin:0 0 24px;">
                Every week, you'll receive curated job opportunities, career insights, AI tools, productivity tips, and exclusive resources — all designed to help you grow.
              </p>
              <p style="font-size:15px;color:#a1a1aa;line-height:1.6;margin:0 0 24px;">
                Here's what you can expect:
              </p>
              <ul style="font-size:15px;color:#a1a1aa;line-height:1.7;margin:0 0 24px;padding-left:20px;">
                <li>Weekly job opportunities tailored to your interests</li>
                <li>Career growth advice from industry experts</li>
                <li>AI tools and resources to supercharge your workflow</li>
                <li>Exclusive content you won't find anywhere else</li>
              </ul>
              <p style="font-size:15px;color:#a1a1aa;line-height:1.6;margin:0 0 32px;">
                Stay tuned for our next edition!
              </p>
              <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
                <p style="font-size:12px;color:#52525b;margin:0;">
                  If you didn't sign up for this newsletter, you can
                  <a href="{{unsubscribe_url}}" style="color:#3b82f6;text-decoration:underline;">unsubscribe here</a>.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      text: `Welcome to Nagriva!\n\nHey there! You're now part of the Nagriva community. We're thrilled to have you on board.\n\nEvery week, you'll receive curated job opportunities, career insights, AI tools, productivity tips, and exclusive resources.\n\nIf you didn't sign up for this newsletter, you can unsubscribe here: {{unsubscribe_url}}`
    };
  }

  /* ─── Unsubscribe Handler ─── */
  async function unsubscribe(email) {
    if (!email) return { success: false, error: 'Email is required.' };

    try {
      const { data, error } = await window.supabaseClient
        .from('newsletter_subscribers')
        .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
        .eq('email', email)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        return { success: false, error: 'Email not found.' };
      }

      return { success: true, data: data[0] };
    } catch (err) {
      console.error('[EmailService] Unsubscribe error:', err);
      return { success: false, error: err.message || 'Failed to unsubscribe.' };
    }
  }

  /* ─── Send Email (placeholder — integrate provider here) ─── */
  async function sendEmail(emailData) {
    if (!CONFIG.enabled) {
      console.log('[EmailService] Email sending disabled. Would send:', emailData.subject, 'to:', emailData.to);
      return { success: true, simulated: true };
    }

    /* TODO: Integrate external email provider here.
     *
     * Example with Resend:
     * const resend = new Resend(CONFIG.apiKey);
     * return await resend.emails.send({
     *   from: `${CONFIG.fromName} <${CONFIG.fromEmail}>`,
     *   to: emailData.to,
     *   subject: emailData.subject,
     *   html: emailData.html,
     *   text: emailData.text
     * });
     */

    console.warn('[EmailService] No email provider configured.');
    return { success: false, error: 'No email provider configured.' };
  }

  /* ─── Send Welcome Email ─── */
  async function sendWelcomeEmail(subscriberEmail) {
    const emailData = getWelcomeEmail(subscriberEmail);
    return await sendEmail(emailData);
  }

  /* ─── Get Subscriber Stats ─── */
  async function getStats() {
    try {
      const { data: total, error: totalError } = await window.supabaseClient
        .from('newsletter_subscribers')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      const { data: bySource, error: sourceError } = await window.supabaseClient
        .from('newsletter_subscribers')
        .select('source');

      if (totalError || sourceError) {
        throw totalError || sourceError;
      }

      const sourceCounts = {};
      if (bySource) {
        bySource.forEach(s => {
          sourceCounts[s.source] = (sourceCounts[s.source] || 0) + 1;
        });
      }

      return {
        totalSubscribers: total ? total.length : 0,
        bySource: sourceCounts
      };
    } catch (err) {
      console.error('[EmailService] Get stats error:', err);
      return { totalSubscribers: 0, bySource: {} };
    }
  }

  return {
    CONFIG,
    getWelcomeEmail,
    unsubscribe,
    sendEmail,
    sendWelcomeEmail,
    getStats
  };
})();

/* Export for module systems */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NAGRIVA_EmailService;
}
