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

## Notes

- Node.js 20 works; `nanoid@6` prefers Node 22+ but install succeeds on Node 20.
- Bill analyses are stored under `data/runtime/` (gitignored). Ensure the host has a writable data directory if you persist analyses between restarts.
- Do not silently overwrite `data/constitution/kenya-2010.v1.json`. Re-parse only with `npm run constitution:parse` when updating the knowledge base deliberately.
