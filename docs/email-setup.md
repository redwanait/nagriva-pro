# NAGRIVA Email Setup — Resend + Supabase Edge Functions

## Overview

Welcome email (post-registration) and Order Confirmation email (post-order) are sent via **Resend API** through a **Supabase Edge Function**, logged in the `email_logs` table.

## 1. Supabase Secret — Store RESEND_API_KEY

```bash
# Install Supabase CLI (if not installed)
# macOS:
brew install supabase/tap/supabase

# Log in
supabase login

# Link to your project
supabase link --project-ref bemcdcfdaccfdtmnzuwh

# Set the Resend API key as a Supabase secret
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxx
```

Or set it directly in the Supabase Dashboard:
- Go to **Dashboard > Edge Functions > Secrets**
- Add `RESEND_API_KEY` with your Resend API key value

## 2. Database Migration — Run in Supabase SQL Editor

Open the Supabase SQL Editor and run:

**`supabase-migration-email-logs.sql`**

This creates the `email_logs` table with RLS policies and indexes.

```sql
-- Run the file content from: supabase-migration-email-logs.sql
```

## 3. Deploy Edge Function

```bash
# From the project root
supabase functions deploy send-email --project-ref bemcdcfdaccfdtmnzuwh
```

Verify deployment:
```bash
supabase functions list --project-ref bemcdcfdaccfdtmnzuwh
```

## 4. Verify Edge Function

```bash
curl -X POST https://bemcdcfdaccfdtmnzuwh.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-supabase-anon-key>" \
  -d '{ "type": "welcome", "email": "test@example.com", "user_id": "00000000-0000-0000-0000-000000000000", "full_name": "Test User", "first_name": "Test" }'
```

Expected response: `{ "success": true, "id": "<resend-email-id>" }`

## 5. Verify Resend Domain

Ensure your sending domain (`nagriva.com`) is verified in the Resend dashboard:
- Go to **Resend Dashboard > Domains**
- Add and verify `nagriva.com`
- Update the `FROM_EMAIL` in the Edge Function if needed (default: `NAGRIVA <noreply@nagriva.com>`)

## 6. Files Modified

| File | Change |
|---|---|
| `supabase-migration-email-logs.sql` | **NEW** — Creates `email_logs` table |
| `supabase/functions/send-email/index.ts` | **NEW** — Edge Function using Resend API |
| `js/auth.js` | Added `sendWelcomeEmail()` call after signup |
| `js/orders.js` | Added `sendOrderConfirmationEmail()` call after order creation |

## 7. How It Works

### Welcome Email Flow
1. User completes signup → `auth.js` `handleSignUp()` succeeds
2. `sendWelcomeEmail()` fires asynchronously
3. Edge Function receives `{ type: "welcome", ... }`
4. Resend API sends branded welcome email with dashboard/services links
5. Log written to `email_logs` table

### Order Confirmation Flow
1. User submits order → `orders.js` `createOrder()` succeeds
2. `sendOrderConfirmationEmail()` fires asynchronously
3. Edge Function receives `{ type: "order_confirmation", ... }`
4. Resend API sends branded order confirmation with order details
5. Log written to `email_logs` table

## 8. Edge Function Endpoints Used

- **Resend API**: `POST https://api.resend.com/emails`
- **Supabase REST**: `POST {SUPABASE_URL}/rest/v1/email_logs` (via service role key)

## 9. Email Logs Table

```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  email_type TEXT NOT NULL,     -- 'welcome' or 'order_confirmation'
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'sent', 'failed'
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Query sent emails:
```sql
SELECT * FROM email_logs ORDER BY created_at DESC LIMIT 20;
```

## 10. Rollback

If needed, disable email sending by commenting out the trigger calls in:

- `js/auth.js` — `sendWelcomeEmail()` call
- `js/orders.js` — `sendOrderConfirmationEmail()` call
