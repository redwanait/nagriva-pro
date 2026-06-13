module.exports = async function handler(req, res) {
  const step = (label) => console.log(`[AuditAPI] ${label}`);
  const fail = (code, label, detail) => {
    console.error(`[AuditAPI] FAILED — ${label}`, detail || '');
    return res.status(code).json({ success: false, error: label, detail: detail || null });
  };

  step('Handler invoked');

  if (req.method !== 'POST') {
    return fail(405, 'Method not allowed', `Received ${req.method}`);
  }

  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    return fail(400, 'URL is required');
  }

  let parsed;
  try {
    parsed = new URL(url);
    step(`URL parsed: ${parsed.href}`);
  } catch {
    return fail(400, 'Invalid URL format', `Cannot parse: "${url}"`);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return fail(400, 'Invalid URL protocol', `Protocol must be http or https, got "${parsed.protocol}"`);
  }

  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    return fail(500, 'API Key Missing', 'PAGESPEED_API_KEY environment variable is not set');
  }

  step(`API key present: ${apiKey.substring(0, 4)}...`);

  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=mobile`;

  step(`Sending request to Google PageSpeed API`);

  try {
    const response = await fetch(apiUrl);
    step(`PageSpeed API responded with status ${response.status}`);

    const data = await response.json();
    step(`Response body parsed (${JSON.stringify(data).length} bytes)`);

    if (!response.ok) {
      const googleMsg = data.error?.message || data.error?.status || 'Unknown Google API error';
      const googleCode = data.error?.code || response.status;
      console.error('[AuditAPI] Google API error:', JSON.stringify(data.error || data));

      if (response.status === 403 || googleCode === 403) {
        return fail(502, 'PageSpeed API Quota Exceeded', `Google returned 403: ${googleMsg}`);
      }
      if (response.status === 429) {
        return fail(502, 'PageSpeed API Quota Exceeded', `Google returned 429: ${googleMsg}`);
      }
      return fail(502, `PageSpeed API Request Failed`, `HTTP ${response.status}: ${googleMsg}`);
    }

    const lighthouseResult = data.lighthouseResult;
    if (!lighthouseResult) {
      console.error('[AuditAPI] Missing lighthouseResult in response:', JSON.stringify(data).substring(0, 500));
      return fail(502, 'Invalid PageSpeed API Response', 'Response missing lighthouseResult');
    }

    const categories = lighthouseResult.categories;
    if (!categories) {
      return fail(502, 'Invalid PageSpeed API Response', 'Response missing categories');
    }

    const toScore = (cat) => {
      if (!cat || typeof cat.score !== 'number') return null;
      return Math.round(cat.score * 100);
    };

    const performance = toScore(categories.performance);
    const seo = toScore(categories.seo);
    const accessibility = toScore(categories.accessibility);
    const bestPractices = toScore(categories['best-practices']);

    step(`Scores: perf=${performance} seo=${seo} acc=${accessibility} bp=${bestPractices}`);

    const scores = [performance, seo, accessibility, bestPractices].filter(s => s !== null);
    const overallScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

    step(`Overall score: ${overallScore}`);

    return res.status(200).json({
      success: true,
      overallScore,
      performance,
      seo,
      accessibility,
      bestPractices,
    });
  } catch (err) {
    console.error('[AuditAPI] Unhandled exception:', err.message, err.stack);
    return fail(500, 'API Request Failed', `${err.name}: ${err.message}`);
  }
}
