# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev        # local dev server
npm run build      # production build (run before deploying)
npm run lint       # ESLint
npm run test       # Vitest in watch mode
npm run test:run   # Vitest single run (CI)

# Capacitor (Android)
npx cap sync android          # sync web assets to Android project
npx cap open android          # open Android Studio
npx cap run android           # build + deploy to connected device
```

Tests live in `__tests__/` mirroring the source structure (`lib/`, `api/`, `pages/`). Setup file at `__tests__/setup.ts` mocks Capacitor and `next/navigation` globally.

## Architecture

**Stack:** Next.js 16 (App Router) + Capacitor 8 (Android WebView) deployed on Vercel. The Capacitor app is a WebView pointing to the production Vercel URL — there is no local native build of the web layer.

```
app/                    Next.js App Router
  api/process/          Server-side: Whisper transcription + GPT-4o-mini extraction
  auth/                 Login, signup, forgot-password, OAuth callback
  history/              List + detail of past processings
  onboarding/           4-screen new user flow
  components/
    AuthProvider.tsx    Auth context + redirect guard (login → onboarding → home)
    Upload.tsx          Audio file picker + share target (Capacitor)
    Result.tsx          Renders extracted tasks JSON

lib/
  openai.ts             Singleton OpenAI client
  prompt.ts             SYSTEM_PROMPT for GPT-4o-mini task extraction
  supabase/
    client.ts           Browser Supabase client (localStorage persistence)
    server.ts           Server Supabase client + getUserFromRequest()

supabase/
  schema.sql            Full DB schema — run in Supabase SQL Editor to apply
```

## Auth flow

`AuthProvider` (wraps entire app in `layout.tsx`) controls routing:
1. No session → `/auth/login`
2. Session + `profiles.onboarding_completed = false` → `/onboarding`
3. Session + onboarding done → `/` (home)

OAuth (Google/Facebook) uses Supabase web redirect. Native Capacitor OAuth plugins not yet installed — web redirect works but opens system browser.

## API route (`/api/process`)

Requires `Authorization: Bearer <supabase_access_token>` header. Flow:
1. Validates token via `getUserFromRequest()`
2. Whisper transcribes audio (forced to `.ogg` to handle WhatsApp `.opus` files)
3. GPT-4o-mini extracts structured JSON (`tasks[]` + `summary`)
4. Saves to `processings` table via service role client
5. Returns JSON to client

## Database (Supabase)

Tables: `profiles`, `organizations`, `memberships`, `subscriptions`, `processings`. RLS enabled on all. Only `service_role` (server-side) writes to `processings` and `subscriptions`. Client reads own rows via RLS policies.

`profiles` auto-created on signup via trigger `on_auth_user_created`. Key field: `onboarding_completed boolean`.

Helper function: `minutes_used_this_month(user_id, org_id)` — used for usage enforcement in Stage 4.

## Capacitor notes

- `capacitor.config.ts` points `server.url` to Vercel production — the Android app loads the live site
- Share target (`@capgo/capacitor-share-target`) allows receiving audio files shared from WhatsApp etc.
- Audio files received via share are converted to `File` objects and auto-processed

## Environment variables

See `.env.local`. All `NEXT_PUBLIC_` vars are available client-side. `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` are server-only. Stripe and OAuth keys have `REPLACE_ME` placeholders until configured.

## Roadmap

See `DECISIONS.md` (product/stack decisions) and `ROADMAP.md` (staged build plan). Stages 1–3 complete. Stage 4 (monetization: Google Play Billing + Stripe) is next.
