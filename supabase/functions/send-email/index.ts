import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'Nagriva <noreply@nagriva.com>'

interface EmailPayload {
  type: 'welcome' | 'order_confirmation'
  user_id: string
  email: string
  full_name?: string
  first_name?: string
  order_id?: string
  order_number?: string
  service_type?: string
  status?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured')
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const payload: EmailPayload = await req.json()
    const { type, email } = payload

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let subject: string
    let html: string

    switch (type) {
      case 'welcome':
        subject = 'Welcome to Nagriva 🚀'
        html = buildWelcomeEmail(payload)
        break
      case 'order_confirmation':
        subject = 'Your Nagriva Order Has Been Received'
        html = buildOrderConfirmationEmail(payload)
        break
      default:
        return new Response(JSON.stringify({ error: 'Invalid email type' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject,
        html,
      }),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      console.error('Resend API error:', resendData)
      await logEmail(payload, 'failed', resendData?.message || 'Unknown error')
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await logEmail(payload, 'sent')

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

async function logEmail(payload: EmailPayload, status: string, errorMessage?: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Cannot log email: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
    return
  }

  const body = JSON.stringify({
    user_id: payload.user_id || null,
    email: payload.email,
    email_type: payload.type,
    status,
    error_message: errorMessage || null,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  })

  const { error } = await fetch(`${supabaseUrl}/rest/v1/email_logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body,
  }).then((r) => r.json())

  if (error) {
    console.error('Failed to log email:', error)
  }
}

function buildWelcomeEmail(payload: EmailPayload): string {
  const firstName = payload.first_name || payload.full_name?.split(' ')[0] || 'there'
  const dashboardUrl = 'https://nagriva.com/pages/dashboard.html'
  const servicesUrl = 'https://nagriva.com/pages/services.html'

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;margin:0;padding:0;background-color:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:40px 30px;text-align:center;">
            <h1 style="color:#e94560;margin:0;font-size:28px;">Nagriva</h1>
            <p style="color:#ffffff;font-size:16px;margin-top:8px;">Premium Academic Solutions</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 30px;">
            <h2 style="color:#1a1a2e;font-size:24px;margin:0 0 16px 0;">Welcome, ${escapeHtml(firstName)}! 🚀</h2>
            <p style="color:#555;font-size:16px;line-height:1.6;margin:0 0 20px 0;">
              Thank you for joining Nagriva! We're excited to have you on board.
              Your journey to academic excellence starts here.
            </p>
            <p style="color:#555;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
              With Nagriva, you can access top-tier academic services tailored to your needs.
              Get started by exploring your dashboard or browsing our services.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="padding:0 8px;">
                  <a href="${dashboardUrl}" style="display:inline-block;background-color:#e94560;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:16px;font-weight:600;">Go to Dashboard</a>
                </td>
                <td style="padding:0 8px;">
                  <a href="${servicesUrl}" style="display:inline-block;background-color:#ffffff;color:#e94560;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:16px;font-weight:600;border:2px solid #e94560;">Browse Services</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#f8f8f8;padding:20px 30px;text-align:center;border-top:1px solid #eee;">
            <p style="color:#888;font-size:13px;margin:0 0 4px 0;">&copy; ${new Date().getFullYear()} Nagriva. All rights reserved.</p>
            <p style="color:#888;font-size:13px;margin:0;">Premium Academic Solutions</p>
            <p style="color:#aaa;font-size:12px;margin:8px 0 0 0;">
              This email was sent to you because you created an account with Nagriva.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildOrderConfirmationEmail(payload: EmailPayload): string {
  const firstName = payload.first_name || payload.full_name?.split(' ')[0] || 'there'
  const dashboardUrl = 'https://nagriva.com/pages/dashboard.html'

  const statusLabels: Record<string, string> = {
    pending: 'Pending Review',
    approved: 'Approved',
    in_progress: 'In Progress',
    review: 'Under Review',
    delivered: 'Delivered',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }

  const statusLabel = statusLabels[payload.status || 'pending'] || 'Pending'

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;margin:0;padding:0;background-color:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:40px 30px;text-align:center;">
            <h1 style="color:#e94560;margin:0;font-size:28px;">Nagriva</h1>
            <p style="color:#ffffff;font-size:16px;margin-top:8px;">Order Confirmation</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 30px;">
            <h2 style="color:#1a1a2e;font-size:24px;margin:0 0 16px 0;">Thank You, ${escapeHtml(firstName)}!</h2>
            <p style="color:#555;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
              Your order has been received successfully. Our team will review it and get back to you shortly.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f8f8;border-radius:8px;padding:20px;margin:0 0 24px 0;">
              <tr>
                <td style="padding:6px 0;color:#888;font-size:14px;width:120px;">Order ID:</td>
                <td style="padding:6px 0;color:#1a1a2e;font-size:14px;font-weight:600;">${escapeHtml(payload.order_number || payload.order_id || 'N/A')}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#888;font-size:14px;width:120px;">Service:</td>
                <td style="padding:6px 0;color:#1a1a2e;font-size:14px;">${escapeHtml(payload.service_type || 'N/A')}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#888;font-size:14px;width:120px;">Status:</td>
                <td style="padding:6px 0;color:#e94560;font-size:14px;font-weight:600;">${escapeHtml(statusLabel)}</td>
              </tr>
            </table>
            <h3 style="color:#1a1a2e;font-size:18px;margin:0 0 12px 0;">Next Steps</h3>
            <ol style="color:#555;font-size:15px;line-height:1.8;margin:0 0 24px 0;padding-left:20px;">
              <li>Our team will review your order details within 24 hours.</li>
              <li>You'll receive a notification once your order is approved.</li>
              <li>Track progress and communicate with your project manager in real-time.</li>
              <li>Review and approve deliverables as they're completed.</li>
            </ol>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td>
                  <a href="${dashboardUrl}" style="display:inline-block;background-color:#e94560;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:16px;font-weight:600;">Track Your Order</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background-color:#f8f8f8;padding:20px 30px;text-align:center;border-top:1px solid #eee;">
            <p style="color:#888;font-size:13px;margin:0 0 4px 0;">&copy; ${new Date().getFullYear()} Nagriva. All rights reserved.</p>
            <p style="color:#888;font-size:13px;margin:0;">Premium Academic Solutions</p>
            <p style="color:#aaa;font-size:12px;margin:8px 0 0 0;">
              This email was sent to you because you placed an order with Nagriva.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escapeHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
