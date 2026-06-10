# CSS Conflict Report

## Style.css Size: ~9,298 lines

## Duplicate Selectors

| Selector | Location 1 | Location 2 | Conflict |
|---|---|---|---|
| `.social-icon:hover` | Line 4450 (`color: var(--accent); border-color...; background...`) | Line 6018 (`transform: translateY(-1px); transition: all 0.3s ease`) | Location 2 adds `translateY` animation but does not redeclare colors — relies on cascade. `transition` property conflicts. |
| `.footer-links a` | Line 4473 (`font-size: 0.75rem; color: rgba(255,255,255,0.2); transition: color 0.3s ease; width: fit-content`) | Line 6026 (`position: relative; width: fit-content`) | Location 2 only sets `position: relative` and `width: fit-content`. Width is duplicated; position is additional. No actual conflict but unnecessary duplication. |
| `.footer-selectors` | Line 4936 (`justify-content: center;` — inside `@media (max-width: 768px)`) | Line 8619 (`display: flex; align-items: center; gap: 6px;` — main definition) | Line 4936 is a mobile override (justify-content only). Line 8619 is the main definition. Line 8728 has another mobile overrides block. Mobile definitions are split confusingly. |

## Scattered Component Styles

| Component | Primary CSS Location | Additional Locations |
|---|---|---|
| Navbar (desktop) | style.css lines 311-516 | style.css lines 5991-6007 (hover refinements) |
| Navbar (mobile) | style.css lines 4568-4790+ | mobile-optimizations.css (overlay.open) |
| Footer | style.css lines 4329-4637 | style.css lines 4927-4937 (mobile), 6018-6029 (hover), 8619-8747 (selectors+RTL), mobile-optimizations.css |
| CTA (footer-cta) | style.css lines 4348-4377 | style.css lines 4928-4930 (mobile) |

## Specificity / Inheritance Risks

1. **`.footer-links a`** at line 4473 uses `color: rgba(255,255,255,0.2)` while line 6026 sets `position: relative` — since they are at different places in the cascade, both apply. Not harmful but confusing.

2. **`.social-icon:hover`** at line 6018 uses `transition: all 0.3s ease` which overrides the more specific `transition: all 0.3s ease` at line 4446 — functionally identical but redundant.

3. **`.footer-selectors`** mobile override at line 4936 is a single-line rule inside the `@media (max-width: 768px)` block, while the full mobile definition is at line 8728 in a separate `@media` block. Both apply at the same breakpoint.

## Recommendation

Extract all component CSS into separate files:
- `css/navbar.css` — all `.navbar`, `.nav-*`, `.mobile-menu-*`, `.hamburger`, `.user-dropdown-*` selectors
- `css/footer.css` — all `.footer*`, `.social-icon`, `.selector*`, `.footer-language`, `.footer-currency`, RTL footer
- `css/cta.css` — all `.footer-cta*` (renamed to `.cta-*`)
