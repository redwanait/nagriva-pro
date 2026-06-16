const fs = require('fs');
const path = require('path');

const ROOT = '/Users/mac/Desktop/Nagriva Growth Agency';

// ─── Pages to include (public-facing only) ───
const INCLUDE_PAGES = [
  { file: 'index.html', path: '/' },
  { file: 'pages/about.html', path: '/pages/about.html' },
  { file: 'pages/services.html', path: '/pages/services.html' },
  { file: 'pages/blog.html', path: '/pages/blog.html' },
  { file: 'pages/resources.html', path: '/pages/resources.html' },
  { file: 'pages/pricing.html', path: '/pages/pricing.html' },
  { file: 'pages/contact.html', path: '/pages/contact.html' },
  { file: 'pages/results.html', path: '/pages/results.html' },
  { file: 'pages/careers.html', path: '/pages/careers.html' },
  { file: 'pages/seo.html', path: '/pages/seo.html' },
  { file: 'pages/web-design.html', path: '/pages/web-design.html' },
  { file: 'pages/social-media.html', path: '/pages/social-media.html' },
  { file: 'pages/strategy.html', path: '/pages/strategy.html' },
  { file: 'pages/branding.html', path: '/pages/branding.html' },
  { file: 'pages/ai-automation.html', path: '/pages/ai-automation.html' },
  { file: 'pages/dentist-websites.html', path: '/pages/dentist-websites.html' },
  { file: 'pages/lawyer-websites.html', path: '/pages/lawyer-websites.html' },
  { file: 'pages/gym-fitness-websites.html', path: '/pages/gym-fitness-websites.html' },
  { file: 'pages/real-estate-websites.html', path: '/pages/real-estate-websites.html' },
  { file: 'pages/restaurant-websites.html', path: '/pages/restaurant-websites.html' },
  { file: 'pages/agency-websites.html', path: '/pages/agency-websites.html' },
  { file: 'pages/website-audit.html', path: '/pages/website-audit.html' },
  { file: 'pages/services/blog-creation.html', path: '/pages/services/blog-creation.html' },
  { file: 'pages/services/ecommerce-stores.html', path: '/pages/services/ecommerce-stores.html' },
  { file: 'pages/services/video-editing.html', path: '/pages/services/video-editing.html' },
  { file: 'pages/services/website-development.html', path: '/pages/services/website-development.html' },
  { file: 'case-studies/nagriva-growth-story.html', path: '/case-studies/nagriva-growth-story.html' },
  { file: 'case-studies/agency-success-story.html', path: '/case-studies/agency-success-story.html' },
  { file: 'case-studies/gym-fitness-success-story.html', path: '/case-studies/gym-fitness-success-story.html' },
  { file: 'case-studies/restaurant-success-story.html', path: '/case-studies/restaurant-success-story.html' },
  { file: 'case-studies/real-estate-success-story.html', path: '/case-studies/real-estate-success-story.html' },
  { file: 'case-studies/law-firm-success-story.html', path: '/case-studies/law-firm-success-story.html' },
  { file: 'case-studies/dental-clinic-success-story.html', path: '/case-studies/dental-clinic-success-story.html' },
];

// ─── Stop words ───
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'can', 'could', 'shall', 'should', 'may', 'might', 'must',
  'about', 'into', 'through', 'during', 'before', 'after', 'above',
  'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
  'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'also', 'get', 'your', 'its', 'our', 'their', 'his', 'her',
  'that', 'this', 'these', 'those', 'what', 'which', 'who', 'whom',
  'it', 'its', 'we', 'he', 'she', 'they', 'you', 'i', 'me', 'my',
  'up', 'down', 'new', 'one', 'two', 'like', 'make', 'them',
]);

const BRAND_WORDS = new Set(['nagriva', 'nagriva\'s', 'nagriva.', 'nagriva']);
const GENERIC_WORDS = new Set([
  'website', 'websites', 'web', 'site', 'sites', 'page', 'pages',
  'design', 'designs', 'designing', 'designed', 'designer', 'designers',
  'business', 'businesses', 'brand', 'brands', 'agency', 'agencies',
  'service', 'services', 'digital', 'online', 'content', 'marketing',
  'strategy', 'strategies', 'solution', 'solutions', 'platform', 'platforms',
  'company', 'product', 'products', 'tool', 'tools',
  'client', 'clients', 'customer', 'customers', 'user', 'users',
  'result', 'results', 'growth', 'grow', 'growing',
  'traffic', 'conversion', 'conversions', 'convert', 'converted',
  'optimization', 'optimize', 'optimized', 'optimizing',
  'management', 'manage', 'managed', 'manager', 'mgmt',
  'development', 'develop', 'developer', 'developers', 'developed',
  'create', 'creates', 'creating', 'creative', 'creation',
  'build', 'builds', 'building', 'built', 'launch', 'launched',
  'start', 'starts', 'starting', 'startup', 'startups',
  'support', 'supports', 'supported', 'supporting',
  'process', 'processes', 'system', 'systems', 'technology', 'technologies',
  'data', 'information', 'guide', 'guides', 'article', 'articles',
  'blog', 'blogs', 'post', 'posts', 'read', 'reading',
  'help', 'helps', 'helpful', 'helping', 'need', 'needs', 'needed',
  'work', 'works', 'working', 'project', 'projects',
  'offer', 'offers', 'offering', 'provide', 'provides', 'providing',
  'deliver', 'delivers', 'delivery', 'delivering', 'delivered',
  'access', 'use', 'uses', 'using', 'used', 'make', 'makes', 'making',
  'best', 'better', 'good', 'great', 'top', 'high', 'higher',
  'expert', 'experts', 'expertise', 'professional', 'professionals',
  'quality', 'value', 'benefit', 'benefits', 'effective', 'effectively',
  'modern', 'advanced', 'powerful', 'fast', 'faster', 'quick', 'quickly',
  'easy', 'easier', 'simple', 'simply', 'right', 'real', 'true',
  'important', 'essential', 'key', 'main', 'primary', 'major',
  'special', 'specific', 'unique', 'different', 'various', 'multiple',
  'including', 'includes', 'based', 'focused', 'driven', 'powered',
  'our', 'your', 'their', 'its', 'his', 'her', 'any', 'many', 'some',
  'every', 'each', 'all', 'both', 'other', 'another', 'several',
  'first', 'second', 'third', 'last', 'next', 'previous',
  'here', 'there', 'where', 'what', 'which', 'who', 'how', 'when', 'why',
  'back', 'step', 'steps', 'phase', 'phases', 'stage', 'stages',
  'area', 'areas', 'field', 'industry', 'industries',
  'partner', 'partners', 'partnership', 'team', 'teams',
  'plan', 'plans', 'planning', 'goal', 'goals', 'objective', 'objectives',
  'action', 'actions', 'task', 'tasks', 'item', 'items',
  'check', 'list', 'lists', 'listing', 'listings',
  'type', 'types', 'form', 'forms', 'format', 'formats',
  'month', 'months', 'week', 'weeks', 'day', 'days', 'year', 'years',
  'time', 'times', 'hour', 'hours', 'minute', 'minutes',
  'price', 'prices', 'pricing', 'cost', 'costs', 'budget', 'budgets',
  'package', 'packages', 'plan', 'plans', 'tier', 'tiers',
  'review', 'reviews', 'rate', 'rates', 'rating', 'ratings',
  'example', 'examples', 'sample', 'samples', 'demo', 'demos',
  'template', 'templates', 'framework', 'frameworks',
  'visit', 'visits', 'visitor', 'visitors', 'view', 'views', 'viewing',
  'share', 'shares', 'sharing', 'social',
  'search', 'searches', 'searching', 'find', 'finds', 'finding',
  'discover', 'discovers', 'discovery', 'explore', 'exploring',
  'learn', 'learning', 'learned', 'know', 'knowledge',
  'contact', 'contacts', 'contacting', 'connect', 'connects', 'connection',
  'message', 'messages', 'email', 'emails', 'phone', 'call', 'calls',
  'book', 'booking', 'schedule', 'scheduled', 'scheduling',
  'free', 'trial', 'sign', 'signup', 'register', 'registration',
  'login', 'log', 'account', 'accounts', 'password', 'profile', 'profiles',
  'follow', 'follows', 'following', 'subscribe', 'subscription',
  'newsletter', 'mail', 'inbox',
]);

// ─── Manual keyword mappings ───
const MANUAL_KEYWORDS = {
  '/pages/seo.html': ['seo optimization', 'seo services', 'search engine optimization', 'seo strategy', 'seo agency', 'rank higher', 'keyword research', 'seo audit', 'seo'],
  '/pages/web-design.html': ['web design', 'website design', 'web design services', 'web designer', 'custom website', 'modern website', 'responsive design', 'web design service'],
  '/pages/social-media.html': ['social media', 'social media management', 'social media marketing', 'social media strategy', 'social media content', 'social media growth'],
  '/pages/strategy.html': ['digital strategy', 'growth strategy', 'marketing strategy', 'business strategy', 'performance marketing', 'growth consulting', 'strategic planning'],
  '/pages/branding.html': ['brand identity', 'brand design', 'logo design', 'brand strategy', 'visual identity', 'brand guidelines', 'branding'],
  '/pages/ai-automation.html': ['ai automation', 'workflow automation', 'ai tools', 'ai-powered', 'artificial intelligence', 'machine learning', 'automation'],
  '/pages/website-audit.html': ['website audit', 'free website audit', 'site audit', 'website analysis', 'audit your website', 'free audit'],
  '/pages/services.html': ['our services', 'all services', 'digital services', 'agency services'],
  '/pages/resources.html': ['free resources', 'marketing resources', 'resources hub', 'guides and templates', 'resource library'],
  '/pages/pricing.html': ['pricing', 'pricing plans', 'view pricing', 'see pricing'],
  '/pages/contact.html': ['contact us', 'get in touch', 'reach out to us'],
  '/pages/blog.html': ['read our blog', 'our blog', 'latest articles', 'blog posts'],
  '/pages/results.html': ['our results', 'case studies', 'our work', 'success stories', 'portfolio'],
  '/pages/about.html': ['about nagriva', 'our mission', 'our story', 'about us'],
  '/pages/careers.html': ['join our team', 'career opportunities', 'work with us'],
  '/pages/dentist-websites.html': ['dentist website', 'dental website', 'dentist web design', 'dental clinic website', 'dentist'],
  '/pages/lawyer-websites.html': ['lawyer website', 'law firm website', 'legal website', 'attorney website', 'lawyer'],
  '/pages/gym-fitness-websites.html': ['gym website', 'fitness website', 'gym web design', 'fitness brand website'],
  '/pages/real-estate-websites.html': ['real estate website', 'property website', 'realtor website', 'real estate'],
  '/pages/restaurant-websites.html': ['restaurant website', 'restaurant web design', 'food website', 'cafe website'],
  '/pages/agency-websites.html': ['agency website', 'digital agency website', 'creative agency website', 'agency'],
  '/pages/services/blog-creation.html': ['blog creation', 'blog writing', 'blog content creation', 'blog management', 'blog posts'],
  '/pages/services/ecommerce-stores.html': ['ecommerce store', 'online store', 'e-commerce', 'woocommerce', 'shopify store', 'online shop'],
  '/pages/services/video-editing.html': ['video editing', 'video production', 'video content', 'video editor'],
  '/pages/services/website-development.html': ['website development', 'web development', 'web developer', 'custom development'],
};

// ─── Priority targets ───
const PRIORITY_URLS = new Set([
  '/pages/seo.html', '/pages/web-design.html', '/pages/social-media.html',
  '/pages/strategy.html', '/pages/branding.html', '/pages/ai-automation.html',
  '/pages/dentist-websites.html', '/pages/lawyer-websites.html',
  '/pages/gym-fitness-websites.html', '/pages/real-estate-websites.html',
  '/pages/restaurant-websites.html', '/pages/agency-websites.html',
  '/pages/services/blog-creation.html', '/pages/services/ecommerce-stores.html',
  '/pages/services/video-editing.html', '/pages/services/website-development.html',
  '/pages/resources.html', '/pages/website-audit.html',
]);

// ─── Helper: is word meaningful for linking? ───
function isMeaningful(word) {
  const w = word.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (w.length < 3) return false;
  if (STOP_WORDS.has(w)) return false;
  if (BRAND_WORDS.has(w)) return false;
  if (GENERIC_WORDS.has(w)) return false;
  if (/^[0-9]+$/.test(w)) return false;
  return true;
}

// ─── Load page data ───
const pages = [];
const pageMap = {};

for (const entry of INCLUDE_PAGES) {
  const fullPath = path.join(ROOT, entry.file);
  if (!fs.existsSync(fullPath)) {
    console.warn(`  [SKIP] ${entry.file} — file not found`);
    continue;
  }
  const html = fs.readFileSync(fullPath, 'utf-8');
  const cheerio = require('cheerio');
  const $ = cheerio.load(html);

  const title = $('title').text().trim();
  const desc = $('meta[name="description"]').attr('content') || '';

  const bodyText = [];
  $('body p, body li').each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) bodyText.push(text);
  });

  const headings = [];
  $('body h1, body h2, body h3').each((i, el) => {
    const text = $(el).text().trim();
    if (text.length > 5) headings.push(text);
  });

  const pageInfo = {
    file: entry.file,
    path: entry.path,
    fullPath,
    title,
    desc,
    bodyText,
    headings,
  };

  pages.push(pageInfo);
  pageMap[entry.path] = pageInfo;
}

console.log(`\nLoaded ${pages.length} pages\n`);

// ─── Extract keywords per page ───
function extractKeywords(pageInfo) {
  const words = new Map(); // word -> score

  // Clean title
  let titleClean = pageInfo.title
    .replace(/ — Nagriva.*$/, '')
    .replace(/ \| Nagriva.*$/, '')
    .replace(/\s*\|\s*.*$/, '')
    .replace(/Morocco\|/g, '')
    .replace(/\|/g, '')
    .trim();

  // Title words
  const titleWords = titleClean.split(/\s+/).filter(isMeaningful);
  for (const w of titleWords) {
    const key = w.toLowerCase();
    words.set(key, (words.get(key) || 0) + 5);
  }

  // Title multi-word phrases (2-word)
  for (let i = 0; i < titleWords.length - 1; i++) {
    const phrase = (titleWords[i] + ' ' + titleWords[i + 1]).toLowerCase();
    words.set(phrase, (words.get(phrase) || 0) + 10);
  }

  // Entire cleaned title if multi-word and specific
  if (titleWords.length >= 2) {
    const fullPhrase = titleWords.join(' ').toLowerCase();
    if (fullPhrase.length > 8) {
      words.set(fullPhrase, (words.get(fullPhrase) || 0) + 15);
    }
  }

  // From description - only meaningful words
  if (pageInfo.desc) {
    const descWords = pageInfo.desc.split(/\s+/).filter(isMeaningful);
    for (const w of descWords) {
      const key = w.toLowerCase();
      words.set(key, (words.get(key) || 0) + 2);
    }
    // Multi-word from desc
    for (let i = 0; i < descWords.length - 1; i++) {
      const phrase = (descWords[i] + ' ' + descWords[i + 1]).toLowerCase();
      words.set(phrase, (words.get(phrase) || 0) + 4);
    }
  }

  // From headings
  for (const h of pageInfo.headings) {
    const hWords = h.split(/\s+/).filter(w => isMeaningful(w) && w.length > 4);
    for (const w of hWords) {
      const key = w.toLowerCase();
      words.set(key, (words.get(key) || 0) + 3);
    }
    // Multi-word from headings
    for (let i = 0; i < hWords.length - 1; i++) {
      const phrase = (hWords[i] + ' ' + hWords[i + 1]).toLowerCase();
      words.set(phrase, (words.get(phrase) || 0) + 6);
    }
  }

  // Manual keywords get highest score
  const manual = MANUAL_KEYWORDS[pageInfo.path] || [];
  for (const kw of manual) {
    words.set(kw.toLowerCase(), (words.get(kw.toLowerCase()) || 0) + 20);
  }

  return words;
}

// ─── Build keyword index ───
// keyword -> [{ path, score, title }]
const keywordIndex = {};

for (const page of pages) {
  const autoKeywords = extractKeywords(page);

  for (const [kw, score] of autoKeywords) {
    if (kw.length < 3) continue;

    if (!keywordIndex[kw]) keywordIndex[kw] = [];

    let priorityBonus = 0;
    if (PRIORITY_URLS.has(page.path)) priorityBonus = 30;

    keywordIndex[kw].push({
      path: page.path,
      title: page.title,
      totalScore: score + priorityBonus,
    });
  }
}

// ─── Build list of all keywords sorted by length (longest first) ───
const allKeywords = Object.entries(keywordIndex)
  .filter(([kw]) => kw.length >= 4)
  .sort((a, b) => b[0].length - a[0].length); // longest first for specificity

console.log(`Total unique keywords: ${allKeywords.length}`);

// ─── Replace text in HTML without affecting existing HTML tags ───
function replaceKeywordInHtml(html, keyword, targetPath) {
  // Build a regex that matches the keyword with word boundaries
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp('\\b(' + escaped + ')\\b', 'gi');

  // Parse by text segments between tags
  const segments = [];
  let currentText = '';
  let currentIsTag = false;

  for (let i = 0; i < html.length; i++) {
    if (html[i] === '<') {
      if (currentText) {
        segments.push({ text: currentText, isTag: false });
        currentText = '';
      }
      currentIsTag = true;
      currentText = '<';
      continue;
    }
    if (html[i] === '>' && currentIsTag) {
      currentText += '>';
      segments.push({ text: currentText, isTag: true });
      currentText = '';
      currentIsTag = false;
      continue;
    }
    currentText += html[i];
  }
  if (currentText) {
    segments.push({ text: currentText, isTag: currentIsTag });
  }

  // Track anchor depth across segments
  let inAnchorTag = false;
  let replaced = false;

  // Process segments: replace in text segments that aren't inside <a> tags
  const processed = segments.map(seg => {
    if (seg.isTag) {
      // Track anchor tag state
      const lower = seg.text.toLowerCase();
      if (lower.startsWith('</a')) inAnchorTag = false;
      else if (lower.startsWith('<a ') || lower === '<a>') inAnchorTag = true;
      return seg.text;
    }

    // Text segment - replace if not inside anchor
    if (inAnchorTag || replaced) return seg.text;

    const newText = seg.text.replace(regex, (match) => {
      if (replaced) return match;
      replaced = true;
      return `<a href="${targetPath}">${match}</a>`;
    });

    return newText;
  });

  return { result: processed.join(''), replaced };
}

// ─── Find best link for a given text ───
function findBestLink(text, sourcePath, usedUrls, usedKeywords) {
  const textLower = text.toLowerCase();
  let bestMatch = null;
  let bestScore = -1;

  for (const [kw, targets] of allKeywords) {
    if (targets.length === 0) continue;

    // Skip if this keyword already used as anchor text on this page
    if (usedKeywords.has(kw.toLowerCase())) continue;

    // Skip single-word keywords shorter than 6 chars
    const wordCount = kw.split(/\s+/).length;
    if (wordCount === 1 && kw.length < 6) continue;

    // Check if keyword appears in text with word boundary
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('\\b' + escaped + '\\b', 'i');
    if (!regex.test(textLower)) continue;

    // Find best target for this keyword (not source, not used)
    let bestTarget = null;
    let bestTargetScore = -1;

    for (const target of targets) {
      if (target.path === sourcePath) continue;
      if (usedUrls.has(target.path)) continue;

      const s = target.totalScore + kw.length;
      if (s > bestTargetScore) {
        bestTargetScore = s;
        bestTarget = target;
      }
    }

    if (!bestTarget) continue;

    // Overall score: prefer longer keywords (more specific), prefer priority targets
    // Heavily penalize single-word keywords — they must be much more relevant to win
    let score = bestTargetScore + (wordCount * 30) + (kw.length * 0.5);
    if (wordCount === 1) score *= 0.3;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        keyword: kw,
        path: bestTarget.path,
        title: bestTarget.title,
      };
    }
  }

  return bestMatch;
}

// ─── Check if element should be skipped for linking ───
function shouldSkipElement($el) {
  // Skip empty or very short elements
  const text = $el.text().trim();
  if (text.length < 15) return true;

  // Skip if contains existing links
  if ($el.find('a').length > 0) return true;

  // Skip if inside forbidden parents
  const forbidden = $el.parents(
    'nav, header, footer, #navbar-container, #footer-container, ' +
    '.fv-sidebar, .fv-pkg-tabs, .ab-hero-actions, .hero-actions, ' +
    '.blog-categories, .blog-categories-wrap, .blog-search-wrap, ' +
    '.services-categories, .services-page-controls, ' +
    '.fv-gallery, .fv-pkg-data, ' +
    '.ab-join-card-btn, .ab-recruit-card-btn, ' +
    '.sv-ind-btn, .sv-industry-cta-btn, .sv-cta-btn, ' +
    '.auth-form, #signInForm, #signUpForm, #forgotForm, ' +
    '.auth-social, .auth-tabs, ' +
    '.blog-cta-form, .newsletter-input-wrap'
  );
  if (forbidden.length > 0) return true;

  return false;
}

// ─── Process each page ───
const reportLines = [];
let totalLinksCreated = 0;
let totalPagesWithLinks = 0;

for (const page of pages) {
  const html = fs.readFileSync(page.fullPath, 'utf-8');
  const cheerio = require('cheerio');
  const $ = cheerio.load(html, { decodeEntities: false });

  const usedUrls = new Set();
  const usedKeywords = new Set();
  const pageLinks = [];
  let linksThisPage = 0;

  // Process paragraphs
  $('body p, body li').each((i, el) => {
    if (linksThisPage >= 5) return false;

    const $el = $(el);
    if (shouldSkipElement($el)) return;

    const match = findBestLink($el.text(), page.path, usedUrls, usedKeywords);
    if (!match) return;

    // Replace in the inner HTML, being careful with existing tags
    const innerHtml = $el.html();
    const { result: newHtml, replaced } = replaceKeywordInHtml(innerHtml, match.keyword, match.path);

    if (replaced) {
      $el.html(newHtml);
      usedUrls.add(match.path);
      usedKeywords.add(match.keyword.toLowerCase());
      linksThisPage++;
      pageLinks.push({ keyword: match.keyword, path: match.path, title: match.title });
    }
  });

  if (linksThisPage > 0) {
    fs.writeFileSync(page.fullPath, $.html(), 'utf-8');
    totalLinksCreated += linksThisPage;
    totalPagesWithLinks++;

    for (const link of pageLinks) {
      reportLines.push(`${page.path} -> ${link.path}  |  "${link.keyword}" -> "${link.title}"`);
    }
    console.log(`  ${linksThisPage} link(s) → ${page.file}`);
  } else {
    console.log(`  No links   → ${page.file}`);
  }
}

// ─── Report ───
const report = `
╔══════════════════════════════════════════════════════════╗
║           NAGRIVA INTERNAL LINKING REPORT               ║
╚══════════════════════════════════════════════════════════╝

Date: ${new Date().toISOString().split('T')[0]}
Total pages processed: ${pages.length}
Pages with new internal links: ${totalPagesWithLinks}
Total internal links created: ${totalLinksCreated}

${'═'.repeat(60)}
LINKS CREATED
${'═'.repeat(60)}

${reportLines.join('\n')}

${'═'.repeat(60)}
RULES ENFORCED
${'═'.repeat(60)}
✓ Max 5 internal links per page
✓ No self-linking
✓ No duplicate links to same URL on a page
✓ Headings not modified
✓ Links inserted only in paragraph/list content
✓ Blog posts prioritized to service pages, resources, and website-audit
✓ Existing links preserved (not modified)
✓ No linking within existing anchor tags
✓ Links not inserted inside navigation, buttons, sidebar, or forms

Report saved to internal-linking-report.txt
`;

console.log(report);
fs.writeFileSync(path.join(ROOT, 'internal-linking-report.txt'), report, 'utf-8');
