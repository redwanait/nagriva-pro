# Refactor Summary Report

## Objectives

1. **Unify component loading** — replace 3 separate JS loaders with one `layout.js`
2. **Extract CTA from footer** — make CTA a standalone, independently-loadable component
3. **Split CSS** — extract component styles from monolithic `style.css` into dedicated files
4. **Eliminate inconsistencies** — ensure every page loads the same layout the same way

## Proposed Architecture

```
components/
  navbar.html          ← unchanged
  footer.html          ← CTA block removed
  cta.html             ← NEW (extracted from footer)
  cookie-consent.html  ← unchanged

css/
  navbar.css           ← NEW (extracted from style.css)
  footer.css           ← NEW (extracted from style.css)
  cta.css              ← NEW (extracted from style.css, renamed classes)

js/
  layout.js            ← NEW (unified loader replacing footer.js, navbar.js, cookie-consent.js)
  footer.js            ← REMOVE
  navbar.js            ← REMOVE
  cookie-consent.js    ← REMOVE
  performance-optimizer.js ← MODIFY (remove footer.js from deferred scripts)
```

## Page Update Plan

Each page gets:
- Add: `<link rel="stylesheet" href="/css/navbar.css">`
- Add: `<link rel="stylesheet" href="/css/footer.css">`
- Add: `<link rel="stylesheet" href="/css/cta.css">` (if CTA is used)
- Replace: `<script src="navbar.js">` + `<script src="footer.js">` + `<script src="cookie-consent.js">`
- With: `<script defer src="/js/layout.js"></script>`

## Step-by-Step Execution

| Step | Description | Files Affected |
|---|---|---|
| 1 | Remove `.footer-cta` from `footer.html` lines 5-12 | 1 |
| 2 | Create `/components/cta.html` from extracted CTA content | 1 |
| 3 | Create `css/navbar.css` (~200 lines from style.css) | 1 |
| 4 | Create `css/footer.css` (~300 lines from style.css + mobile-optimizations.css) | 1 |
| 5 | Create `css/cta.css` (~30 lines from style.css, rename `.footer-cta-*` → `.cta-*`) | 1 |
| 6 | Create `/js/layout.js` — unified loader | 1 |
| 7 | Update all ~55 pages with new CSS + JS includes | ~55 |
| 8 | Remove extracted CSS from `style.css` | 1 |
| 9 | Remove old JS files (footer.js, navbar.js, cookie-consent.js) | 3 |
| 10 | Update `performance-optimizer.js` to remove footer.js from deferred list | 1 |

## Total: ~66 files modified

## Risks & Mitigation

| Risk | Mitigation |
|---|---|
| Pages missing new CSS links → broken layout | Generate complete list of all pages and batch update |
| CTA renaming breaks existing pages | Only `.footer-cta-*` → `.cta-*` in new CTA component; pages that used `.footer-cta` inside footer will now use standalone CTA |
| layout.js timing conflicts with existing page scripts | Use `defer` attribute, dispatch `navbar:loaded` / `layout:loaded` events |
| performance-optimizer.js still lazy-loads footer.js | Remove footer.js from DEFERRABLE_SCRIPTS in performance-optimizer.js |
