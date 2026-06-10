# Duplicate Component Report

## Summary

The project lacks a **unified component loading system** — each shared layout piece (navbar, footer, cookie consent) is loaded via its own separate JS file. This creates duplication, timing fragility, and maintenance overhead.

## Component Loading Breakdown

### Navbar (64 references across ~54 pages)
- **Source**: `/components/navbar.html` (single source)
- **Loader**: `/js/navbar.js` (fetches + mounts into `div#navbar-container`)
- **Mount point**: `<div id="navbar-container"></div>`
- **Pages**: All 54+ pages include navbar.js — well-structured, consistent.

### Footer (ONLY 16 of ~55 pages directly load it)
- **Source**: `/components/footer.html` (single source, but contains embedded CTA)
- **Loader**: `/js/footer.js` (fetches + mounts into `div#footer-container`)
- **Mount point**: `<div id="footer-container"></div>`
- **Pages with direct include**: 16 pages (industry pages, case studies, website-audit, contact)
- **Pages relying on lazy-loading**: ~39+ pages depend on `/js/performance-optimizer.js` to load footer.js after 2s delay via `requestIdleCallback` — fragile and inconsistent.

### Cookie Consent (~53 references)
- **Source**: `/components/cookie-consent.html` (single source)
- **Loader**: `/js/cookie-consent.js` (fetches + mounts with full consent management logic)
- **Mount point**: `<div id="cookie-consent-container"></div>`
- **Pages**: Nearly all pages include cookie-consent.js — well-structured.

### CTA Section
- **Embedded in footer**: `.footer-cta` block at lines 5-12 of `/components/footer.html`
- **Inline duplicates**: Several pages have their own standalone CTAs:
  - `about.html` — inline CTA (premium CTA section)
  - Any page with `.cta-section` in CSS optimization rules (per `performance-optimizer.js`)
- **Problem**: CTA is both in the footer AND duplicated on individual pages. No shared CTA component.

## The Fragile Chain

Most pages rely on this sequence:
1. `performance-optimizer.js` loads after `window.load` event
2. After 2s delay, it lazy-loads `footer.js`
3. `footer.js` fetches `footer.html` which includes the CTA

This means:
- Footer appears 2+ seconds after page load on most pages
- If `performance-optimizer.js` fails, footer never loads
- CTA appears with the footer, not as an independent section

## Recommendation

Replace three separate JS loaders with a single `/js/layout.js` that:
1. Loads navbar, footer, CTA, and cookie consent from a single orchestration
2. Eliminates the fragile `performance-optimizer.js` → `footer.js` dependency chain
3. Makes CTA a standalone, independently-loadable component
