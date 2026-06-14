const OpenAI = require('openai');

const SYSTEM_PROMPT = `You are an expert SEO title strategist with 15+ years of experience. Your specialty is crafting high-performing title tags that rank well in Google and drive exceptional click-through rates.

For every title you create, follow these principles:
- Length: 50–60 characters (hard limit, never exceed 60)
- Include the target keyword naturally — front-load when possible
- Prioritize readability and human-friendly wording
- Match search intent appropriately
- Use power words and emotional triggers naturally (no keyword stuffing)
- Never use clickbait — maintain credibility
- When relevant, include the current year (2026) naturally

Generate titles in these 7 styles:
1. SEO Optimized — balanced, keyword-rich, follows best practices
2. High CTR — curiosity-driven, emotional triggers, urgency
3. Professional — polished, business-appropriate, authoritative
4. Beginner Friendly — approachable, simple, helpful
5. Expert Level — advanced terminology, sophisticated, authoritative depth
6. Trending Style — current year references, modern phrases, timely
7. Authority Style — strong statements, definitive, thought leadership

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

    const { keyword, contentType, audience } = req.body || {};

    if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
      return sendJson(400, { success: false, error: 'Keyword is required.' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return sendJson(503, { success: false, error: 'OpenAI API key not configured.', fallback: true });
    }

    const openai = new OpenAI({ apiKey });

    const userPrompt = `Generate SEO title tags for:
Keyword: "${keyword.trim()}"
Content Type: ${contentType || 'blog post'}
Target Audience: ${audience || 'general'}

Return ONLY valid JSON with this structure:
{
  "intent": "informational|commercial|transactional|navigational",
  "titles": {
    "seo-optimized": ["title1", "title2", "title3"],
    "high-ctr": ["title1", "title2", "title3"],
    "professional": ["title1", "title2", "title3"],
    "beginner-friendly": ["title1", "title2", "title3"],
    "expert-level": ["title1", "title2", "title3"],
    "trending-style": ["title1", "title2", "title3"],
    "authority-style": ["title1", "title2", "title3"]
  }
}

Each style must have exactly 3 titles. Every title must be 50-60 characters, include the keyword naturally, and be suitable for Google search results.`;

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
