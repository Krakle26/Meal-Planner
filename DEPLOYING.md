# Getting Mise onto Netlify

## The problem you hit

Dragging a folder onto Netlify is the fastest way to publish and the
easiest way to publish something other than what you meant to. There is no
build step, no record of what shipped, and nested folders are unreliable.
Twice in this build, the site was serving a mix of old and new files with
nothing on screen to say so.

Two habits fix that permanently: deploy a zip rather than a folder, and
check `version.txt` after every deploy.

---

## Route A — drag the zip (quick)

1. Open your site in Netlify.
2. Click the **Deploys** tab along the top. This matters — the site
   overview page looks like it takes a drop but often doesn't create a
   deploy.
3. Drag `mise-site.zip` onto the drop zone near the bottom, the one
   reading *"Drag and drop your site output folder here"*.
4. Do **not** unzip first. Netlify unpacks it and keeps the
   `netlify/functions/` folder, which a plain folder drag tends to lose.
5. Wait for the deploy to say **Published**.

Then verify, in this order:

| Check | Address | Expected |
|---|---|---|
| Server updated | `/version.txt` | `2026-08-01p` |
| App updated | Settings in the app | Build `2026-08-01p` |
| Fetcher registered | `/.netlify/functions/fetch-recipe?url=https://example.com` | JSON, not a 404 |

**If `/version.txt` 404s**, the deploy didn't happen. Look at the Deploys
list — if there is no new entry timed to when you dropped the zip, it never
landed.

**If `/version.txt` is right but the app shows an older build**, that's
only cache. Settings has a *Check for an update* button, or add `?v=2` to
the site address to bypass the stored copy.

**If the fetcher 404s**, nothing is broken. Link import falls back to a
public relay and keeps working — the app says which route it used. The
relay sees the recipe addresses you import and is slower. Route B removes
it from the picture.

---

## Route B — connect Git (worth the half hour)

This ends the whole class of problem. You push, Netlify deploys, and the
dashboard shows exactly what is live. Functions register properly, and
every deploy can be rolled back.

1. Put the unzipped files in a folder on your computer, keeping the
   structure:

   ```
   index.html
   manifest.json
   sw.js
   version.txt
   netlify.toml
   netlify/functions/fetch-recipe.js
   ```

2. Create an empty repository on GitHub.

3. In that folder, run:

   ```bash
   git init
   git add .
   git commit -m "Mise"
   git branch -M main
   git remote add origin https://github.com/YOUR-NAME/YOUR-REPO.git
   git push -u origin main
   ```

4. In Netlify: **Site configuration → Build & deploy → Link repository**,
   and pick the repo. Leave the build command empty and set the publish
   directory to `.` — there is nothing to build.

From then on, `git push` publishes.

---

## After any change

Bump the build string in two places so the checks above stay meaningful:

- `version.txt` — the whole file
- `index.html` — the line `const BUILD = "…"` near the top of the script

They should always match. When they don't, the app is serving a cached
copy and you'll know immediately instead of debugging the wrong thing.
