# Footer Audit Report

## Component Structure

**File**: `/components/footer.html` (128 lines)

The footer has 3 sections:
1. **CTA Section** (lines 5-12): `.footer-cta` — call-to-action with 2 buttons
2. **Grid Section** (lines 15-92): `.footer-grid` — 5 columns (Brand, Services, Industries, Resources, Company)
3. **Bottom Bar** (lines 95-125): `.footer-bottom` — copyright, legal links, language/currency selectors

## Include Pattern

| Include Method | Pages Affected | Notes |
|---|---|---|
| Direct `<script src="footer.js">` | 16 pages | Immediate load |
| Lazy via `performance-optimizer.js` (2s delay) | ~39 pages | Fragile, delayed render |

## CSS Selectors

All CSS lives in `style.css` with additional overrides in `mobile-optimizations.css`:

### Main definitions (style.css lines 4329-4637)
- `#footer-container` (lines 4321-4328)
- `.footer` (lines 4329-4345)
- `.footer-cta`, `.footer-cta-title`, `.footer-cta-desc`, `.footer-cta-actions` (lines 4348-4377)
- `.footer-grid` (lines 4380-4386)
- `.footer-col-brand` (lines 4389-4391)
- `.footer-logo`, `.footer-logo-img` (lines 4393-4400)
- `.footer-desc` (lines 4402-4407)
- `.footer-contact`, `.footer-contact a` (lines 4409-4429)
- `.footer-social` (lines 4432-4435)
- `.social-icon`, `.social-icon:hover` (lines 4437-4454)
- `.footer-col-title` (lines 4457-4465)
- `.footer-links`, `.footer-links a`, `.footer-links a:hover` (lines 4467-4483)
- `.footer-bottom`, `.footer-copy`, `.footer-legal`, `.footer-legal a`, `.footer-legal-sep`, `.footer-bottom-right` (lines 4486-4527)

### Duplicate / conflicting definitions
- `.social-icon:hover` at line 4450 AND line 6018 (with `translateY(-1px)`)
- `.footer-links a` at line 4473 AND line 6026 (with `position: relative`)
- `.footer-selectors` at line 4936 (mobile inline), line 8619 (main), line 8728 (mobile @media)

### Mobile responsive (style.css lines 4927-4937)
- Footer-specific overrides for mobile in `@media (max-width: 768px)`
- Additional overrides in `mobile-optimizations.css`

### RTL support (style.css lines 8700-8747)
- `[dir="rtl"]` overrides for footer, footer-cta, footer-grid, footer-bottom, footer-social
- RTL selector wrapper adjustments
- RTL responsive at line 8719-8724

### Language & Currency Selectors (style.css lines 8619-8747)
- `.footer-selectors`, `.selector-wrapper`, `.selector-icon`, `select`
- `.selector-wrapper::after` (custom dropdown arrow)

## Issues Found

1. **CTA embedded in footer** — violates separation of concerns
2. **CSS scattered** — 60+ selectors across 3 locations in style.css + mobile-optimizations.css
3. **Loading inconsistency** — only 16/55 pages directly include footer.js
4. **Duplicate selectors** — `.social-icon:hover` and `.footer-links a` defined twice in style.css
