export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { url } = req.body || {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, error: 'URL is required' });
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid URL' });
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return res.status(400).json({ success: false, error: 'URL must use http or https' });
  }

  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=mobile`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      const msg = data.error?.message || `PageSpeed API returned ${response.status}`;
      return res.status(502).json({ success: false, error: msg });
    }

    const categories = data.lighthouseResult?.categories;
    if (!categories) {
      return res.status(502).json({ success: false, error: 'Invalid response from PageSpeed API' });
    }

    const toScore = (cat) => {
      if (!cat || typeof cat.score !== 'number') return null;
      return Math.round(cat.score * 100);
    };

    const performance = toScore(categories.performance);
    const seo = toScore(categories.seo);
    const accessibility = toScore(categories.accessibility);
    const bestPractices = toScore(categories['best-practices']);

    const scores = [performance, seo, accessibility, bestPractices].filter(s => s !== null);
    const overallScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

    return res.status(200).json({
      success: true,
      overallScore,
      performance,
      seo,
      accessibility,
      bestPractices,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch audit results' });
  }
}
