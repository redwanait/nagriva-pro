/* ════════════════════════════════════════════════════════
   Nagriva — Stripe Webhook Handler
   Vercel Serverless Function
   Handles: checkout.session.completed,
            customer.subscription.updated,
            customer.subscription.deleted,
            invoice.paid,
            invoice.payment_failed
   ════════════════════════════════════════════════════════ */

const Stripe = require('stripe');

// Read raw body from request stream (Vercel auto-parses JSON otherwise)
function buffer(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bemcdcfdaccfdtmnzuwh.supabase.co';

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[Stripe Webhook] Missing environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const stripe = Stripe(STRIPE_SECRET_KEY);
  const supabase = require('@supabase/supabase-js').createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log('[Stripe Webhook] Received event:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event.data.object, supabase, stripe);
        break;
      }

      case 'customer.subscription.updated': {
        await handleSubscriptionUpdated(event.data.object, supabase);
        break;
      }

      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event.data.object, supabase);
        break;
      }

      case 'invoice.paid': {
        await handleInvoicePaid(event.data.object, supabase);
        break;
      }

      case 'invoice.payment_failed': {
        await handleInvoicePaymentFailed(event.data.object, supabase);
        break;
      }

      default:
        console.log('[Stripe Webhook] Unhandled event type:', event.type);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Stripe Webhook] Error processing event:', err);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
};

/* ─── Handle checkout.session.completed ─── */
async function handleCheckoutCompleted(session, supabase, stripe) {
  const userId = session.client_reference_id || session.metadata?.user_id;
  if (!userId) {
    console.error('[Stripe Webhook] No user_id in checkout session');
    return;
  }

  const customerId = session.customer;
  const subscriptionId = session.subscription;

  // Save Stripe customer ID to the user's profile
  if (customerId) {
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId);
  }

  if (!subscriptionId) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const plan = (subscription.status === 'active' || subscription.status === 'trialing') ? 'pro' : 'free';

  // Update profiles.plan FIRST — critical: do this before subscriptions upsert
  // so the plan change survives even if the subscriptions table doesn't exist yet
  await supabase.from('profiles').update({ plan: plan }).eq('id', userId);

  const subscriptionData = {
    user_id: userId,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
    stripe_price_id: subscription.items?.data?.[0]?.price?.id || null,
    status: subscription.status,
    plan: plan,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
  };

  // Upsert subscription — wrapped in try/catch so a missing table doesn't block the plan update
  try {
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();

    if (existing) {
      await supabase.from('subscriptions').update(subscriptionData).eq('id', existing.id);
    } else {
      await supabase.from('subscriptions').insert(subscriptionData);
    }
  } catch (subErr) {
    console.warn('[Stripe Webhook] subscriptions upsert failed (table may not exist yet):', subErr.message || subErr);
  }
}

/* ─── Handle customer.subscription.updated ─── */
async function handleSubscriptionUpdated(subscription, supabase) {
  // Stripe subscriptions created via Checkout do NOT inherit metadata from the
  // Checkout Session, so subscription.metadata.user_id will be undefined.
  // We always look up the user by stripe_customer_id instead.
  const customerId = subscription.customer;
  if (!customerId) {
    console.error('[Stripe Webhook] No customer on subscription');
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (!profile) {
    // Try the checkout session's client_reference_id as a fallback
    console.warn('[Stripe Webhook] No profile found for customer:', customerId, '- cannot sync subscription');
    return;
  }

  const userId = profile.id;
  const status = subscription.status;
  const plan = (status === 'active' || status === 'trialing') ? 'pro' : 'free';

  // Update plan on profiles FIRST
  await supabase.from('profiles').update({ plan: plan }).eq('id', userId);

  const subscriptionData = {
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    stripe_price_id: subscription.items?.data?.[0]?.price?.id || null,
    status: status,
    plan: plan,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
  };

  // Upsert subscription — wrapped in try/catch so a missing table doesn't block the plan update
  try {
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle();

    if (existing) {
      await supabase.from('subscriptions').update(subscriptionData).eq('id', existing.id);
    } else {
      await supabase.from('subscriptions').insert(subscriptionData);
    }
  } catch (subErr) {
    console.warn('[Stripe Webhook] subscriptions upsert failed (table may not exist yet):', subErr.message || subErr);
  }
}

/* ─── Handle customer.subscription.deleted ─── */
async function handleSubscriptionDeleted(subscription, supabase) {
  // Try to find the user via customer ID
  const customerId = subscription.customer;
  let userId = null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (profile) {
    userId = profile.id;
  } else {
    // Fallback: look up via subscriptions table
    try {
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .maybeSingle();
      if (existing) userId = existing.user_id;
    } catch (_) {}
  }

  if (!userId) {
    console.error('[Stripe Webhook] No user found for deleted subscription:', subscription.id);
    return;
  }

  // Update profiles.plan FIRST
  await supabase.from('profiles').update({ plan: 'free' }).eq('id', userId);

  // Try to update subscriptions table
  try {
    await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        plan: 'free',
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id);
  } catch (subErr) {
    console.warn('[Stripe Webhook] subscriptions update failed:', subErr.message || subErr);
  }
}

/* ─── Handle invoice.paid ─── */
async function handleInvoicePaid(invoice, supabase) {
  if (!invoice.subscription) return;

  // Look up user via customer ID on the invoice
  const customerId = invoice.customer;
  if (!customerId) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (profile) {
    await supabase.from('profiles').update({ plan: 'pro' }).eq('id', profile.id);
  }

  // Update subscriptions table if it exists
  try {
    await supabase
      .from('subscriptions')
      .update({ status: 'active', plan: 'pro' })
      .eq('stripe_subscription_id', invoice.subscription);
  } catch (subErr) {
    console.warn('[Stripe Webhook] subscriptions update on invoice.paid failed:', subErr.message || subErr);
  }
}

/* ─── Handle invoice.payment_failed ─── */
async function handleInvoicePaymentFailed(invoice, supabase) {
  if (!invoice.subscription) return;

  const customerId = invoice.customer;
  if (!customerId) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (profile) {
    await supabase.from('profiles').update({ plan: 'free' }).eq('id', profile.id);
  }

  try {
    await supabase
      .from('subscriptions')
      .update({ status: 'past_due', plan: 'free' })
      .eq('stripe_subscription_id', invoice.subscription);
  } catch (subErr) {
    console.warn('[Stripe Webhook] subscriptions update on invoice.payment_failed failed:', subErr.message || subErr);
  }
}

module.exports.config = {
  api: {
    bodyParser: false
  }
};
