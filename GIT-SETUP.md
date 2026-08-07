# Getting Mise onto GitHub and Netlify

Your commands were close. Two things need changing before they'll work.

**You can't `cd` into a zip.** Windows shows an archive as if it were a
folder, but the command line can't enter one. It has to be extracted first.

**Don't extract in place.** `Downloads` has everything else you've ever
downloaded in it, and `git add .` would commit the lot. The files need
their own folder.

---

## 1. Extract to its own folder

In File Explorer, right-click `Misu.zip` → **Extract All…** and set the
destination to:

```
C:\Users\richa\Documents\meal-planner
```

Anywhere is fine as long as it's an empty folder that isn't Downloads.

Check what landed. You should see exactly this, with `netlify` as a folder
containing a `functions` folder inside it:

```
index.html
manifest.json
sw.js
version.txt
netlify.toml
netlify\functions\fetch-recipe.js
README.md
DEPLOYING.md
```

If extracting produced a single folder with everything nested inside it,
step into that folder instead — Git needs `index.html` at the top level or
Netlify won't find the site.

---

## 2. Push it

Open PowerShell and run these one at a time:

```powershell
cd C:\Users\richa\Documents\meal-planner

git init
git add .
git commit -m "Mise: recipes, planning and shopping"
git branch -M main
git remote add origin https://github.com/Krakle/Meal-Planner.git
git push -u origin main
```

If `git push` asks you to sign in, use the browser prompt rather than
typing a password — GitHub stopped accepting account passwords for Git in
2021, so a password will simply be rejected.

If it refuses because the repository already has content, this pulls that
in first:

```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

## 3. Point Netlify at the repo

In your Netlify site: **Site configuration → Build & deploy → Continuous
deployment → Link repository**, then pick `Krakle/Meal-Planner`.

When it asks for build settings:

| Field | Value |
|---|---|
| Build command | *leave empty* |
| Publish directory | `.` |
| Functions directory | leave it — `netlify.toml` already sets this |

There's nothing to compile, so an empty build command is correct.

---

## 4. Check it worked

Two addresses:

- `https://your-site.netlify.app/version.txt` → should read the build
  string from `version.txt`
- `https://your-site.netlify.app/.netlify/functions/fetch-recipe?url=https://example.com`
  → should return JSON, not a 404

That second one is the payoff. Drag-and-drop deploys never registered the
link fetcher, so imports have been going through public relays. With Git,
Netlify picks the function up properly and your imports stop depending on
someone else's server.

---

## Afterwards

Deploying becomes three commands:

```powershell
git add .
git commit -m "what changed"
git push
```

Netlify publishes within a minute or so.

Two habits worth keeping:

- **Bump the build string** in `version.txt` and in `index.html` (the line
  `const BUILD = "…"`) whenever you change something. They should always
  match. When they don't, the app is serving a cached copy — and you'll
  know that immediately instead of debugging the wrong thing.
- **Stop using drag-and-drop.** Once the repo is linked, a manual drop
  creates a deploy that doesn't match the repository, and the next push
  silently overwrites it. Pick one route and stay on it.

## One thing not to commit

Nothing in these files holds a secret — your GitHub token and any API key
live in the browser on your phone, not on disk. So this repository is safe
to make public if you want.

Worth remembering as the app grows: if you ever add a file with a key in
it, Git keeps it in the history even after you delete it, so it has to be
kept out from the start.
