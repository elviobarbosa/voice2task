# Development Roadmap

## Current state
- Next.js 16 + Capacitor (Android)
- Audio upload → Whisper → GPT-4o-mini → task list
- No auth, no DB, no payments
- Deployed on Vercel, Capacitor points to production URL

---

## Stage 0 — External Services Setup
*Do this before writing any code*

- [x] Create Supabase project → `ytemurvflobeksxmidow.supabase.co`
- [x] RevenueCat account created → test key configured
- [x] Env vars scaffold created in `.env.local`
- [x] `SUPABASE_SERVICE_ROLE_KEY` → configurado
- [ ] Create Google Play Console account + app listing ($25)
- [ ] Create Stripe account + products (Team $19.99, Business $49.99)
- [ ] Enable Google OAuth in Supabase → Google Cloud Console → OAuth client ID
- [ ] Enable Facebook OAuth in Supabase → Facebook Developer App ID + Secret
- [ ] RevenueCat: link Google Play + create `personal_access` entitlement

---

## Stage 1 — Auth & Database
*Goal: users can sign up, log in, and existing feature is protected*

### 1.1 DB Schema (Supabase)
- [x] `profiles` (id, name, onboarding_completed) — extends auth.users via trigger
- [x] `organizations` (id, name, owner_id)
- [x] `memberships` (user_id, org_id, role: admin|member)
- [x] `subscriptions` (org_id, plan, status, seats, minutes_limit, stripe_subscription_id, google_purchase_token, current_period_end)
- [x] `processings` (id, user_id, org_id, duration_seconds, result_json)
- [x] RLS policies for all tables
- [x] `minutes_used_this_month()` helper function
- [x] Rodar `supabase/schema.sql` no SQL Editor do Supabase

### 1.2 Auth Screens
- [x] Login screen (email + password + Google + Facebook)
- [x] Signup screen
- [x] Forgot password screen
- [x] OAuth callback page
- [x] Auth state persistence (localStorage via Supabase SDK)
- [x] `AuthProvider` — redirect guard (unauthenticated → /auth/login)
- [x] Logout button no header da home

### 1.3 Native OAuth (Capacitor plugins)
- [ ] Install `@capacitor-community/google-auth` → passes token to Supabase `signInWithIdToken`
- [ ] Install `@capacitor-community/facebook-login` → passes token to Supabase `signInWithOAuth`
- [ ] Android: configure `google-services.json` (from Firebase/Google Cloud)
- [ ] Android: configure Facebook App ID in `AndroidManifest.xml`
- [ ] **Nota:** OAuth via web (redirect) já implementado e funcional — plugins nativos melhoram UX no Android

### 1.4 API Protection
- [x] `/api/process` validates Supabase session token (401 se não autenticado)
- [x] Salva cada processamento em `processings` table
- [x] Upload component envia `Authorization: Bearer <token>` header

**Deliverable:** App requires login. Processing is saved per user. ✅

---

## Stage 2 — Onboarding
*Goal: new user understands the product before hitting paywall*

- [x] Onboarding screen 1: "Voz vira tarefas" (value prop) — PT + EN
- [x] Onboarding screen 2: "Funciona em qualquer situação" (use cases)
- [x] Onboarding screen 3: "Compartilhe com seu time"
- [x] Onboarding screen 4: Plan selection preview (Personal / Team / Business)
- [x] Skip onboarding if `profiles.onboarding_completed = true`
- [x] Mark onboarding as complete on "Começar" → `profiles.onboarding_completed = true`
- [x] AuthProvider redireciona novo usuário → `/onboarding` automaticamente

**Deliverable:** First-time user is guided to plan selection. ✅

---

## Stage 3 — History
*Goal: users can see past processings*

- [x] History screen (`/history`): lista com data, duração, preview de tarefas
- [x] Detail screen (`/history/[id]`): resultado completo reutilizando `Result` component
- [x] Empty state para novos usuários
- [ ] Filter by date (v2)
- [x] Usage meter na home e no histórico: "X / 60 min este mês" com barra de progresso
- [x] Barra muda de cor: azul → âmbar (80%) → vermelho (100%)

**Deliverable:** Users can review past work and track usage. ✅

---

## Stage 3.5 — i18n (PT + EN)
*Goal: app detects device language and serves correct language automatically*

**Approach:** `next-intl` + `navigator.language` detection on client. No manual toggle — fully automatic.

### Setup
- [x] Install `next-intl`
- [x] Create `messages/pt.json` + `messages/en.json`
- [x] Create `app/components/I18nProvider.tsx` — detects `navigator.language`, default `en`, wraps app
- [x] Wrap app with `NextIntlClientProvider` in `layout.tsx`

### Translate UI strings
- [x] Auth screens (login, signup, forgot-password)
- [x] Onboarding screens
- [x] History page (labels, empty state, usage meter)
- [x] Home page (header, buttons, errors)
- [x] Upload component

### API / AI
- [x] Update `SYSTEM_PROMPT` to detect audio language and respond in same language
- [x] Return task text in audio's language (EN audio → EN tasks, PT audio → PT tasks)

**Deliverable:** PT device → app in Portuguese. EN device → app in English. Audio language independent of UI language.

---

## Stage 4 — Monetization
*Goal: plans enforced, payments working*

### 4.1 Entitlement Logic
- [ ] `useSubscription` hook: reads plan from Supabase
- [ ] Minute limit enforcement: block processing if monthly usage exceeded
- [ ] Paywall screen shown when limit reached or no active plan

### 4.2 Personal Plan — Google Play Billing
- [ ] Install `@revenuecat/purchases-capacitor`
- [ ] Configure RevenueCat: Android app + entitlements
- [ ] Create Personal subscription in Google Play Console ($5.99/month)
- [ ] Purchase flow in app
- [ ] RevenueCat webhook → Supabase updates subscription status

### 4.3 Team & Business Plans — Stripe
- [ ] Create Stripe products: Team ($19.99) and Business ($49.99)
- [ ] `/api/stripe/checkout` endpoint: creates Checkout Session
- [ ] `/api/stripe/webhook` endpoint: handles `customer.subscription.*` events
- [ ] App opens Stripe Checkout in browser (Capacitor Browser plugin)
- [ ] Deep link back to app after payment
- [ ] Supabase subscription record updated via webhook

**Deliverable:** All 3 plans purchasable. Usage limits enforced.

---

## Stage 5 — Team Features
*Goal: org admin can invite and manage members*

- [ ] Create org on Team/Business plan activation
- [ ] Invite member by email (Supabase email invite or custom)
- [ ] Accept invite flow (deep link)
- [ ] Member list screen (admin only)
- [ ] Per-member usage display
- [ ] Remove member
- [ ] Seat limit enforcement (block invite if seats full)

**Deliverable:** Wife can invite receptionist. Admin sees team usage.

---

## Stage 6 — Play Store Release
*Goal: ship to production*

- [ ] App icons (all densities)
- [ ] Splash screen
- [ ] Play Store screenshots (EN + PT)
- [ ] Store listing copy (EN + PT)
- [ ] Privacy policy page
- [ ] Terms of service page
- [ ] Content rating questionnaire
- [ ] Internal test → Closed test → Production rollout
- [ ] Capacitor config: switch from dev server to production build

---

## Dependencies map

```
Stage 0 (setup)
    └── Stage 1 (auth + DB)
            ├── Stage 2 (onboarding)
            ├── Stage 3 (history)
            └── Stage 4 (monetization)
                    └── Stage 5 (team features)
                            └── Stage 6 (release)
```

Stages 2 and 3 can be built in parallel after Stage 1.

---

## Out of scope (v1)

- iOS / App Store
- Web app (browser, non-Capacitor)
- Annual pricing
- Extra minutes add-on purchase
- Admin analytics dashboard
- Export (PDF, CSV)
- Integrations (Notion, Trello, etc.)
