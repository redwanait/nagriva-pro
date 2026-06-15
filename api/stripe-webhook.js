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
    const { error: customerError } = await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId);

    if (customerError) {
      console.error('[Stripe Webhook] stripe_customer_id update failed:', customerError);
      throw customerError;
    }
  }

  if (!subscriptionId) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const plan = (subscription.status === 'active' || subscription.status === 'trialing') ? 'pro' : 'free';

  console.log('[Stripe Webhook] Updating profile', {
    userId,
    plan,
    customerId
  });

  const { data: planData, error: planError } = await supabase
    .from('profiles')
    .update({ plan: plan })
    .eq('id', userId);

  if (planError) {
    console.error('[Stripe Webhook] profiles.plan update failed:', planError);
    throw planError;
  }

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

  // Upsert subscription
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (existingSub) {
    const { error: updateSubError } = await supabase.from('subscriptions').update(subscriptionData).eq('id', existingSub.id);
    if (updateSubError) {
      console.error('[Stripe Webhook] subscription update failed:', updateSubError);
      throw updateSubError;
    }
  } else {
    const { error: insertSubError } = await supabase.from('subscriptions').insert(subscriptionData);
    if (insertSubError) {
      console.error('[Stripe Webhook] subscription insert failed:', insertSubError);
      throw insertSubError;
    }
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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (profileError) {
    console.error('[Stripe Webhook] profile lookup failed:', profileError);
    throw profileError;
  }

  if (!profile) {
    console.warn('[Stripe Webhook] No profile found for customer:', customerId);
    return;
  }

  const userId = profile.id;
  const status = subscription.status;
  const plan = (status === 'active' || status === 'trialing') ? 'pro' : 'free';

  const { error: planUpdateError } = await supabase.from('profiles').update({ plan: plan }).eq('id', userId);

  if (planUpdateError) {
    console.error('[Stripe Webhook] profiles.plan update failed:', planUpdateError);
    throw planUpdateError;
  }

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

  // Upsert subscription
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await supabase.from('subscriptions').update(subscriptionData).eq('id', existing.id);
    if (updateError) {
      console.error('[Stripe Webhook] subscription update failed:', updateError);
      throw updateError;
    }
  } else {
    const { error: insertError } = await supabase.from('subscriptions').insert(subscriptionData);
    if (insertError) {
      console.error('[Stripe Webhook] subscription insert failed:', insertError);
      throw insertError;
    }
  }
}

/* ─── Handle customer.subscription.deleted ─── */
async function handleSubscriptionDeleted(subscription, supabase) {
  const customerId = subscription.customer;
  let userId = null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (profileError) {
    console.error('[Stripe Webhook] profile lookup failed:', profileError);
    throw profileError;
  }

  if (profile) {
    userId = profile.id;
  } else {
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle();
    if (existing) userId = existing.user_id;
  }

  if (!userId) {
    console.error('[Stripe Webhook] No user found for deleted subscription:', subscription.id);
    return;
  }

  const { error: planUpdateError } = await supabase.from('profiles').update({ plan: 'free' }).eq('id', userId);

  if (planUpdateError) {
    console.error('[Stripe Webhook] profiles.plan update failed:', planUpdateError);
    throw planUpdateError;
  }

  const { error: subUpdateError } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      plan: 'free',
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (subUpdateError) {
    console.error('[Stripe Webhook] subscriptions update failed:', subUpdateError);
    throw subUpdateError;
  }
}

/* ─── Handle invoice.paid ─── */
async function handleInvoicePaid(invoice, supabase) {
  if (!invoice.subscription) return;

  const customerId = invoice.customer;
  if (!customerId) return;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (profileError) {
    console.error('[Stripe Webhook] profile lookup failed:', profileError);
    throw profileError;
  }

  if (profile) {
    const { error: planUpdateError } = await supabase.from('profiles').update({ plan: 'pro' }).eq('id', profile.id);
    if (planUpdateError) {
      console.error('[Stripe Webhook] profiles.plan update failed:', planUpdateError);
      throw planUpdateError;
    }
  }

  const { error: subUpdateError } = await supabase
    .from('subscriptions')
    .update({ status: 'active', plan: 'pro' })
    .eq('stripe_subscription_id', invoice.subscription);

  if (subUpdateError) {
    console.error('[Stripe Webhook] subscriptions update failed:', subUpdateError);
    throw subUpdateError;
  }
}

/* ─── Handle invoice.payment_failed ─── */
async function handleInvoicePaymentFailed(invoice, supabase) {
  if (!invoice.subscription) return;

  const customerId = invoice.customer;
  if (!customerId) return;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (profileError) {
    console.error('[Stripe Webhook] profile lookup failed:', profileError);
    throw profileError;
  }

  if (profile) {
    const { error: planUpdateError } = await supabase.from('profiles').update({ plan: 'free' }).eq('id', profile.id);
    if (planUpdateError) {
      console.error('[Stripe Webhook] profiles.plan update failed:', planUpdateError);
      throw planUpdateError;
    }
  }

  const { error: subUpdateError } = await supabase
    .from('subscriptions')
    .update({ status: 'past_due', plan: 'free' })
    .eq('stripe_subscription_id', invoice.subscription);

  if (subUpdateError) {
    console.error('[Stripe Webhook] subscriptions update failed:', subUpdateError);
    throw subUpdateError;
  }
}

module.exports.config = {
  api: {
    bodyParser: false
  }
};
