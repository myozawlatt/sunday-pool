# Sunday Pool

Card & Snooker league results. It's a Next.js site with a private admin area.

- **Public:** `/` shows the latest published match day. Add `?date=YYYY-MM-DD` to preview another day. `/history` shows the last 5 match days.
- **Admin:** sign in at `/manage/gate`. `/manage` lists match days (draft or published, edit, delete). `/manage/players` handles names and photos.

## Result rules (per match)

- **Winner:** the single highest scorer, with more than 0 points. They get the 👑 crown.
- **Draw:** two or more players share the top score. There's no winner and no crown.
- **Losers:** every player on 0 points. Each gets the 🍳 fried egg.
- **Draw for all:** no winner and no losers.
- **Ranks:** equal scores share a rank: 1, 1, 2, 3, 4, 4.

The logic is in `lib/results.ts`, with tests in `lib/results.test.ts`.

## Run locally

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # result-rule and form-validation tests
```

Without Supabase settings, the public pages show the sample data in `lib/sample-data.ts`, and `/manage` explains how to connect.

## Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor:** paste and run `supabase/schema.sql`. It creates the tables, security rules, the save function and the `avatars` photo bucket.
3. **Authentication → Sign In / Providers:** turn **off** "Allow new users to sign up". Then **Authentication → Users → Add user** creates your admin email and password.
   Keep sign-ups off: any signed-in user can edit data.
4. **Project Settings → API Keys:** copy `.env.example` to `.env.local` and fill in the URL and publishable key. Add the secret key only if you want to seed.
5. Optional: `npm run seed` loads the sample players and match days into the empty database.
6. Restart `npm run dev` and sign in at `/manage/gate`.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. On [vercel.com](https://vercel.com), choose **Add New → Project** and import the repository.
3. Under **Environment Variables**, add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `CRON_SECRET` (any long random string). Don't add the secret key.
4. Deploy. `vercel.json` runs `/api/keep-alive` once a day, so the free Supabase project isn't paused after a week with no activity.

## Notes

- **Logo & favicon:** `public/favicon.png` is the source image. After replacing it, run `npm run icons` to regenerate `app/icon.png`, `app/apple-icon.png`, `public/logo.png` and the install icons (`public/icon-512.png`, `public/icon-maskable.png`).
