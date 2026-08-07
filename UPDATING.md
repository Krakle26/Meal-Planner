# Pushing this update to GitHub

Two situations. Check which you're in before running anything.

Open PowerShell in your project folder and run:

```powershell
cd "C:\Users\richa\Documents\Meal Planner App"
git log --oneline -1
```

- **A commit appears** → the repo exists. Follow *Updating* below.
- **"not a git repository"** or you never finished the first push → follow
  `GIT-SETUP.md` instead, then come back here for future updates.

---

## Updating

### 1. The files are already in place

Nothing to extract or copy this time — the changes were made directly in
your project folder. If you ever *do* apply an update from a zip, copy its
contents over the folder rather than replacing the folder: the hidden
`.git` directory inside it is the repository, and losing it loses the
history and the link to GitHub.

### 2. Check before you push

```powershell
cd "C:\Users\richa\Documents\Meal Planner App"
python verify.py .
```

Every line should read PASS. If any fails, don't push — say which one.

If Python isn't installed, skip this step; it's a safety net, not a
requirement. Note that the **javascript parses** check needs Node as well as
Python, and reports SKIP without it. That's the most valuable check in the
file, so if you install one thing, install Node.

### 3. See what changed

```powershell
git status
```

You should see `index.html`, `sw.js`, `manifest.json` and `version.txt` as
modified, plus these as new: the three `icon-*.png` files, `verify.py`,
`PACKAGING.md`, `UPDATING.md`, and `.well-known/assetlinks.json`. If it
lists hundreds of files, you're in the wrong folder — check you're not
sitting in Downloads.

### 4. Commit and push

```powershell
git add -A
git commit -m "Multi-page photo import, ingredient/method sorting, PWA icons and shortcuts"
git push
```

`-A` rather than `.` so that any file you remove later is recorded as
removed, not left behind on the server.

If it asks you to sign in, use the browser prompt. GitHub hasn't accepted
account passwords for Git since 2021.

---

## Then check it actually landed

Netlify usually publishes within a minute.

```
https://your-site.netlify.app/version.txt
```

It should read **2026-08-06b**. Then open the app and check Settings shows
the same build. If the file says `2026-08-06b` and the app says something
older, that's cache, not a failed deploy — use *Check for an update* in
Settings.

Two things in this build are worth a smoke test, because neither could be
tested properly on the desktop:

- **The Netlify function.** Open
  `https://your-site.netlify.app/.netlify/functions/fetch-recipe?url=https://example.com`
  — it should return JSON, not a 404. Then check that a private address is
  refused: swap the url for `http://127.0.0.1` and you should get
  *"That address is not a public web page"*.
- **Photograph a recipe.** Take two pages, crop each to just the recipe,
  and confirm the ingredients stay out of the method. Then save it and
  confirm the photos and text clear from the Add screen.

Also worth confirming once on the phone: the launcher shortcuts. Long-press
the app icon and you should get **Shopping** and **Fridge**, each opening
straight to that screen.

---

## If push is rejected

```
! [rejected] main -> main (fetch first)
```

means GitHub has something your computer doesn't — usually from editing a
file on github.com. Pull it in first:

```powershell
git pull --rebase origin main
git push
```

---

## From now on

Every future update is the same four commands:

```powershell
cd "C:\Users\richa\Documents\Meal Planner App"
git add -A
git commit -m "what changed"
git push
```

One habit worth keeping: after any change, make sure the build string in
`version.txt` matches the `const BUILD = "…"` line near the top of the
script in `index.html`. When those two disagree, the app is serving a
cached copy — and you'll know that immediately rather than debugging the
wrong thing. `verify.py` checks this for you.
