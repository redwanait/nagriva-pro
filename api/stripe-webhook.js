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
    event = stripe.webhooks.constructEvent(
      req.body,
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
    // One-time payment or no subscription (shouldn't happen for subscription products)
    return;
  }

  // Fetch full subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const subscriptionData = {
    user_id: userId,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
    stripe_price_id: subscription.items?.data?.[0]?.price?.id || null,
    status: subscription.status,
    plan: subscription.status === 'active' || subscription.status === 'trialing' ? 'pro' : 'free',
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
  };

  // Upsert subscription record
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

  // Manually sync plan (trigger will handle after insert)
  const plan = (subscription.status === 'active' || subscription.status === 'trialing') ? 'pro' : 'free';
  await supabase.from('profiles').update({ plan: plan }).eq('id', userId);
}

/* ─── Handle customer.subscription.updated ─── */
async function handleSubscriptionUpdated(subscription, supabase) {
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    // Look up user by customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', subscription.customer)
      .maybeSingle();
    if (!profile) {
      console.error('[Stripe Webhook] No user found for customer:', subscription.customer);
      return;
    }
    var userId = profile.id;
  }

  const status = subscription.status;
  const plan = (status === 'active' || status === 'trialing') ? 'pro' : 'free';

  const subscriptionData = {
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    stripe_price_id: subscription.items?.data?.[0]?.price?.id || null,
    status: status,
    plan: plan,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
  };

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

  // Directly sync plan as well
  await supabase.from('profiles').update({ plan: plan }).eq('id', userId);
}

/* ─── Handle customer.subscription.deleted ─── */
async function handleSubscriptionDeleted(subscription, supabase) {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .maybeSingle();

  if (!existing) {
    console.error('[Stripe Webhook] No subscription record found for:', subscription.id);
    return;
  }

  const userId = existing.user_id;

  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      plan: 'free',
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  await supabase.from('profiles').update({ plan: 'free' }).eq('id', userId);
}

/* ─── Handle invoice.paid ─── */
async function handleInvoicePaid(invoice, supabase) {
  if (!invoice.subscription) return;

  // Ensure subscription is marked active
  const subscriptionId = invoice.subscription;
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (sub) {
    await supabase
      .from('subscriptions')
      .update({ status: 'active', plan: 'pro' })
      .eq('id', sub.id);
    await supabase.from('profiles').update({ plan: 'pro' }).eq('id', sub.user_id);
  }
}

/* ─── Handle invoice.payment_failed ─── */
async function handleInvoicePaymentFailed(invoice, supabase) {
  if (!invoice.subscription) return;

  const subscriptionId = invoice.subscription;
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (sub) {
    await supabase
      .from('subscriptions')
      .update({ status: 'past_due', plan: 'free' })
      .eq('id', sub.id);
    await supabase.from('profiles').update({ plan: 'free' }).eq('id', sub.user_id);
  }
}
