console.log("[AuditAPI] FILE LOADED");
console.log("[AuditAPI] PAGESPEED_API_KEY present:", !!process.env.PAGESPEED_API_KEY);

module.exports = async function handler(req, res) {
  console.log("[AuditAPI] HANDLER STARTED — method:", req.method);

  function sendJson(statusCode, body) {
    const payload = JSON.stringify(body);
    try {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(payload);
    } catch (e) {
      try {
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'application/json');
        res.end(payload);
      } catch (e2) {
        console.error('[AuditAPI] CRITICAL: cannot send response:', e2.message);
      }
    }
  }

  /* ─── Variables for catch-block logging ─── */
  let apiUrl = null;
  let googleResponseStatus = null;
  let googleErrorBody = null;
  let requestUrl = null;

  try {

    /* ─── Step 0: log request body ─── */
    requestUrl = (req.body && req.body.url) || '';
    console.log("[AuditAPI] Request URL:", JSON.stringify(requestUrl));

    /* ─── Step 1: method check ─── */
    if (req.method !== 'POST') {
      return sendJson(405, { success: false, failedStep: 'Method Check', error: 'Method not allowed. Only POST is accepted, got: ' + req.method });
    }

    /* ─── Step 2: parse & validate URL ─── */
    let url = (req.body && req.body.url) || '';
    if (!url || typeof url !== 'string' || !url.trim()) {
      return sendJson(400, { success: false, failedStep: 'URL Validation', error: 'URL is required — no url field in request body' });
    }
    let parsedUrl;
    try { parsedUrl = new URL(url); } catch (e) {
      return sendJson(400, { success: false, failedStep: 'URL Validation', error: 'Invalid URL format: ' + e.message });
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return sendJson(400, { success: false, failedStep: 'URL Validation', error: 'Invalid URL protocol: must be http or https, got: ' + parsedUrl.protocol });
    }

    /* ─── Step 3: check API key ─── */
    const apiKey = process.env.PAGESPEED_API_KEY;
    if (!apiKey) {
      console.error("[AuditAPI] PAGESPEED_API_KEY is NOT set");
      return sendJson(500, { success: false, failedStep: 'Environment Check', error: 'Server configuration error: PAGESPEED_API_KEY is missing. Contact support.' });
    }

    /* ─── Step 4: build Google API URL ─── */
    apiUrl = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=' + encodeURIComponent(url) + '&key=' + apiKey + '&strategy=mobile&category=performance&category=seo&category=accessibility&category=best-practices';
    console.log("[AuditAPI] Google API URL (key hidden):", apiUrl.replace(/key=[^&]+/, 'key=***'));

    /* ─── Step 5: check fetch ─── */
    if (typeof fetch === 'undefined') {
      return sendJson(500, { success: false, failedStep: 'Fetch Check', error: 'fetch() is not available in this runtime environment' });
    }

    /* ─── Step 6: send request to Google ─── */
    console.log("[AuditAPI] Sending request to Google PageSpeed API...");
    let response;
    try {
      response = await fetch(apiUrl);
      googleResponseStatus = response.status + ' ' + response.statusText;
      console.log("[AuditAPI] Google response status:", googleResponseStatus);
    } catch (e) {
      console.error("[AuditAPI] fetch() to Google API threw:", e.message);
      console.error("[AuditAPI] Stack:", e.stack);
      return sendJson(502, {
        success: false,
        failedStep: 'PageSpeed Request',
        error: 'Failed to reach Google PageSpeed API: ' + e.message,
        details: e.stack || ''
      });
    }

    /* ─── Step 7: parse Google response ─── */
    let data;
    try {
      data = await response.json();
      console.log("[AuditAPI] Google response parsed as JSON");
    } catch (e) {
      let text = '';
      try { text = await response.text(); } catch (e2) {}
      googleErrorBody = text.length > 2000 ? text.substring(0, 2000) + '...' : text;
      console.error("[AuditAPI] Failed to parse Google response as JSON. Status:", response.status);
      console.error("[AuditAPI] Google response body:", googleErrorBody);
      return sendJson(502, {
        success: false,
        failedStep: 'Parse PageSpeed Response',
        error: 'Invalid response from Google PageSpeed API. HTTP ' + response.status + '. Body: ' + googleErrorBody.substring(0, 300),
        details: googleErrorBody
      });
    }

    /* ─── Step 8: check Google response status ─── */
    if (!response.ok) {
      const googleMsg = (data && data.error && (data.error.message || data.error.status)) || 'HTTP ' + response.status;
      const googleCode = (data && data.error && data.error.code) || response.status;
      googleErrorBody = data && data.error ? JSON.stringify(data.error) : '';
      console.error("[AuditAPI] Google API returned error. Status:", response.status, "Code:", googleCode, "Message:", googleMsg);
      console.error("[AuditAPI] Google error details:", googleErrorBody);

      if (response.status === 403 || googleCode === 403) {
        return sendJson(502, {
          success: false,
          failedStep: 'PageSpeed API Error',
          error: 'Google PageSpeed API 403: ' + googleMsg + (googleErrorBody ? ' — ' + googleErrorBody : ''),
          details: googleErrorBody
        });
      }
      if (response.status === 429) {
        return sendJson(502, {
          success: false,
          failedStep: 'PageSpeed API Error',
          error: 'Google PageSpeed API quota exceeded (429): ' + googleMsg + (googleErrorBody ? ' — ' + googleErrorBody : ''),
          details: googleErrorBody
        });
      }
      return sendJson(502, {
        success: false,
        failedStep: 'PageSpeed API Error',
        error: 'Google PageSpeed API request failed (HTTP ' + response.status + '): ' + googleMsg + (googleErrorBody ? ' — ' + googleErrorBody : ''),
        details: googleErrorBody
      });
    }
    console.log("[AuditAPI] Google response OK");

    /* ─── Step 9: extract lighthouseResult ─── */
    const lighthouseResult = data.lighthouseResult;
    if (!lighthouseResult) {
      return sendJson(502, { success: false, failedStep: 'Parse PageSpeed Data', error: 'Invalid PageSpeed API response — missing lighthouseResult' });
    }

    /* ─── Step 10: extract categories ─── */
    const categories = lighthouseResult.categories;
    if (!categories) {
      return sendJson(502, { success: false, failedStep: 'Parse PageSpeed Data', error: 'Invalid PageSpeed API response — missing categories' });
    }

    /* ─── Step 11: calculate scores ─── */
    const toScore = function(cat, label) {
      if (!cat) return null;
      let rawScore = cat.score;
      if (typeof rawScore === 'string') rawScore = Number(rawScore);
      if (typeof rawScore !== 'number' || isNaN(rawScore)) return null;
      return Math.round(rawScore * 100);
    };
    const performance = toScore(categories.performance, 'performance');
    const seo = toScore(categories.seo, 'seo');
    const accessibility = toScore(categories.accessibility, 'accessibility');
    const bestPractices = toScore(categories['best-practices'], 'best-practices');

    /* ─── Step 12: compute overall score ─── */
    const scoreVals = [performance, seo, accessibility, bestPractices].filter(function (s) { return s !== null; });
    const overallScore = scoreVals.length > 0
      ? Math.round(scoreVals.reduce(function (a, b) { return a + b; }, 0) / scoreVals.length)
      : null;

    /* ─── Step 13: build raw categories map ─── */
    var rawCategories = {};
    try {
      Object.keys(categories).forEach(function (key) {
        rawCategories[key] = {
          id: categories[key].id,
          title: categories[key].title,
          score: categories[key].score
        };
      });
    } catch (e) {
      console.log("[AuditAPI] Could not build rawCategories:", e.message);
    }

    /* ─── Step 14: return success ─── */
    console.log("[AuditAPI] Success. Overall:", overallScore, "SEO:", seo, "Perf:", performance, "Access:", accessibility, "BP:", bestPractices);
    return sendJson(200, {
      success: true,
      overallScore: overallScore,
      performance: performance,
      seo: seo,
      accessibility: accessibility,
      bestPractices: bestPractices,
      scores: {
        performance: performance,
        seo: seo,
        accessibility: accessibility,
        bestPractices: bestPractices
      },
      categories: rawCategories,
      googleConfigSettings: data.lighthouseResult?.configSettings,
      googleCategoriesKeys: Object.keys(data.lighthouseResult?.categories || {})
    });

  } catch (err) {
    /* ════════════════════════════════════════════════════════
       UNHANDLED ERROR — Log everything and return real message
       ════════════════════════════════════════════════════════ */
    console.error('[AuditAPI] ========== UNHANDLED ERROR ==========');
    console.error('[AuditAPI] Message:', err.message);
    console.error('[AuditAPI] Stack:', err.stack);
    console.error('[AuditAPI] Request body:', JSON.stringify(req.body));
    console.error('[AuditAPI] Google API URL (key hidden):', apiUrl ? apiUrl.replace(/key=[^&]+/, 'key=***') : '(not built yet)');
    console.error('[AuditAPI] Google response status:', googleResponseStatus);
    console.error('[AuditAPI] Google error body:', googleErrorBody);
    console.error('[AuditAPI] =====================================');

    return sendJson(500, {
      success: false,
      error: err.message || 'Internal server error',
      details: err.stack || '',
      failedStep: 'Unhandled Error'
    });
  }
};
