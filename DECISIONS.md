# Product Decisions

## Target Market
- English and Portuguese speakers
- Distribution: Google Play Store (Android)

---

## Plans & Pricing

| Plan | Seats | Minutes/seat/month | Price | Channel |
|---|---|---|---|---|
| Personal | 1 | 60 min | $5.99/month | Play Store |
| Team | 5 | 60 min | $19.99/month | Stripe (web) |
| Business | 15 | 60 min | $49.99/month | Stripe (web) |

- No unlimited plans — hard limits enforced
- Extra minutes: in-app purchase (add-on), TBD

---

## Payment Architecture

```
Personal  → Google Play Billing (Play Store mandatory)
           └── RevenueCat (@revenuecat/purchases-capacitor)

Team/Biz  → Stripe Checkout (web redirect from app)
           └── Stripe webhook → Supabase updates subscription
```

- Entitlements source of truth: Supabase `subscriptions` table
- Stripe chosen over Play Store for Team/Business: ~3.5% fee vs 15%

---

## Tech Stack

| Layer | Technology |
|---|---|
| Auth + DB | Supabase |
| Payments (Personal) | Google Play Billing + RevenueCat |
| Payments (Team/Business) | Stripe + webhooks |
| Hosting | Vercel Pro |
| App | Next.js 16 + Capacitor (Android) |
| Audio transcription | OpenAI Whisper |
| Task extraction | GPT-4o-mini (not GPT-4o — 33x cheaper) |

---

## DB Schema (high level)

```
users
organizations
memberships (user ↔ org, role: admin/member)
subscriptions (org ↔ plan, status, seats, minutes_limit)
processings (audio jobs, user_id, org_id, duration_minutes, created_at)
```

---

## Cost Model (at 5,000 users, 60 min/user/month)

Variable cost per seat: ~$0.37/month (Whisper + GPT-4o-mini)

| Plan | Gross | Fees | Variable | Net margin |
|---|---|---|---|---|
| Personal $5.99 | $5.99 | -$0.90 (Google 15%) | -$0.37 | ~$4.72 (79%) |
| Team $19.99 | $19.99 | -$1.00 (Stripe ~3.5%) | -$1.85 (5 seats) | ~$17.14 (86%) |
| Business $49.99 | $49.99 | -$2.05 (Stripe ~3.5%) | -$5.55 (15 seats) | ~$42.39 (85%) |

Fixed costs: Vercel Pro $20 + Supabase Pro $25 = $45/month

---

## Build Sequence

```
Sprint 1 — Foundation
  ├── Supabase project setup (auth + DB schema)
  ├── Sign up / Login screens
  └── Protect /api/process by authenticated user

Sprint 2 — Product
  ├── Onboarding (3-4 screens)
  └── History (save + list processings per user/org)

Sprint 3 — Monetization
  ├── Google Play Console → create subscription products
  ├── RevenueCat setup + integrate purchases-capacitor
  ├── Stripe products + webhook endpoint
  ├── Paywall screen
  └── Entitlement enforcement (minutes limit)
```
