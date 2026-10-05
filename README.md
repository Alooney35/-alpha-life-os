# Alpha Life OS

Training, nutrition, and money on one scoreboard. Next.js 15 · Supabase · Tailwind 4 · Recharts. Mobile-first PWA with dark and light mode.

Everything in this build runs on free tiers: Supabase Free, Vercel Hobby, USDA FoodData Central, and Open Food Facts.

## What's built

| Area | Status |
|---|---|
| Auth: email magic link + Google | Done |
| Dashboard with Alpha Score (4 × 25%) and A+–D grade | Done |
| Body: weigh-ins, body fat, waist, 7-day average, weekly change, goal-date projection | Done |
| Macro calculator: Alpha Mode + calculated (Mifflin-St Jeor / Katch-McArdle), 6 goal types, day/meal/week targets | Done |
| Food logger: USDA search, barcode scan (camera on Android Chrome, typed fallback elsewhere), 4 meals, copy yesterday | Done |
| Training: default split, set/rep/weight/RPE logging, auto progressive overload (+5 upper / +10 lower, repeat on miss, 10% deload after two misses) | Done |
| PR center with auto-detection by estimated 1RM, 500 squat / 315 bench progress | Done |
| Workout calendar: completed / missed / upcoming, compliance % | Done |
| Allowance center: $50/75/100/150/custom, categories, projected spend, 50/75/90/100% alerts, rollover | Done |
| Net worth (manual accounts) and savings goals | Done |
| Habits: 6 defaults, streaks, 7/30-day scores, 12-week heatmap | Done |
| Sunday check-in with grade and action plan | Done |
| PWA: installable, offline page cache | Done |
| Full database schema for every module, with row-level security | Done |

## Setup (about 15 minutes)

1. **Supabase.** Create a free project at supabase.com. In SQL Editor, run `supabase/migrations/0001_init.sql`, then `0002_seed.sql`.
2. **Google sign-in.** Create an OAuth client in Google Cloud Console (Web application). Add `https://YOUR-PROJECT.supabase.co/auth/v1/callback` as an authorized redirect URI. Paste the client ID and secret into Supabase → Authentication → Providers → Google.
3. **Redirect URLs.** In Supabase → Authentication → URL Configuration, set Site URL to your domain. Add `http://localhost:3000/auth/callback` and `https://YOUR-DOMAIN/auth/callback`.
4. **USDA key.** Get a free key at fdc.nal.usda.gov/api-key-signup. Without one, it falls back to `DEMO_KEY`, which is rate-limited.
5. **Run it:**
   ```bash
   cp .env.example .env.local   # fill in the values
   npm install
   npm run dev
   ```

## Deploy to Vercel (free)

1. Push to GitHub, then import the repo at vercel.com/new.
2. Add the four env vars from `.env.example`. Set `NEXT_PUBLIC_SITE_URL` to your Vercel URL.
3. Deploy. Add the Vercel URL's `/auth/callback` to Supabase redirect URLs.
4. On iPhone: open in Safari → Share → Add to Home Screen.

## Tests

```bash
npm test         # 18 unit tests: macros, overload, allowance, scoring, weight projection
npm run typecheck
npm run build
```

### Testing plan for later phases
- **Unit:** every function in `src/lib/calc` stays pure and covered. Add a test whenever a formula changes.
- **RLS:** sign in as two test users and confirm that user B gets zero rows from every table user A wrote to.
- **E2E (Playwright):** login → log weight → log food → finish workout → add purchase past 90% → check-in. Run on a 390px viewport.
- **Manual device pass:** iPhone Safari PWA install, Android Chrome barcode scan, offline reload of the dashboard.

## Project layout

```
supabase/migrations/   schema, RLS, seed data
src/lib/calc/          pure business logic (tested, no I/O)
src/lib/data/          Supabase queries that feed pages
src/lib/supabase/      browser/server clients + session middleware
src/app/(app)/         signed-in screens; each has page.tsx + actions.ts
src/app/api/foods/     USDA search + Open Food Facts barcode lookup
public/                manifest, service worker, icon
docs/ARCHITECTURE.md   architecture, ERD, flows, roadmap
```
