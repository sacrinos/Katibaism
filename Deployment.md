# Deployment

## Publish to GitHub

Repository: `https://github.com/sacrinos/Katibaism.git`

### Push `main`

Before pushing, make sure local `main` is up to date:

```bash
git checkout main
git pull origin main
git push origin main
```

If `git push origin main` fails with:

```text
fatal: could not read Username for 'https://github.com': No such device or address
```

the remote is using HTTPS and GitHub credentials are not configured on this machine.

**Option A — use SSH (recommended if you already have a GitHub SSH key):**

```bash
git remote set-url origin git@github.com:sacrinos/Katibaism.git
git push origin main
```

**Option B — authenticate HTTPS with GitHub CLI:**

```bash
gh auth login
git push origin main
```

**One-off push over SSH without changing the remote:**

```bash
git push git@github.com:sacrinos/Katibaism.git main:main
```

### Feature branches

Work on a branch, commit, then push:

```bash
git checkout -b cursor/katibaism-mvp-41ae
git add .
git commit -m "Your message"
git push -u origin cursor/katibaism-mvp-41ae
```

To update `main` from a feature branch:

```bash
git push origin cursor/katibaism-mvp-41ae:main
```

## Run locally

```bash
npm install
npm test
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional LLM refinement: copy `.env.example` to `.env.local` and set one provider key. Without a key, the deterministic engine still produces cited findings.

## Production build

```bash
npm run build
npm start
```

Set environment variables from `.env.example` in your hosting provider before deploying.

## Publish on Vercel

Katibaism is a Next.js app. Analyses persist in Supabase Postgres, so a serverless host works if `KATIBAISM_STORE=postgres` is set.

1. Import `https://github.com/sacrinos/Katibaism` in [Vercel](https://vercel.com/new).
2. Set these environment variables on the project (Production and Preview):

```bash
KATIBAISM_STORE=postgres
SUPABASE_URL=https://qjbajqdmehqmrgqmowkf.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://qjbajqdmehqmrgqmowkf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only service role key>
NEXT_PUBLIC_SITE_URL=https://<your-vercel-domain>
```

3. Deploy. The first successful production deploy gives you a public URL such as `https://katibaism.vercel.app`.
4. Point `katibaism.ke` at that project in Vercel once the preview looks right.
5. After the live origin is known, set `NEXT_PUBLIC_SITE_URL` to that origin and redeploy so share cards use it.

Share links use `NEXT_PUBLIC_SITE_URL`, then the Vercel production host, then `https://katibaism.ke`.

The bill analysis route allows 60 seconds (`maxDuration`) so PDF extraction and the rules engine can finish on the host.

## Notes

- Node.js 20 works; `nanoid@6` prefers Node 22+ but install succeeds on Node 20.
- With `KATIBAISM_STORE=postgres`, analyses persist in Supabase. The local file store (`data/runtime/`, gitignored) is only the default for machines without Postgres env vars.
- Do not silently overwrite `data/constitution/kenya-2010.v1.json`. Re-parse only with `npm run constitution:parse` when updating the knowledge base deliberately.
