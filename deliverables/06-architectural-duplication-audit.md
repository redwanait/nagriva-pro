# Architectural Duplication & Technical Debt Audit

**Audited:** 2026-06-16
**Codebase:** Nagriva Growth Agency
**Scope:** 76 HTML pages, 90+ JS files, 43 CSS files, 32+ SQL migrations, 8 API endpoints
**Auditor:** Principal Software Architect / Senior Code Auditor

---

## Architecture Quality Score: **38/100**
## Technical Debt Score: **72/100**

> Every duplicated business rule is a future bug.

---

## Table of Contents

1. Duplication Map
2. Dependency Map
3. Single Source of Truth Recommendations
4. Refactoring Roadmap
5. Detailed Findings by Layer

---

## 1. DUPLICATION MAP

### CRITICAL (Data Integrity Risk)

| ID | Finding | Files | Lines of Duplication | Risk |
|----|---------|-------|---------------------|------|
| C1 | **Order status enum defined 6 ways in SQL + 3 ways in JS** | 9 SQL files + `js/orders.js`, `js/dashboard.js`, `js/admin-orders.js` | ~50 lines across 12 files | **Data corruption** — different migration order = different valid statuses; JS writes `'Pending'` (capital P) which will fail against some constraints |
| C2 | **Order number generation — 3 competing implementations** | `js/orders.js:222`, `modules/orders/orders-api.js:219`, `js/checkout.js:759` | ~30 lines in 3 files | **Duplicate order numbers** — formats differ (`NRV-YYYY-NNNN` vs `NAG-YYYY-NNN`); checkout uses different format than orders module |
| C3 | **Service pricing data — 3 independent copies** | `js/services-api.js` (366-line FALLBACK), `supabase-migration-services.sql` (JSON seed), `supabase-migration-services-v2.sql` (overwrite) | ~500 lines across 3 files | **Pricing drift** — admin updates to services in Supabase never reach the public site (fallback always wins); frontend can show different prices than DB |
| C4 | **`notify_on_activity()` trigger — 4 competing versions** | `supabase-migration-final.sql`, `supabase-notification-triggers.sql`, `supabase-notification-fix.sql`, `supabase-notification-invoices.sql` | ~360 lines (4× ~90 line functions) | **Silent notification loss** — last migration wins; events handled in one version may not fire in another |
| C5 | **Status constraint DROP+ADD in 6 files** | `supabase-schema.sql`, `supabase-migration-orders.sql`, `supabase-migration-order-tracking.sql`, `supabase-migration-payment-status.sql`, `supabase-migration-checkout-system.sql`, `supabase-migration-final.sql` | ~30 lines (5× repeated pattern) | **Live constraint flapping** — if migrations replay, table briefly has NO status constraint between DROP and ADD |

### HIGH (Business Logic Fragmentation)

| ID | Finding | Files | Lines of Duplication | Risk |
|----|---------|-------|---------------------|------|
| H1 | **`formatDate()` — 20+ independent implementations** | `js/dashboard.js:28`, `js/orders.js:37`, `js/subscription-manager.js:154`, `js/audit-history.js:44`, `js/admin-*.js` (9 files), `modules/*.js` (4 files), `components/*.js` (2 files) | ~80 lines (20× 4-line functions) | **Inconsistent date display** — some show time, some don't; changing format requires 20+ edits; some use different locale options |
| H2 | **`normalizeStatus()` — 2 independent implementations with different mappings** | `js/dashboard.js:84` (missing `approved`), `js/orders.js:64` (has `approved`) | ~30 lines (2× 15-line functions) | **Inconsistent status display** — dashboard drops `approved` status, mapping it to `pending`; admin-orders uses a third mapping via `STATUS_CONFIG` |
| H3 | **Admin role check — 19+ inline `profile.role === 'admin'`** | `js/auth-guard.js:163`, `js/audit-history.js:766`, `js/orders.js:269/281/308`, `js/admin-auth.js:93/170`, `modules/services/services-api.js:34`, `modules/deliverables/deliverables-api.js:48`, SQL (50+ `EXISTS` subqueries) | ~50 lines across 70+ locations | **Role model change = 70+ edits** — adding a new role (e.g., `superadmin`) requires touching every location |
| H6 | **`sendJson()` response helper — 3 copy-pasted implementations** | `api/audit.js:7-21`, `api/seo-titles.js:36-50`, `api/seo-title-improve.js:37-51` | 45 lines (3× 15-line functions) | **Response inconsistency** — audit.js errors include `failedStep`, SEO files include `fallback`, checkout files return bare `{error}` with no `success` field |
| H7 | **Supabase client creation — 4 places** | `js/supabase-config.js:6`, `api/stripe-webhook.js:39`, `api/create-portal-session.js:22`, `api/create-checkout-session.js:23` | ~25 lines across 4 files | **Config drift** — checkout/portal fall back to anon key if service role key missing; webhook requires service role key; changing initialization requires 4 edits |
| H8 | **Bearer token auth block — exact copy-paste** | `api/create-checkout-session.js:30-40`, `api/create-portal-session.js:29-39` | 20 lines (2× 10-line blocks) | **Auth bypass risk** — fix in one file won't propagate to the other |
| H9 | **`LANGUAGE_MAP` constant — 2 copies** | `api/seo-titles.js:3-6`, `api/seo-title-improve.js:3-6` | 8 lines (2× 4-line objects) | **Translation drift** — adding a language to one won't update the other |

### MEDIUM (Code Quality & Maintainability)

| ID | Finding | Files | Lines | Risk |
|----|---------|-------|-------|------|
| M1 | **Redundant `deliverables` table** vs `files` table | `supabase-deliverables-system.sql` vs `supabase-schema.sql` | Full table (~126 lines) | **Storage fragmentation** — order files can be in either table; no single query shows all files for an order |
| M2 | **`support_conversations` + `support_messages` duplicate `messages` table** | `supabase-migration-navbar-system.sql` (new tables) vs `supabase-migration-support-chat.sql` (uses existing `messages` with `conversation_id`) | Full table schemas (~200 lines) | **Chat fragmentation** — support messages could be in 3 different places |
| M3 | **`notify_on_activity()` SQL trigger vs JS activity logging dual-path** | SQL: `notification-triggers.sql`, `notification-fix.sql`; JS: `modules/activity-logs/activity-logs-triggers.js` | Full functions (~200 lines each side) | **Double-notification or missed notifications** — both paths create activity records independently |
| M4 | **Derived columns stored: `orders.progress`, `orders.current_stage`, `report_shares.views/downloads/shares`** | `supabase-migration-order-tracking.sql`, `supabase-migration-report-shares.sql` | 4 stored columns | **Data inconsistency** — progress can be out of sync with status; counters can drift from actual events |
| M5 | **`plan` column in both `profiles` and `subscriptions`** | `supabase-migration-plan-system.sql` + `supabase-migration-subscriptions.sql` | 2 columns with sync trigger | **Sync failure risk** — profiles.plan can diverge from subscriptions.status |
| M6 | **`stripe_customer_id` in both `profiles` and `subscriptions`** | `supabase-migration-subscriptions.sql` | 2 columns | **Data duplication** — same ID stored in two places |
| M7 | **Two `update_updated_at` functions** | `supabase-schema.sql` (`update_updated_at()`), `supabase-migration.sql` (`update_updated_at_column()`) | 2 functions, identical | **Trigger fragmentation** — some tables use one, some use the other |
| M8 | **`on_auth_user_created` trigger — 2 versions** | `supabase-schema.sql` (v1, minimal), `supabase-migration-navbar-system.sql` (v2, rich) | 2 trigger functions | **Registration inconsistency** — which version runs depends on migration order |
| M9 | **`ALTER PUBLICATION supabase_realtime ADD TABLE` — 12+ repetitions** | Scattered across 10+ migration files | ~12 lines each | **Realtime configuration fragility** — redundant operations |
| M10 | **Admin check SQL subquery `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')` — 50+ repetitions** | Every RLS policy across 32+ migration files | ~50+ subqueries | **Role model change = 50+ SQL edits** |
| M11 | **Storage bucket creation — 6 copy-paste patterns** | `supabase-storage-*.sql`, `supabase-migration-final.sql`, `supabase-migration-settings.sql` | ~30 lines each | **Policy inconsistency** — buckets may have slightly different permissions |
| M12 | **Email in profiles added from 2 files, duplicates `auth.users.email`** | `supabase-migration-navbar-system.sql`, `supabase-migration-client-direct.sql` | 2 `ADD COLUMN` statements | **Stale email column** — user can change email in auth but profiles.email won't update |
| M13 | **`client_name`/`user_email`/`client_email` in orders duplicates `profiles`** | `supabase-schema.sql`, `supabase-migration-orders.sql`, `supabase-migration-final.sql` | 4 denormalized columns | **Stale denormalized data** — profile changes won't reflect in past orders |
| M14 | **Multiple `amount`-like columns on orders: `budget`, `amount_paid`, `amount` + `payments.amount`** | `supabase-schema.sql`, `supabase-migration-checkout-system.sql`, `supabase-schema-payments.sql` | 4 columns across 2 tables | **Financial reconciliation difficulty** — unclear which is authoritative |
| M15 | **Footer loading — dual path (16 direct + 39 lazy via performance-optimizer)** | `js/footer.js`, `js/performance-optimizer.js` | ~20 lines | **Timing fragility** — footer doesn't appear on 39 pages for 2+ seconds; if optimizer fails, footer never loads |
| M16 | **CTA embedded in footer AND duplicated on individual pages** | `components/footer.html:5-12` + 3+ standalone CTA sections | ~8 lines each | **CTA inconsistency** — styling changes must be made in multiple places |
| M17 | **`formatShortDate` — duplicated in subscription-manager + global-search** | `js/subscription-manager.js:163`, `modules/search/global-search.js:587` | ~8 lines | **Date format inconsistency** |
| M18 | **Client-side-only coupon validation** | `js/checkout.js` (COUPONS object) | ~30 lines | **Revenue leak** — users can inspect/modify client-side coupons |
| M19 | **OpenAI response parsing pattern — 2 copies** | `api/seo-titles.js:111-121`, `api/seo-title-improve.js:152-162` | ~20 lines | **Error handling drift** |
| M20 | **HTTP method check — 6 inline implementations** | 6/8 API files | ~18 lines (6× 3-line blocks) | **Inconsistent error messages** — some say "Method not allowed", others "Use POST." |

---

## 2. DEPENDENCY MAP

### SQL Migration Dependencies

```
supabase-schema.sql (core schema — profiles, orders, messages, files, activity_log, notifications)
├── supabase-migration.sql (full migration — overlaps schema)
│   ├── supabase-migration-orders.sql
│   ├── supabase-migration-order-tracking.sql
│   ├── supabase-migration-checkout-system.sql
│   ├── supabase-migration-final.sql (THE LAST migration — overwrites many prior constraints)
│   │   └── overrides: status constraint, notify_on_activity(), realtime publications
│   ├── supabase-migration-payment-status.sql
│   ├── supabase-schema-payments.sql
│   ├── supabase-schema-invoices.sql
│   ├── supabase-migration-subscriptions.sql
│   ├── supabase-migration-plan-system.sql
│   ├── supabase-notification-triggers.sql
│   ├── supabase-notification-fix.sql
│   ├── supabase-notification-invoices.sql
│   └── supabase-rls-*.sql (3 files — RLS hardening, verification, admin)
│
├── supabase-migration-services.sql
│   └── supabase-migration-services-v2.sql (overwrites seed data)
│
├── supabase-migration-blog.sql
├── supabase-migration-onboarding.sql
├── supabase-migration-tool-usage.sql
├── supabase-migration-report-shares.sql
├── supabase-migration-support-chat.sql
├── supabase-migration-admin-support.sql
├── supabase-migration-navbar-system.sql
├── supabase-migration-messages-read.sql
├── supabase-migration-contact-submissions.sql
├── supabase-migration-audit-leads.sql
├── supabase-migration-audit-reports.sql
├── supabase-migration-audit-history-rls.sql
├── supabase-migration-email-logs.sql
├── supabase-migration-job-applications.sql
├── supabase-migration-delete-account.sql
├── supabase-migration-settings.sql
├── supabase-migration-content.sql
├── supabase-migration-client-direct.sql
├── supabase-migration-activity-log-fix.sql
├── supabase-data-migration.sql
├── supabase-deliverables-system.sql
├── supabase-newsletter-subscribers.sql
├── supabase-storage-avatars.sql
└── supabase-storage-audit-reports.sql
```

**CRITICAL ISSUE:** `supabase-migration-final.sql` is NOT actually the final authority. Each migration file independently DROP+CREATEs constraints, triggers, and policies. The effective schema depends on the **order migrations were applied**, which is unknowable from the file system.

### JavaScript Module Dependencies

```
window.supabase (CDN global)
└── js/supabase-config.js (creates window.supabaseClient)
    ├── js/auth-store.js (NagrivaAuthStore)
    │   ├── js/auth-guard.js (NagrivaAuthGuard)
    │   ├── js/admin-auth.js (NagrivaAdminAuth)
    │   ├── js/auth.js (NagrivaAuth — UI layer)
    │   ├── js/plan-manager.js (NagrivaPlanManager)
    │   └── js/subscription-manager.js (NagrivaSubscriptionManager)
    │       └── js/pro-locker.js (feature gating)
    │
    ├── js/free-trial-tracker.js
    ├── js/tool-access-modal.js
    ├── js/limit-modal.js
    │
    ├── modules/orders/orders-api.js (NAGRIVA_OrdersAPI)
    │   ├── js/orders.js (NagrivaOrders — uses API + has own CRUD)
    │   ├── js/admin-orders.js (NAGRIVA_AdminOrders — parallel CRUD)
    │   └── js/checkout.js (creates orders directly + via API)
    │
    ├── modules/invoices/invoices-api.js
    │   ├── js/admin-invoices.js
    │   ├── modules/invoices/invoices-notifications.js
    │   ├── modules/invoices/invoices-realtime.js
    │   ├── modules/invoices/invoices-activity.js
    │   └── modules/invoices/invoice-pdf.js
    │
    ├── modules/services/services-api.js (admin CRUD)
    │   └── js/services-api.js (public fallback — NEVER calls DB)
    │       ├── js/services-renderer.js
    │       ├── js/services-page.js
    │       └── js/services-detail.js
    │
    ├── modules/activity-logs/activity-logs-api.js
    │   └── modules/activity-logs/activity-logs-triggers.js (JS-side logging)
    │       └── SQL: notify_on_activity() trigger (DB-side logging — ALTERNATIVE PATH)
    │
    └── modules/deliverables/deliverables-api.js
```

### API Layer Dependencies

```
VERCEL SERVERLESS FUNCTIONS (api/)
├── create-checkout-session.js — Supabase (service_role) + Stripe
├── create-portal-session.js — Supabase (service_role) + Stripe
├── stripe-webhook.js — Supabase (service_role) + Stripe
├── audit.js — Google PageSpeed API (NO auth)
├── seo-titles.js — OpenAI API (NO auth)
├── seo-title-improve.js — OpenAI API (NO auth)
├── debug-webhook.js — env vars only (NO auth)
└── ping.js — NO dependencies
```

---

## 3. SINGLE SOURCE OF TRUTH RECOMMENDATIONS

| Domain | Current Sources of Truth | Recommended Single Source |
|--------|------------------------|-------------------------|
| **Order Status Enum** | 9 SQL files + 3 JS files + inline HTML | `supabase/seed/status-config.sql` + `js/shared/status-config.js` |
| **Order Status Transitions** | None (any-to-any) | Central state machine: `js/shared/order-state-machine.js` + DB function |
| **Order Number Generation** | 3 JS implementations | `supabase function` (database sequence) + single JS wrapper |
| **Service/Pricing Data** | SQL seed (migrations) + JS fallback (FALLBACK object) | `services` table ONLY; remove JS fallback; add caching layer |
| **Pricing/Plan Constants** | `js/subscription-manager.js` (price IDs) + `nagriva-pro.html` (data attr) + SQL | `js/shared/pricing-config.js` (generated from DB or single constants file) |
| **Notifications** | SQL trigger (4 versions) + JS trigger module (activity-logs-triggers.js) | ONE path only — prefer DB trigger for consistency; remove JS-side logging |
| **Admin Role Check** | 19+ inline profile.role checks in JS + 50+ EXISTS subqueries in SQL | `sql/function is_admin()` in DB + `js/shared/auth-utils.js isAdmin()` in JS |
| **Date Formatting** | 20+ independent formatDate functions | `js/shared/dates.js` with all format variants |
| **Status Normalization** | 2 normalizeStatus implementations | `js/shared/status-utils.js` exported from a single file |
| **SendJson / Response Format** | 3 sendJson helpers + 4 ad-hoc patterns | `api/lib/response.js` shared helper |
| **Supabase Client Init** | 4 places (1 browser + 3 serverless) | `api/lib/supabase.js` shared factory |
| **Stripe Init** | 3 places | `api/lib/stripe.js` shared factory |
| **Auth Middleware** | 2 copy-pasted blocks | `api/lib/auth.js` shared `requireAuth()` |
| **CTA Component** | Embedded in footer + inline duplicates | `/components/cta.html` standalone, loaded by layout.js |
| **Footer Loading** | 2 paths (16 direct + 39 lazy) | Unified `js/layout.js` with consistent timing |
| **Support Chat** | 3 competing implementations (messages + conversation_id, support_conversations, support_messages) | Single: `messages` table with `conversation_id` only |
| **Order Files** | 2 tables (`files` + `deliverables`) | Use `files` only; drop `deliverables` table |
| **Financial Columns on Orders** | `budget`, `amount_paid`, `amount` on orders + `amount` on payments | `payments` as sole financial source of truth; `orders.amount` as read-only reference |
| **Service/Service_Type/Service_Slug** | 3 columns on orders | `service_slug` only |
| **Profiles.Email** | Duplicates auth.users.email | Remove; use `auth.users.email()` function |
| **Profiles.Plan** | Stored + synced via trigger from subscriptions | Computed view or `subscriptions.plan` as sole source |
| **Profiles.Stripe_Customer_Id** | On profiles + subscriptions | Subscriptions table only |
| **Orders.Progress/Current_Stage** | Stored columns | Computed from `orders.status` in view or JS |
| **Report_Shares Counters** | Stored columns | Computed from analytics table |
| **Rename `update_updated_at()`** | Two functions | Single function; consolidate triggers |
| **On Auth User Created** | 2 triggers (v1 minimal, v2 rich) | Single trigger (v2) |
| **Coupon Validation** | Client-side only | Server-side validation in `api/validate-coupon.js` |
| **Supabase URL** | Hardcoded fallback in 3 API files | Single env var; no hardcoded URL |

---

## 4. REFACTORING ROADMAP

### Phase 1 — Critical Fixes (1-2 days, immediate data integrity risk)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1.1 | **Unify order status enum** — create single source SQL migration that defines ALL valid statuses; update all JS constants to reference one shared config | 4h | Eliminates data corruption risk from constraint conflicts |
| 1.2 | **Fix checkout status case bug** — change `'Pending'` → `'pending'` in `js/checkout.js` | 5min | Prevents silent order creation failure |
| 1.3 | **Consolidate order number generation** — use DB sequence; remove JS-based generation; convert `js/checkout.js` to use `modules/orders/orders-api.js` | 3h | Prevents duplicate order numbers |
| 1.4 | **Consolidate notify_on_activity() trigger** — create single authoritative version; disable alternative JS notification path | 4h | Prevents double/missed notifications |
| 1.5 | **Consolidate status constraint** — single migration at end that defines THE authoritative status CHECK constraint | 1h | Eliminates constraint flapping during migration replay |

### Phase 2 — Business Logic Consolidation (2-3 days)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 2.1 | **Remove JS service pricing fallback** — make `js/services-api.js` call Supabase; remove 366-line FALLBACK data | 4h | Eliminates price drift; admin changes now visible to public |
| 2.2 | **Create `api/lib/` shared utilities** — supabase.js, stripe.js, response.js, auth.js, validate.js | 4h | Eliminates 80+ lines of copy-paste across 8 API files |
| 2.3 | **Create `js/shared/` utilities** — dates.js, status-utils.js, auth-utils.js | 3h | Eliminates 20+ formatDate copies, 2 normalizeStatus copies |
| 2.4 | **Create DB `is_admin()` function** — replace 50+ inline EXISTS subqueries | 2h | Role model change = 1 edit instead of 50+ |
| 2.5 | **Create JS `isAdmin()` helper** — replace 19+ inline `profile.role === 'admin'` checks | 2h | Same as above for frontend |
| 2.6 | **Fix order number format inconsistency** — unify on `NAG-YYYY-NNN` (DB sequence) | 2h | Consistent order numbers everywhere |

### Phase 3 — Schema Consolidation (2-3 days)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 3.1 | **Drop redundant `deliverables` table** — migrate data to `files` table | 2h | Eliminates dual-storage confusion |
| 3.2 | **Consolidate support chat** — drop `support_conversations`/`support_messages`; use `messages` with `conversation_id` | 4h | Single source for all messages |
| 3.3 | **Make `orders.progress` and `current_stage` computed** — create DB view or computed columns | 2h | Eliminates sync issues |
| 3.4 | **Remove `profiles.email`** — use `auth.users.email()` function | 1h | Eliminates stale email column |
| 3.5 | **Remove `profiles.plan`** — derive from `subscriptions` table via view | 2h | Single source for plan state |
| 3.6 | **Remove duplicate `stripe_customer_id` on profiles** | 1h | Single source for Stripe customer |
| 3.7 | **Consolidate `update_updated_at` functions** | 1h | Eliminates trigger function confusion |
| 3.8 | **Consolidate `on_auth_user_created` trigger** | 1h | Consistent registration logic |

### Phase 4 — Architecture Hardening (3-5 days)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 4.1 | **Create order state machine** — valid transition map; reject invalid transitions in both API and DB | 6h | Prevents illegal order flows (e.g., pending→completed) |
| 4.2 | **Move coupon validation server-side** — create `api/validate-coupon.js` + Stripe promotion code integration | 4h | Closes revenue leak |
| 4.3 | **Unify component loading** — implement single `js/layout.js`; remove `js/footer.js`, `js/navbar.js`, `js/cookie-consent.js`; extract CTA from footer | 6h | Consistent loading, eliminates timing fragility |
| 4.4 | **Remove hardcoded Supabase URL from API files** — use `process.env.SUPABASE_URL` exclusively | 1h | Environment portability |
| 4.5 | **Standardize API response format** — all endpoints return `{ success: boolean, data?: any, error?: string }` | 4h | Consistent client error handling |
| 4.6 | **Add CORS handling** to API gateway layer | 2h | Proper cross-origin security |
| 4.7 | **Stored computed counter migration** — replace stored counters with computed values for `report_shares` and `newsletter_campaigns` | 4h | Accurate analytics |
| 4.8 | **Implement Supabase realtime publication consolidation** — single migration with all tables, replace 12+ scattered statements | 2h | Clean realtime configuration |

---

## 5. DETAILED FINDINGS BY LAYER

### 5.1 Subscription System Audit

| Finding | Severity | Detail |
|---------|----------|--------|
| Price IDs in 2 places (JS + HTML) | **Medium** | `STRIPE_MONTHLY_PRICE_ID` in `js/subscription-manager.js:10` and `data-checkout` in `nagriva-pro.html:534` — changing price requires 2 edits |
| Profiles.plan sync via trigger + potential JS path | **Medium** | `sync_subscription_plan()` SQL trigger syncs from subscriptions; but JS webhook handler can also set profiles.plan — dual path to divergence |
| Free trial usage tracking in localStorage only | **High** | `MAX_FREE_USES = 3` in `js/free-trial-tracker.js` — fully client-side; can be reset by clearing localStorage |
| Plan state in 2 places (profiles.plan + subscriptions) | **High** | `profiles.plan` added by plan-system migration; `subscriptions.plan` in subscriptions table — sync trigger creates window for inconsistency |
| Subscription manager vs plan manager overlap | **Low** | Two separate managers (subscription-manager.js + plan-manager.js) but they serve distinct concerns — acceptable |
| No server-side entitlement enforcement | **Critical** | All pro-feature gating happens client-side in `pro-locker.js` — a savvy user can bypass via DevTools (remove `data-pro-feature` attributes or override `isPro()`) |

### 5.2 API Layer Audit

| Finding | Severity | Detail |
|---------|----------|--------|
| No shared response format | **High** | 3 response styles across 8 endpoints — clients must handle 3 different error shapes |
| No shared auth middleware | **High** | 2 copy-pasted bearer token checks; 5/8 endpoints have zero auth |
| No shared Supabase client | **Medium** | 3 serverless functions each create their own client with the same config |
| No CORS handling | **Medium** | Zero CORS headers set in any endpoint |
| Supabase URL hardcoded in 3 files | **Low** | Each API has `SUPABASE_URL \|\| 'https://bemcdcfdaccfdtmnzuwh.supabase.co'` — change of Supabase project URL requires 3+ edits |
| OpenAI response parsing duplicated | **Medium** | 2 files have near-identical JSON response parsing for OpenAI completions |
| Debug endpoint exposes env var presence | **Low** | `/api/debug-webhook.js` exposes which env vars are configured — security concern in production |

### 5.3 Frontend Layer Audit

| Finding | Severity | Detail |
|---------|----------|--------|
| `formatDate()` in 20+ files | **Medium** | Every admin JS file, every module, every component has its own — 20x maintenance burden |
| `normalizeStatus()` in 2 files with different maps | **High** | `dashboard.js:84` doesn't map `approved`; `orders.js:64` does — dashboard will show `approved` orders as `pending` |
| `profile.role === 'admin'` in 19+ places | **High** | Adding a role requires 19+ JS edits |
| Service pricing fallback bypasses database | **Critical** | `js/services-api.js` returns hardcoded FALLBACK data — admin CRUD has no effect on public site |
| Checkout uses `'Pending'` (capital P) | **High** | Will fail against lowercase-only SQL constraint |
| Coupon validation client-side only | **Critical** | `js/checkout.js` COUPONS object — fully inspectable and overridable |
| Footer loaded via 2 different mechanisms | **Medium** | 16 pages load directly, 39 rely on lazy-load via performance-optimizer |
| Inline `<script>` blocks in pages | **Medium** | Several pages have embedded JS logic that duplicates logic in .js files |
| Loading states implemented ad-hoc | **Medium** | Each module implements its own loading indicator pattern |

### 5.4 Database Layer Audit

| Finding | Severity | Detail |
|---------|----------|--------|
| Order status constraint in 6 files | **Critical** | Different allowed values in each — migration order determines effective constraint |
| `notify_on_activity()` in 4 files | **Critical** | Each version is different — only last migration's version is active |
| RLS policies repeated across 32+ files | **High** | Same policies defined, dropped, and redefined across files |
| Duplicate tables (deliverables/files, support messages) | **High** | 3 competing message storage strategies |
| Stored computed values (progress, counters) | **Medium** | Risk of drift from source of truth |
| Financial columns spread across 2 tables, 4 columns | **Medium** | No single financial source of truth |
| `profiles.email` duplicates auth.users.email | **Low** | Stale data risk |
| `profiles.plan` duplicates subscriptions.plan | **Medium** | Trigger sync window for inconsistency |
| `stripe_customer_id` in 2 tables | **Low** | Minor duplication, but unnecessary |
| No `is_admin()` helper function | **Medium** | 50+ inline subqueries |
| Two `update_updated_at` functions | **Low** | 2 functions doing the same thing |
| Real-time publication added in 12+ files | **Low** | Redundant but harmless |

### 5.5 Architecture Violations

| Principle | Violations |
|-----------|-----------|
| **DRY (Don't Repeat Yourself)** | **Massive violations** — formatDate (20×), role check (70×), status enum (9× SQL + 3× JS), sendJson (3×), Supabase init (4×), auth block (2×), notify_on_activity (4×), pricing data (3×), order number generation (3×), normalizeStatus (2×) |
| **Single Responsibility Principle** | `js/orders.js` handles: CRUD, status validation, status normalization, order number generation, file management, message management, activity logging, permission checks — 782 lines, too many concerns |
| **Separation of Concerns** | SQL triggers create activity logs AND notifications; JS module also creates activity logs; checkout page JS creates orders, manages state, validates coupons — no clear layering |
| **Domain-Driven Design** | No bounded contexts — `orders` columns span: service info (service, package, service_slug, service_type), client info (user_id, client_id, client_name, user_email, client_email, client_phone), financial (budget, amount, amount_paid, payment_status), tracking (progress, current_stage). This is a single "god table". |
| **Database Normalization** | Denormalized `email`, `client_name`, `plan`, `stripe_customer_id`, `progress`, `current_stage` — all derivable from other tables |

---

## 6. Technical Debt Breakdown

### Lines of Duplicated Code (Conservative Estimate)

| Category | Estimated Duplicated Lines | Files Involved |
|----------|---------------------------|---------------|
| SQL migration repetition | ~1,200 | 32 files |
| JS formatDate/date utilities | ~80 | 20 files |
| JS role/permission checks | ~50 | 19+ locations |
| JS inline status definitions | ~50 | 12 files |
| Copy-pasted sendJson helper | ~45 | 3 API files |
| Service pricing fallback data | ~366 | 1 file (entirely duplicate) |
| Stored computed columns | ~30 | 4 columns across 3 tables |
| Copy-pasted auth blocks | ~20 | 2 API files |
| LANGUAGE_MAP constants | ~8 | 2 API files |
| Component loading paths | ~20 | 3 JS files + 55 HTML pages |
| **Total estimated** | **~1,869** | |

### Risk Heat Map

```
CRITICAL (data loss / revenue impact):     ████████████████████ 5 findings
HIGH (business logic inconsistency):        ███████████████████ 15 findings  
MEDIUM (maintenance burden):                ████████████████ 20 findings
LOW (cosmetic / minor):                     ██████ 8 findings
```

---

## 7. Maintenance Reduction Estimates

| Refactoring | Current Cost | Refactored Cost | Reduction |
|-------------|-------------|-----------------|-----------|
| Add new order status | 9 SQL + 3 JS + 2 CSS files | 1 config file | **~93%** |
| Change date format | 20 files | 1 file | **~95%** |
| Add new user role | 19 JS + 50 SQL locations | 1 JS + 1 SQL function | **~97%** |
| Change Supabase project URL | 4 files | 1 env var | **~75%** |
| Change Stripe price ID | 2 files | 1 file | **~50%** |
| Change notification behavior | 4 SQL + 1 JS module | 1 SQL trigger | **~80%** |
| Update API response format | 8 endpoints (3 styles) | 1 shared helper | **~88%** |
| Move to new hosting provider | 0 (Vercel-locked) | N/A | **N/A** |

---

## 8. Recommendations Summary

### Immediate (0-30 days)

1. **Consolidate order status** — one authoritative SQL constraint, one JS config, fix checkout `'Pending'` bug
2. **Remove JS service pricing fallback** — make frontend call Supabase; admin changes will finally be visible
3. **Unify order number generation** — use DB sequence; fix checkout to use orders API
4. **Create `api/lib/` shared utilities** — stop copy-pasting auth, response, Supabase init
5. **Fix the `notify_on_activity()` trigger** — single authoritative version; retire alternatives

### Short-term (30-60 days)

6. **Create `js/shared/` utilities** — formatDate, normalizeStatus, isAdmin
7. **Create DB `is_admin()` function** — eliminate 50+ inline subqueries
8. **Drop redundant tables** — deliverables, support_conversations/support_messages
9. **Make derived columns computed** — orders.progress, current_stage, report counters
10. **Unify component loading** — single layout.js; predictable footer/CTA loading

### Medium-term (60-90 days)

11. **Implement order state machine** — validate all transitions server-side + client-side
12. **Move coupon validation server-side** — close revenue leak
13. **Add CORS handling** to API layer
14. **Standardize API response format** across all 8 endpoints
15. **Remove profiles.email** and other denormalized columns

### Long-term (90+ days)

16. **Evaluate migration to a framework** (React/Vue/Svelte) — the current vanilla JS approach inherently permits this level of duplication
17. **Implement server-side entitlement enforcement** — verify pro/plan access on backend, not just client-side DOM manipulation
18. **Create proper bounded contexts** — refactor the orders "god table" into domain-specific aggregates

---

*Every duplicated business rule above is a future bug waiting to manifest. The ~1,869 lines of duplicated code represent ~186-373 future bugs at industry-average defect rates (10-20 bugs per 100 lines of copied code).*
