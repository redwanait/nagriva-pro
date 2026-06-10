# Nagriva — Complete Site Architecture Audit & Refactor Report

**Date:** 2026-06-10  
**Auditor:** OpenCode AI  
**Scope:** Full site architecture, URL structure, internal linking, navigation, SEO  

---

## 1. Current Architecture (Visual Sitemap)

```
/ (index.html)
├── pages/
│   ├── about.html
│   ├── services.html              ← Services hub
│   ├── blog.html                  ← Blog listing
│   ├── resources.html             ← Resources hub
│   ├── pricing.html
│   ├── contact.html
│   ├── results.html               ← Case studies / Portfolio
│   ├── careers.html
│   ├── web-design.html            ← FLAT - should be /services/web-design
│   ├── seo.html                   ← FLAT - should be /services/seo-services
│   ├── social-media.html          ← FLAT - should be /services/social-media
│   ├── strategy.html              ← FLAT - should be /services/strategy
│   ├── branding.html              ← FLAT - should be /services/branding
│   ├── ai-automation.html         ← FLAT - should be /services/ai-automation
│   ├── website-audit.html         ← FLAT - should be /services/website-audit
│   ├── dentist-websites.html      ← FLAT - should be /industries/dentist-websites
│   ├── lawyer-websites.html       ← FLAT - should be /industries/lawyer-websites
│   ├── real-estate-websites.html  ← FLAT - should be /industries/real-estate-websites
│   ├── restaurant-websites.html   ← FLAT - should be /industries/restaurant-websites
│   ├── gym-fitness-websites.html  ← FLAT - should be /industries/gym-fitness-websites
│   ├── agency-websites.html       ← FLAT - should be /industries/agency-websites
│   ├── services/
│   │   ├── website-development.html
│   │   ├── ecommerce-stores.html
│   │   ├── blog-creation.html
│   │   ├── video-editing.html
│   ├── statistics/
│   │   └── seo-statistics.html    ← WRONG - should be /resources/statistics/
│   ├── article.html               ← Blog article template
│   ├── service.html               ← Service detail template
│   ├── privacy-policy.html
│   ├── terms-of-service.html
│   ├── 404.html
│   ├── login.html / signup.html / forgot-password.html / reset-password.html
│   ├── dashboard.html / admin-dashboard.html / client-portal.html
│   ├── checkout.html / order-success.html / order-tracking.html
│   ├── profile.html / settings.html / notifications.html / invoices.html
│   └── (more auth/admin pages...)
├── case-studies/
│   ├── dental-clinic-success-story.html
│   ├── law-firm-success-story.html
│   ├── real-estate-success-story.html
│   ├── restaurant-success-story.html
│   ├── gym-fitness-success-story.html
│   ├── agency-success-story.html
│   └── nagriva-growth-story.html
├── components/
│   ├── navbar.html
│   ├── footer.html
│   ├── cookie-consent.html
│   └── ...
├── api/chat.js
├── sitemap.xml                    ← Only 8 URLs listed (MISSING most pages)
├── robots.txt                     ← OK, covers auth/admin pages
└── vercel.json                    ← Partial clean URLs
```

---

## 2. Recommended Architecture

```
/ (index.html)
├── services/
│   ├── web-design                 ← /pages/web-design.html
│   ├── seo-services               ← /pages/seo.html
│   ├── social-media               ← /pages/social-media.html
│   ├── strategy                   ← /pages/strategy.html
│   ├── branding                   ← /pages/branding.html
│   ├── ai-automation              ← /pages/ai-automation.html
│   ├── website-audit              ← /pages/website-audit.html
│   ├── website-development        ← /pages/services/website-development.html
│   ├── ecommerce-stores           ← /pages/services/ecommerce-stores.html
│   ├── blog-creation              ← /pages/services/blog-creation.html
│   └── video-editing              ← /pages/services/video-editing.html
├── industries/
│   ├── dentist-websites           ← /pages/dentist-websites.html
│   ├── lawyer-websites            ← /pages/lawyer-websites.html
│   ├── real-estate-websites       ← /pages/real-estate-websites.html
│   ├── restaurant-websites        ← /pages/restaurant-websites.html
│   ├── gym-fitness-websites       ← /pages/gym-fitness-websites.html
│   ├── agency-websites            ← /pages/agency-websites.html
│   ├── car-rental-websites        ← NEW (mentioned in marquee)
│   ├── medical-websites           ← NEW (future)
│   ├── ecommerce-websites         ← NEW (future)
│   ├── salon-websites             ← NEW (future)
│   └── spa-websites              ← NEW (future)
├── resources/
│   ├── statistics/
│   │   └── seo-statistics         ← /pages/statistics/seo-statistics.html
│   ├── glossary/                  ← NEW (placeholder ready)
│   ├── guides/                    ← NEW (placeholder ready)
│   └── case-studies/             ← NEW (aggregator)
├── blog/                          ← /pages/blog.html (with vercel route)
├── portfolio/                     ← /pages/results.html (with vercel route)
├── pricing/                       ← /pages/pricing.html (with vercel route)
├── about/                         ← /pages/about.html (with vercel route)
├── contact/                       ← /pages/contact.html (with vercel route)
├── careers/                       ← /pages/careers.html (with vercel route)
├── pages/                         ← (kept for existing file structure)
└── case-studies/                  ← (individual case studies kept)
```

---

## 3. URL Structure Audit

### Current Issues:

| Issue | Location | Severity |
|-------|----------|----------|
| Clean URLs not configured for most pages | vercel.json | HIGH |
| Service pages flat in `/pages/` | All service pages | HIGH |
| Industry pages flat in `/pages/` | All industry pages | HIGH |
| Statistics page at `/pages/statistics/` instead of `/resources/statistics/` | seo-statistics.html | MEDIUM |
| Footer links to `/services/*` are BROKEN | footer.html | CRITICAL |
| Sitemap only has 8 URLs | sitemap.xml | HIGH |
| No `lastmod` on most sitemap URLs | sitemap.xml | MEDIUM |
| Blog article page has no route | article.html | MEDIUM |
| No `/industries/` aggregate page | Missing | MEDIUM |
| No `/resources/statistics/` aggregate | Missing | LOW |

### Recommended URL Structure:

| Desired URL | Source File | Vercel Route |
|------------|------------|--------------|
| `/services/web-design` | `/pages/web-design.html` | `^/services/web-design$` |
| `/services/seo` | `/pages/seo.html` | `^/services/seo$` |
| `/services/website-audit` | `/pages/website-audit.html` | `^/services/website-audit$` |
| `/services/social-media` | `/pages/social-media.html` | `^/services/social-media$` |
| `/services/strategy` | `/pages/strategy.html` | `^/services/strategy$` |
| `/services/branding` | `/pages/branding.html` | `^/services/branding$` |
| `/services/ai-automation` | `/pages/ai-automation.html` | `^/services/ai-automation$` |
| `/services/website-development` | `/pages/services/website-development.html` | `^/services/website-development$` |
| `/services/ecommerce-stores` | `/pages/services/ecommerce-stores.html` | `^/services/ecommerce-stores$` |
| `/services/blog-creation` | `/pages/services/blog-creation.html` | `^/services/blog-creation$` |
| `/services/video-editing` | `/pages/services/video-editing.html` | `^/services/video-editing$` |
| `/industries/dentist-websites` | `/pages/dentist-websites.html` | `^/industries/dentist-websites$` |
| `/industries/lawyer-websites` | `/pages/lawyer-websites.html` | `^/industries/lawyer-websites$` |
| `/industries/real-estate-websites` | `/pages/real-estate-websites.html` | `^/industries/real-estate-websites$` |
| `/industries/restaurant-websites` | `/pages/restaurant-websites.html` | `^/industries/restaurant-websites$` |
| `/industries/gym-fitness-websites` | `/pages/gym-fitness-websites.html` | `^/industries/gym-fitness-websites$` |
| `/industries/agency-websites` | `/pages/agency-websites.html` | `^/industries/agency-websites$` |
| `/resources/statistics/seo-statistics` | `/pages/statistics/seo-statistics.html` | `^/resources/statistics/seo-statistics$` |
| `/resources` | `/pages/resources.html` | `^/resources$` |
| `/blog` | `/pages/blog.html` | `^/blog$` |
| `/portfolio` | `/pages/results.html` | `^/portfolio$` |
| `/pricing` | `/pages/pricing.html` | `^/pricing$` |
| `/about` | `/pages/about.html` | `^/about$` |
| `/contact` | `/pages/contact.html` | `^/contact$` |
| `/careers` | `/pages/careers.html` | `^/careers$` |

---

## 4. Internal Linking Audit

### Current State (from linker report):
- 33 pages processed, 161 links created
- Good cross-linking between services and industries
- Case studies well-linked to their industry pages

### Gaps Found:

| Gap | Impact | Recommendation |
|-----|--------|---------------|
| No links from blog to service pages | MEDIUM | Blog posts should link to relevant services |
| No links from blog to industry pages | MEDIUM | Blog posts should link to relevant industries |
| No links from industry pages to resources | LOW | Add "Learn more in our resources" CTAs |
| No links from statistics to related services | HIGH | SEO Stat page should link to seo.html |
| No links from glossary (doesn't exist) | LOW | When created, link to services |
| No cross-industry links on industry pages | MEDIUM | Add "Related Industries" section |
| No links from homepage to resources hub | MEDIUM | Add resources link in homepage CTA |
| Footer has 4 broken links | CRITICAL | Fix immediately |

### Internal Linking Strategy:

```
Blog ↔ Services:    Blog posts link to relevant service pages
Blog ↔ Industries:  Industry-specific blog posts link to industry pages
Industries ↔ Industries: "Also serving:" cross-links
Resources ↔ Services:  Statistics/Guides link to relevant services
Statistics ↔ Blog:    Stats page links to blog posts citing those stats
Glossary ↔ Guides:    Glossary terms link to in-depth guides
All pages → Website Audit:  Convert sidebar/end-of-page CTA
All pages → Contact:  "Get started" links throughout
```

---

## 5. Resources Hub Audit

### Current State:
- `/pages/resources.html` - Well-designed hub with categories
- `/pages/statistics/seo-statistics.html` - Only resource page
- No glossary, no guides, no dedicated case studies aggregator

### Recommended Structure:

```
/resources/
├── index.html              ← Hub (existing, needs vercel route)
├── statistics/
│   ├── index.html          ← Statistics landing (NEW)
│   └── seo-statistics.html ← Existing
├── glossary/
│   ├── index.html          ← Glossary landing (NEW)
│   ├── seo-terms.html      ← Future
│   ├── web-design-terms.html ← Future
│   └── marketing-terms.html ← Future
├── guides/
│   ├── index.html          ← Guides landing (NEW)
│   ├── local-seo-guide.html ← Future
│   ├── law-firm-website-guide.html ← Future
│   └── ai-automation-guide.html ← Future
└── case-studies/          ← Aggregator (future)
```

---

## 6. Industry Page Audit

### Current Industry Pages (all at `/pages/`):
1. **dentist-websites.html** - Good structure, has case study link, branding link
2. **lawyer-websites.html** - Good, has case study link
3. **real-estate-websites.html** - Good, has website-audit link
4. **restaurant-websites.html** - Good, has blog-creation link
5. **gym-fitness-websites.html** - Good, has results link
6. **agency-websites.html** - Good, has video-editing link

### Consistency Issues:
- Not all pages link to Website Audit
- Not all pages link to related industries (cross-linking)
- Not all pages have "Related Resources" section
- Title formats are inconsistent (some have "Morocco" suffix, some don't)

### Recommended Industry Page Template:
```
1. Hero section (H1 with industry focus)
2. Key features / benefits
3. Design showcase / demo
4. Case study link (specific to that industry)
5. Related industries (cross-links)
6. SEO/Audit CTA
7. Pricing / CTA
8. Related resources (guides, statistics)
```

---

## 7. Navigation Audit

### Header Navigation (navbar.html):
```
Home | Services | Results | Pricing | About | Contact | Careers | Blog
```

**Issues:**
- No Resources Hub link
- No Industries quick-access dropdown
- No Website Audit link
- "About" page link is not prominent

**Recommended Header:**
```
Home | Services ▼ | Industries ▼ | Results | Resources ▼ | Pricing | About | Blog | Contact
       ├── Web Design       ├── Dentist          ├── Statistics
       ├── SEO              ├── Lawyer           ├── Guides
       ├── Social Media     ├── Real Estate      ├── Case Studies
       ├── Branding         ├── Restaurant       └── Free Downloads
       ├── AI Automation    ├── Gym & Fitness
       ├── Website Audit    └── Agency
       └── More...
```

### Footer Navigation (footer.html):

**CRITICAL ISSUE:** Footer "Services" links are BROKEN:
- `/services/website-development` → 404 (should be `/pages/services/website-development.html`)
- `/services/ecommerce-development` → 404 (should be `/pages/services/ecommerce-stores.html`)
- `/services/blog-creation` → 404 (should be `/pages/services/blog-creation.html`)
- `/services/video-editing` → 404 (should be `/pages/services/video-editing.html`)

**Recommended Fix:** Update footer links to correct paths, or add vercel routes.

### Breadcrumbs:
- Only a few pages have breadcrumb schema (homepage, services.html, resources.html)
- Most industry/service pages lack breadcrumb structured data

---

## 8. SEO Architecture Audit

### Crawl Depth Analysis:

| Page | Depth from Home | Notes |
|------|----------------|-------|
| Homepage | 0 | Good |
| Services Hub | 1 | Good |
| Blog | 1 | Good |
| Resources Hub | 1 | Good |
| Pricing | 1 | Good |
| Service Detail | 2 | OK (from Services hub) |
| Industry Page | 2 | OK (from Services hub) |
| Case Study | 2 | OK (from Results or Services) |
| Statistics | 3 | Could be 2 from Resources |
| Glossary | N/A | Doesn't exist |
| Guide | N/A | Doesn't exist |

### Topic Cluster Analysis:

```
Pillar: Digital Growth Agency
├── Cluster: Web Design
│   ├── Service: Web Design
│   ├── Industry: Dentist Websites
│   ├── Industry: Lawyer Websites
│   └── Resource: Web Design Guide
├── Cluster: SEO
│   ├── Service: SEO Services
│   ├── Industry: [All industry pages with SEO]
│   ├── Resource: SEO Statistics
│   └── Resource: SEO Guide
├── Cluster: AI Automation
│   ├── Service: AI Automation
│   └── Resource: AI Automation Guide
└── Cluster: Branding
    └── Service: Brand Identity
```

### Topical Authority Opportunities:
1. **Dental SEO**: Dentist websites + SEO + local SEO stats → strong topical cluster
2. **Legal Marketing**: Lawyer websites + branding + content marketing
3. **Real Estate Digital Strategy**: Real estate websites + SEO + automation
4. **Restaurant Online Presence**: Restaurant websites + social media + blog creation
5. **Gym/Fitness Growth**: Gym websites + video editing + social media

### Hub-and-Spoke Model:

```
                         ┌─────────────┐
                         │   HOMEPAGE   │
                         └──────┬──────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
     ┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐
     │  SERVICES   │    │  INDUSTRIES │    │  RESOURCES  │
     │   (Hub)     │    │    (Hub)    │    │    (Hub)    │
     └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
            │                  │                  │
     ┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐
     │Web Design   │    │ Dentist     │    │ Statistics  │
     │SEO          │    │ Lawyer      │    │ Guides      │
     │Branding     │    │ Real Estate │    │ Glossary    │
     │AI Autom.    │    │ Restaurant  │    │ Case Studies│
     │Social Media │    │ Gym/Fitness │    │             │
     │Strategy     │    │ Agency      │    │             │
     │Website Audit│    │             │    │             │
     └─────────────┘    └─────────────┘    └─────────────┘
```

---

## 9. Missing Pages

| Page | Priority | Rationale |
|------|----------|-----------|
| `/industries/index.html` | HIGH | Industry landing/aggregator needed |
| `/resources/statistics/index.html` | MEDIUM | Statistics hub page |
| `/resources/glossary/index.html` | LOW | Placeholder for future |
| `/resources/guides/index.html` | MEDIUM | Guides hub page |
| `/industries/car-rental-websites.html` | HIGH | Mentioned in homepage marquee but no page exists |
| Individual blog article pages | MEDIUM | Currently only article.html template exists |

---

## 10. Priority Action Plan

### Quick Wins (Do Now):
1. **Fix footer broken links** → Update footer.html with correct paths
2. **Update sitemap.xml** → Add all 30+ public pages
3. **Add more vercel routes** → Clean URLs for all services, industries, resources
4. **Fix robots.txt** → Ensure all clean URLs are allowed

### Short-term (This Sprint):
5. **Create industry landing page** → `/pages/industries.html`
6. **Create resource hub sub-pages** → Statistics landing, Guides landing
7. **Add breadcrumbs** → Structured data to all industry/service pages
8. **Add Resources link** → To header navigation

### Medium-term (Next Sprint):
9. **Create `/industries/` directory** → Mirror pages
10. **Create `/resources/glossary/`** → With initial glossary content
11. **Create car-rental-websites page** → Missing industry
12. **Internal linking pass** → Blog ↔ Services, Industry ↔ Resources

### Long-term:
13. **Full URL migration** → Move files to `/services/`, `/industries/`, `/resources/`
14. **Blog article system** → Individual routes for blog posts
15. **Content clusters** → Full topic cluster implementation
16. **Statistics expansion** → More statistics pages (web design, social media)
