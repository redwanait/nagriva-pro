module.exports = async (req, res) => {
  const checks = {
    STRIPE_SECRET_KEY: { exists: !!process.env.STRIPE_SECRET_KEY, prefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 7) + '...' : null },
    STRIPE_WEBHOOK_SECRET: { exists: !!process.env.STRIPE_WEBHOOK_SECRET, prefix: process.env.STRIPE_WEBHOOK_SECRET ? process.env.STRIPE_WEBHOOK_SECRET.substring(0, 7) + '...' : null },
    SUPABASE_SERVICE_ROLE_KEY: { exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY, prefix: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 7) + '...' : null },
    SUPABASE_URL: { exists: !!process.env.SUPABASE_URL, value: process.env.SUPABASE_URL || 'not set' }
  };
  
  // Test raw body reading
  let rawBodyTest = 'not tested';
  try {
    const chunks = [];
    await new Promise((resolve, reject) => {
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => resolve());
      req.on('error', reject);
      setTimeout(() => reject(new Error('timeout')), 5000);
    });
    const buf = Buffer.concat(chunks);
    rawBodyTest = `read ${buf.length} bytes`;
  } catch (e) {
    rawBodyTest = `error: ${e.message}`;
  }
  
  checks.rawBodyTest = rawBodyTest;
  
  res.status(200).json(checks);
};
