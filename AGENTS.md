<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Sunday Pool

Card & Snooker league results: a public site plus a private admin area, running on free-tier Vercel and Supabase. `README.md` covers setup, seeding and deployment — this file covers what the code does not say plainly.

## Commands

```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve the production build
npm run typecheck  # tsc --noEmit
npm test           # node --test lib/*.test.ts
npm run seed       # load sample data into Supabase
npm run icons      # regenerate icons from public/favicon.png
```

**Always rebuild after every change:** run `npm run build` before handing work back, so `npm start` never serves stale code. Build with the real `.env.local` and **never with the Supabase vars blanked out**. `NEXT_PUBLIC_*` values are baked in at build time, so a build made that way makes `npm start` act as if Supabase isn't connected (`/manage` shows "connect Supabase"). To try the sample data, blank the vars for `npm run dev` only. On Windows, stop a running `next start` first, since it locks `.next`.

## Stack

Next 16 (App Router, Turbopack) · React 19 · Supabase. Deliberately **no** Tailwind, no UI library and no date library. Styling is hand-written global CSS with BEM-ish names in `app/globals.css`; admin-only styles live in `app/manage/manage.css`.

## Layout

- `app/(site)` — public: `/` (latest published day; `?date=YYYY-MM-DD` views another), `/history` and `/player/[handle]` (profile + the days that player played, via `fetchDaysWithCount`'s `playerId`).
- `app/manage/(panel)` — admin behind `requireAdmin()`: day setup and players.
- `proxy.ts` — middleware scoped to `/manage/:path*` only; public routes run no middleware.
- Everything is a server component except `Avatar`, `SiteHeader`, `InstallBanner` and `DownloadResults`.

## Data model

`match_days` (`date` unique, `status` `draft` | `published`) → `matches` (one per type per day) → `scores`. Schema and policies live in `supabase/schema.sql`.

RLS exposes only `status = 'published'` rows to `anon`, so the public client is safe by default — but the sample-data path has no RLS and **must filter status itself**.

## Result rules

Winner / draw / protein logic lives in `lib/results.ts`, is spelled out in `README.md`, and is covered by `lib/results.test.ts`. Call `computeResult`; don't re-derive the rules in a component.

## Conventions

- **Dates** are `YYYY-MM-DD` strings parsed in **UTC** (`lib/format.ts`), so the day never shifts with the viewer's timezone. Keep it that way.
- **Handles** (`players.handle`, required, unique) are the profile URL. `lib/player-form.ts` checks them with the same regex as the DB constraint; keep the two in sync. Live projects created before profiles need `supabase/migrations/2026-09-26-player-profile.sql`.
- **Player quotes are Burmese.** They are stored NFC-normalised. Noto Sans Myanmar comes after Inter in both font stacks and is fetched only when Burmese glyphs appear (unicode-range, `preload: false`). Burmese text needs a line-height of about 1.8–1.9 and no italics.
- **Avatars use plain `<img>`**, deliberately, to stay off Vercel's image-optimisation quota.
- **`manage.css` classes such as `.btn` are not available on public pages** — it is imported by `app/manage/layout.tsx` only.
- **Clash Grotesk loads from the Fontshare API** rather than being self-hosted: its licence forbids redistributing the font files through a public repo. Don't commit font files.
- **Installable without a service worker**, deliberately: Chrome only needs `app/manifest.ts` plus its 192/512 icons (`npm run icons`). `InstallBanner` captures `beforeinstallprompt` at module load, since it can fire before hydration.
- **Results image** (`DownloadResults`, the icon in the home hero): the image is always the desktop layout, so a phone and a desktop download the same file. A page only lays itself out for its own window, so the capture re-loads the current URL into an off-screen 1100px iframe (via `srcdoc` with the scripts stripped, so the app doesn't hydrate a second time over the nodes being read). `modern-screenshot` then copies `[data-capture-root]` (the `.page` wrapper: main + footer, no menus) and skips anything marked `data-capture-exclude`. Those nodes belong to the frame's realm, so test them with `nodeType`, never `instanceof`. The copy drops `backdrop-filter`, which blurs up to its backdrop root: the copy is its own root, and on phones the glass cards smeared the page around them. The logo + "Sunday Pool" row at the top of the image is drawn onto the canvas afterwards, not captured. It can only embed what it may fetch with CORS: Supabase Storage photos and the Fontshare stylesheet (hence its `crossOrigin`) work; the seeded `i.pravatar.cc` photos fall back to initials.
- Comment only where the reason isn't evident from the code.

## Caching and invalidation

The least obvious part of the codebase.

- `/` and `/history` are **dynamic** — both read `searchParams`, so route-level ISR (`export const revalidate`) does nothing. The **data** cache is what matters.
- Public reads go through `unstable_cache` in `lib/queries.ts`, tagged `days` and `players`.
- Invalidate with **`updateTag`**, not `revalidateTag` (see `app/manage/actions.ts`). In a Server Action `updateTag` expires immediately, so an admin sees their publish at once; `revalidateTag(tag, 'max')` would serve stale content after publishing.
- Paged queries use `fetchDaysWithCount` — rows and the total arrive in **one** request via PostgREST's `Content-Range`. Don't reintroduce a separate head-count query.
- Caching is invisible under `npm run dev`: in development Next always renders pages on demand. Measure with `npm run build && npm start`.

## Local development

With no Supabase env vars set, every public page falls back to `lib/sample-data.ts` and serves with zero network I/O — by far the fastest local loop for UI work. With `.env.local` populated, every page load hits the live (free-tier, possibly cold) Supabase project.
