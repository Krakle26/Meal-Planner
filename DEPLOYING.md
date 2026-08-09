# Deploying Mise

The site is published by **GitHub Pages** from the `main` branch of
`Krakle26/Meal-Planner`, and lives at:

```
https://krakle26.github.io/Meal-Planner/
```

There is no build step. Pages serves the files exactly as they sit in the
repository, so a push is the whole deploy.

---

## Publishing a change

```powershell
cd "C:\Users\richa\Documents\Meal Planner App"
git add -A
git commit -m "what changed"
git push
```

Pages usually republishes within a minute. The repo's **Actions** tab shows
the run, so if nothing appears there, the push didn't land.

---

## Then check it, in this order

| Check | Address | Expected |
|---|---|---|
| Server updated | `/version.txt` | the new build string |
| App updated | Settings, in the app | the same string |

**If `/version.txt` still shows the old build**, Pages hasn't finished or
the push didn't arrive. Check the Actions tab before touching anything else.

**If `/version.txt` is right but the app shows an older build**, that is
only cache. Settings has a *Check for an update* button, or add `?v=2` to
the address to bypass the stored copy.

---

## After any change

Bump the build string in two places, so the check above stays meaningful:

- `version.txt` — the whole file
- `index.html` — the line `const BUILD = "…"` near the top of the script

They should always match. When they don't, the app is serving a cached copy
and you'll know immediately rather than debugging the wrong thing.

If the change touches the offline shell — the script, the CSS, the markup,
or `manifest.json` — also bump `CACHE` in `sw.js`, or the service worker
keeps handing out the previous copy.

`verify.py` checks all three for you, if you have Python installed.

---

## Link import, and the dormant function

`netlify/functions/fetch-recipe.js` fetches a recipe page from a server you
control, so no third party sees what you import. **It does not run on
GitHub Pages**, which serves static files and nothing else.

Nothing is broken by this. The app asks for the function, gets a 404, and
falls back to a public relay; imports keep working and the app tells you
which route it used. The costs are that the relay operator sees the recipe
addresses you import, and it is slower.

The function and `netlify.toml` are kept in the repo deliberately. They
need no changes — they simply start working if the site is ever moved to a
host that runs functions. Until then, treat both as inert.

To make the function live, the site would need to move to Netlify: link
this repo under **Site configuration → Build & deploy**, leave the build
command empty, and set the publish directory to `.`. That is the only
change required; the code is already correct.
