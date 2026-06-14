const OpenAI = require('openai');

const LANGUAGE_MAP = {
  en: 'English', fr: 'French', es: 'Spanish', de: 'German',
  ar: 'Arabic', pt: 'Portuguese', it: 'Italian', nl: 'Dutch'
};

const SYSTEM_PROMPT = `You are an expert multilingual SEO title strategist with 15+ years of experience. Your specialty is crafting high-performing title tags in multiple languages that rank well in Google and drive exceptional click-through rates.

For every title you create, follow these principles:
- Length: 50–60 characters (hard limit, never exceed 60)
- Include the target keyword naturally — front-load when possible
- Prioritize readability and human-friendly wording
- Match search intent appropriately
- Use power words and emotional triggers naturally (no keyword stuffing)
- Never use clickbait — maintain credibility
- When relevant, include the current year naturally
- Generate titles in the user's selected language using natural, native phrasing
- Adapt title structure to language-specific SEO conventions (e.g., front-loading keywords works differently in French/Spanish vs English)

Generate titles in these 10 styles:
1. List — list-style titles (e.g. "X Ways to...", "X Tips for...")
2. Number — starts with a specific number for higher CTR (e.g. "7 Proven...", "5 Essential...")
3. How-To — instructional, step-by-step guidance (e.g. "How to...")
4. Question — phrased as a question the user is asking
5. Power Word — uses strong emotional/trigger words (Ultimate, Essential, Proven, etc.)
6. Beginner-Friendly — approachable, simple, helpful for newcomers
7. Professional — polished, business-appropriate, authoritative
8. High CTR — curiosity-driven, emotional triggers, urgency
9. Trending — current year references, modern phrases, timely
10. Authority — strong statements, definitive, thought leadership

Also detect the search intent of the keyword: informational, commercial, transactional, or navigational.`;

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
        console.error('[SEOTitlesAPI] CRITICAL: cannot send response:', e2.message);
      }
    }
  }

  try {
    if (req.method !== 'POST') {
      return sendJson(405, { success: false, error: 'Method not allowed. Use POST.' });
    }

    const { keyword, contentType, audience, language } = req.body || {};

    if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
      return sendJson(400, { success: false, error: 'Keyword is required.' });
    }

    const langCode = language && LANGUAGE_MAP[language] ? language : 'en';
    const langName = LANGUAGE_MAP[langCode] || 'English';

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return sendJson(503, { success: false, error: 'OpenAI API key not configured.', fallback: true });
    }

    const openai = new OpenAI({ apiKey });

    const userPrompt = `Generate SEO title tags in ${langName}:
Keyword: "${keyword.trim()}"
Content Type: ${contentType || 'blog post'}
Target Audience: ${audience || 'general'}
Language: ${langName} (${langCode})

IMPORTANT: All titles MUST be written in ${langName}, not English. Use natural, native phrasing that would appeal to ${langName} speakers. Adapt the title structure to ${langName} SEO conventions.

Return ONLY valid JSON with this structure:
{
  "intent": "informational|commercial|transactional|navigational",
  "titles": {
    "list": ["title1", "title2", "title3"],
    "number": ["title1", "title2", "title3"],
    "how-to": ["title1", "title2", "title3"],
    "question": ["title1", "title2", "title3"],
    "power-word": ["title1", "title2", "title3"],
    "beginner-friendly": ["title1", "title2", "title3"],
    "professional": ["title1", "title2", "title3"],
    "high-ctr": ["title1", "title2", "title3"],
    "trending": ["title1", "title2", "title3"],
    "authority": ["title1", "title2", "title3"]
  }
}

Each style must have exactly 3 titles. Every title must be 50-60 characters, include the keyword naturally, be written in ${langName}, and be suitable for Google search results.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
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

    if (!result.titles || typeof result.titles !== 'object') {
      return sendJson(502, { success: false, error: 'Missing titles in AI response.', fallback: true, raw: result });
    }

    return sendJson(200, { success: true, intent: result.intent || 'informational', titles: result.titles });

  } catch (err) {
    console.error('[SEOTitlesAPI] Unhandled error:', err.message, err.stack);
    return sendJson(500, { success: false, error: err.message || 'Internal server error', fallback: true });
  }
};
