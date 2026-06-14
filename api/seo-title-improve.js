const OpenAI = require('openai');

const LANGUAGE_MAP = {
  en: 'English', fr: 'French', es: 'Spanish', de: 'German',
  ar: 'Arabic', pt: 'Portuguese', it: 'Italian', nl: 'Dutch'
};

const SYSTEM_PROMPT = `You are an expert multilingual SEO title strategist and copywriter with 15+ years of experience. Your specialty is transforming weak titles into high-performing SEO title tags that rank well and drive exceptional click-through rates across multiple languages.

Analyze titles across these dimensions:
1. SEO Optimization — keyword placement, relevance, front-loading
2. Keyword Placement — natural integration vs stuffing
3. Title Length — ideal 50-60 characters for full SERP display
4. Readability — clarity, simplicity, natural language flow
5. Power Words — emotional triggers and authority signals
6. Numbers Usage — specific digits for CTR boost
7. CTR Potential — curiosity gaps, emotional hooks, urgency

Improvement Modes:
- "seo-optimized" — Balanced SEO best practices with keyword focus
- "high-ctr" — Maximize click-through rate with curiosity and emotional triggers
- "professional" — Polished, business-appropriate, authoritative tone
- "authority" — Strong definitive statements, thought leadership
- "beginner-friendly" — Approachable, simple, helpful for newcomers
- "trending" — Current year references, modern phrases, timely

Rules:
- Every title must be 50-60 characters (hard limit)
- Include the target keyword naturally
- Front-load keyword when possible
- No clickbait — maintain credibility
- When relevant, use current year naturally
- Generate exactly 1 best improved version + 3 alternative improvements
- Always improve titles IN THE SAME LANGUAGE as the original title — never translate to English`;

module.exports = async function handler(req, res) {
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
        console.error('[SEOTitleImproveAPI] CRITICAL: cannot send response:', e2.message);
      }
    }
  }

  try {
    if (req.method !== 'POST') {
      return sendJson(405, { success: false, error: 'Method not allowed. Use POST.' });
    }

    const { title, keyword, mode, language } = req.body || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return sendJson(400, { success: false, error: 'Original title is required.' });
    }
    if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
      return sendJson(400, { success: false, error: 'Keyword is required.' });
    }

    const langCode = language && LANGUAGE_MAP[language] ? language : 'en';
    const langName = LANGUAGE_MAP[langCode] || 'English';

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return sendJson(503, { success: false, error: 'OpenAI API key not configured.', fallback: true });
    }

    const validModes = ['seo-optimized', 'high-ctr', 'professional', 'authority', 'beginner-friendly', 'trending'];
    const improvementMode = validModes.includes(mode) ? mode : 'seo-optimized';

    const openai = new OpenAI({ apiKey });

    const userPrompt = `Improve this SEO title in ${langName}:
Original Title: "${title.trim()}"
Target Keyword: "${keyword.trim()}"
Improvement Mode: ${improvementMode}
Language: ${langName} (${langCode})

IMPORTANT: All titles and explanations MUST be written in ${langName}, not English. Keep the same language as the original title.

Return ONLY valid JSON with this structure:
{
  "best": {
    "title": "The single best improved version in ${langName}",
    "changes": "Brief explanation in ${langName} of what was changed and why",
    "seo_score_before": 45,
    "seo_score_after": 82,
    "char_count_before": 12,
    "char_count_after": 55,
    "ctr_improvement": "+42%",
    "readability_improvement": "Description in ${langName}",
    "power_words_added": ["word1", "word2"],
    "keywords_placed": ["keyword1", "keyword2"],
    "suggestions": [
      "Suggestion in ${langName}",
      "Suggestion in ${langName}"
    ]
  },
  "alternatives": [
    {
      "title": "Alternative improved version 1 in ${langName}",
      "changes": "Brief explanation in ${langName}",
      "seo_score_after": 78,
      "mode": "high-ctr"
    },
    {
      "title": "Alternative improved version 2 in ${langName}",
      "changes": "Brief explanation in ${langName}",
      "seo_score_after": 80,
      "mode": "professional"
    },
    {
      "title": "Alternative improved version 3 in ${langName}",
      "changes": "Brief explanation in ${langName}",
      "seo_score_after": 85,
      "mode": "authority"
    }
  ],
  "analytics": {
    "seo_score": 82,
    "ctr_score": 78,
    "power_word_score": 85,
    "readability_score": 90
  },
  "suggestions": [
    "Suggestion in ${langName}",
    "Suggestion in ${langName}",
    "Suggestion in ${langName}"
  ]
}

IMPORTANT: Every title must be between 50-60 characters. Include the keyword naturally. ALL text must be in ${langName}.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1500
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return sendJson(502, { success: false, error: 'Empty response from OpenAI.', fallback: true });
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      return sendJson(502, { success: false, error: 'Invalid JSON from OpenAI.', fallback: true, raw: content });
    }

    if (!result.best || !result.best.title) {
      return sendJson(502, { success: false, error: 'Missing best improved title in AI response.', fallback: true, raw: result });
    }

    return sendJson(200, { success: true, mode: improvementMode, ...result });

  } catch (err) {
    console.error('[SEOTitleImproveAPI] Unhandled error:', err.message, err.stack);
    return sendJson(500, { success: false, error: err.message || 'Internal server error', fallback: true });
  }
};
