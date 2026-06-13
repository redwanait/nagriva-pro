console.log("FILE LOADED");

module.exports = async function handler(req, res) {
  console.log("HANDLER STARTED");

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

  /* ─── Step 0: method check ─── */
  console.log("Request received — method: " + req.method);
  try {
    if (req.method !== 'POST') {
      return sendJson(405, { success: false, failedStep: 'Method Check', error: 'Method not allowed', detail: 'Only POST is accepted, got: ' + req.method });
    }
  } catch (e) {
    return sendJson(500, { success: false, failedStep: 'Method Check', error: e.message, stack: e.stack });
  }

  /* ─── Step 1: parse body ─── */
  console.log("Parsing request body");
  let url;
  try {
    url = (req.body && req.body.url) || '';
    console.log("URL from body: \"" + url + "\"");
  } catch (e) {
    return sendJson(500, { success: false, failedStep: 'Parse Body', error: e.message, stack: e.stack });
  }

  if (!url || typeof url !== 'string' || !url.trim()) {
    return sendJson(400, { success: false, failedStep: 'URL Validation', error: 'URL is required', detail: 'No url field in request body' });
  }

  /* ─── Step 2: validate URL ─── */
  console.log("Validating URL");
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    console.log("URL validated — protocol: " + parsedUrl.protocol + " host: " + parsedUrl.host);
  } catch (e) {
    return sendJson(400, { success: false, failedStep: 'URL Validation', error: 'Invalid URL format', detail: e.message });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return sendJson(400, { success: false, failedStep: 'URL Validation', error: 'Invalid URL protocol', detail: 'Must be http or https, got: ' + parsedUrl.protocol });
  }

  /* ─── Step 3: check environment ─── */
  console.log("Checking environment variables");
  try {
    console.log("process.env.PAGESPEED_API_KEY exists: " + (!!process.env.PAGESPEED_API_KEY));
    console.log("process.env.PAGESPEED_API_KEY length: " + (process.env.PAGESPEED_API_KEY ? process.env.PAGESPEED_API_KEY.length : 0));
    console.log("All process.env keys: " + Object.keys(process.env).join(', '));
  } catch (e) {
    return sendJson(500, { success: false, failedStep: 'Environment Check', error: e.message, stack: e.stack });
  }

  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) {
    console.log("API key found: false");
    return sendJson(500, { success: false, failedStep: 'Environment Check', error: 'API Key Missing', detail: 'PAGESPEED_API_KEY environment variable is not set' });
  }
  console.log("API key found: true (first 4 chars: " + apiKey.substring(0, 4) + ")");

  /* ─── Step 4: build PageSpeed URL ─── */
  console.log("Building PageSpeed request URL");
  let apiUrl;
  try {
    apiUrl = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=' + encodeURIComponent(url) + '&key=' + apiKey + '&strategy=mobile';
    console.log("PageSpeed URL built");
  } catch (e) {
    return sendJson(500, { success: false, failedStep: 'Build PageSpeed URL', error: e.message, stack: e.stack });
  }

  /* ─── Step 5: check fetch availability ─── */
  console.log("Checking fetch availability");
  try {
    console.log("typeof fetch: " + (typeof fetch));
    console.log("typeof globalThis.fetch: " + (typeof globalThis.fetch));
    if (typeof fetch === 'undefined') {
      return sendJson(500, { success: false, failedStep: 'Fetch Check', error: 'fetch() is not available', detail: 'Node.js version does not support global fetch. Check Vercel runtime version.' });
    }
  } catch (e) {
    return sendJson(500, { success: false, failedStep: 'Fetch Check', error: e.message, stack: e.stack });
  }

  /* ─── Step 6: send request to Google PageSpeed API ─── */
  console.log("Sending request to Google PageSpeed API");
  let response;
  try {
    response = await fetch(apiUrl);
    console.log("Google response received — status: " + response.status + " " + response.statusText);
  } catch (e) {
    console.log("fetch() threw: " + e.message);
    return sendJson(502, { success: false, failedStep: 'PageSpeed Request', error: 'PageSpeed API Unreachable', detail: e.message, stack: e.stack });
  }

  /* ─── Step 7: parse response ─── */
  console.log("Parsing PageSpeed response");
  let data;
  try {
    data = await response.json();
    console.log("Response parsed as JSON successfully");
    console.log(
      'GOOGLE RAW CATEGORIES',
      JSON.stringify(
        data?.lighthouseResult?.categories,
        null,
        2
      )
    );
    console.log(
      'GOOGLE CATEGORY KEYS',
      Object.keys(
        data?.lighthouseResult?.categories || {}
      )
    );
  } catch (e) {
    let text = '';
    try { text = await response.text(); } catch (e2) {}
    console.log("Failed to parse JSON. Status: " + response.status + " Body: " + text.substring(0, 500));
    return sendJson(502, {
      success: false,
      failedStep: 'Parse PageSpeed Response',
      error: 'Invalid JSON from PageSpeed API',
      detail: 'HTTP ' + response.status + ' — Body preview: ' + text.substring(0, 200)
    });
  }

  /* ─── Step 8: check response status ─── */
  console.log("Checking response status");
  if (!response.ok) {
    const googleMsg = (data && data.error && (data.error.message || data.error.status)) || 'HTTP ' + response.status;
    const googleCode = (data && data.error && data.error.code) || response.status;
    console.log("PageSpeed API error: " + googleMsg + " (code: " + googleCode + ")");

    if (response.status === 403 || googleCode === 403) {
      return sendJson(502, { success: false, failedStep: 'PageSpeed API Error', error: 'PageSpeed API Quota Exceeded', detail: 'Google returned 403: ' + googleMsg });
    }
    if (response.status === 429) {
      return sendJson(502, { success: false, failedStep: 'PageSpeed API Error', error: 'PageSpeed API Quota Exceeded', detail: 'Google returned 429: ' + googleMsg });
    }
    return sendJson(502, { success: false, failedStep: 'PageSpeed API Error', error: 'PageSpeed API Request Failed', detail: 'HTTP ' + response.status + ': ' + googleMsg });
  }
  console.log("PageSpeed API response is OK");

  /* ─── Step 9: extract lighthouse data ─── */
  console.log("Generating audit — extracting lighthouseResult");
  let lighthouseResult;
  try {
    lighthouseResult = data.lighthouseResult;
    if (!lighthouseResult) {
      return sendJson(502, { success: false, failedStep: 'Parse PageSpeed Data', error: 'Invalid PageSpeed API Response', detail: 'Response missing lighthouseResult' });
    }
    console.log("lighthouseResult found");
  } catch (e) {
    return sendJson(500, { success: false, failedStep: 'Parse Lighthouse Result', error: e.message, stack: e.stack });
  }

  /* ─── Step 10: extract categories ─── */
  console.log("Extracting categories");
  let categories;
  try {
    categories = lighthouseResult.categories;
    if (!categories) {
      return sendJson(502, { success: false, failedStep: 'Parse PageSpeed Data', error: 'Invalid PageSpeed API Response', detail: 'Response missing categories' });
    }
    console.log('RAW CATEGORIES', JSON.stringify(data.lighthouseResult.categories, null, 2));
    console.log('CATEGORY KEYS', Object.keys(data.lighthouseResult.categories));
  } catch (e) {
    return sendJson(500, { success: false, failedStep: 'Extract Categories', error: e.message, stack: e.stack });
  }

  /* ─── Step 11: calculate scores ─── */
  console.log("Calculating scores");
  let performance, seo, accessibility, bestPractices;
  try {
    console.log("ALL CATEGORIES", categories);
    console.log("PERFORMANCE CATEGORY", categories.performance);
    console.log("SEO CATEGORY", categories.seo);
    console.log("ACCESSIBILITY CATEGORY", categories.accessibility);
    console.log("BEST PRACTICES CATEGORY", categories['best-practices']);
    const toScore = function(cat, label) {
      if (!cat) {
        console.log("toScore(" + label + "): cat is", cat, "→ returning null", "(full cat was:", JSON.stringify(cat) + ")");
        return null;
      }
      var rawScore = cat.score;
      console.log("toScore(" + label + "): full object =", JSON.stringify(cat));
      if (typeof rawScore === 'string') {
        console.log("toScore(" + label + "): score is a string, converting via Number()");
        rawScore = Number(rawScore);
      }
      if (typeof rawScore !== 'number' || isNaN(rawScore)) {
        console.log("toScore(" + label + "): cat.score is", cat.score, "(type " + typeof cat.score + ", rawScore=" + rawScore + ") → returning null");
        return null;
      }
      var result = Math.round(rawScore * 100);
      console.log("toScore(" + label + "): cat.score =", cat.score, "→", result);
      return result;
    };
    performance = toScore(categories.performance, 'performance');
    seo = toScore(categories.seo, 'seo');
    accessibility = toScore(categories.accessibility, 'accessibility');
    bestPractices = toScore(categories['best-practices'], 'best-practices');
  } catch (e) {
    return sendJson(500, { success: false, failedStep: 'Calculate Scores', error: e.message, stack: e.stack });
  }

  /* ─── Step 12: compute overall ─── */
  console.log("Computing overall score");
  let overallScore;
  try {
    const scoreVals = [performance, seo, accessibility, bestPractices].filter(function (s) { return s !== null; });
    overallScore = scoreVals.length > 0
      ? Math.round(scoreVals.reduce(function (a, b) { return a + b; }, 0) / scoreVals.length)
      : null;
    console.log("Overall score: " + overallScore);
  } catch (e) {
    return sendJson(500, { success: false, failedStep: 'Compute Overall Score', error: e.message, stack: e.stack });
  }

  /* ─── Step 13: build raw categories map for debugging ─── */
  var rawCategories = {};
  try {
    Object.keys(categories).forEach(function (key) {
      rawCategories[key] = {
        id: categories[key].id,
        title: categories[key].title,
        score: categories[key].score
      };
    });
    console.log("Raw categories for debug:", JSON.stringify(rawCategories));
  } catch (e) {
    console.log("Could not build rawCategories:", e.message);
  }

  /* ─── Step 14: return response ─── */
  console.log("=== FINAL SCORES OBJECT ===");
  console.log(JSON.stringify({
    seo: seo,
    performance: performance,
    accessibility: accessibility,
    bestPractices: bestPractices,
    overall: overallScore
  }, null, 2));
  console.log("===========================");

  console.log("Returning response — 200 OK");
  try {
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
  } catch (e) {
    return sendJson(500, { success: false, failedStep: 'Send Response', error: e.message, stack: e.stack });
  }
};
