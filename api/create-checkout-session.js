/* ════════════════════════════════════════════════════════
   Nagriva — Create Stripe Checkout Session
   Vercel Serverless Function
   ════════════════════════════════════════════════════════ */

const Stripe = require('stripe');

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bemcdcfdaccfdtmnzuwh.supabase.co';
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const stripe = Stripe(STRIPE_SECRET_KEY);
  const supabase = require('@supabase/supabase-js').createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );

  // Verify the user is authenticated
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { priceId, mode } = req.body;
  if (!priceId) {
    return res.status(400).json({ error: 'Missing priceId' });
  }

  const successUrl = `${req.headers.origin}/pages/dashboard.html?checkout=success`;
  const cancelUrl = `${req.headers.origin}/pages/nagriva-pro.html?checkout=cancelled`;

  try {
    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    const sessionParams = {
      mode: mode || 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: {
        user_id: user.id
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto'
    };

    // If user already has a Stripe customer, use it
    if (profile?.stripe_customer_id) {
      sessionParams.customer = profile.stripe_customer_id;
      delete sessionParams.customer_email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[Create Checkout Session] Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
