# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Mise — a single-page PWA for recipes, weekly planning, and shopping lists.
There is no build step, no package manager, and no test suite: the entire
app is `index.html` (HTML + CSS + JS in one file), backed by a single
Netlify serverless function and a service worker for offline use.

## Commands

There is no build, lint, or test tooling in this repo. Development is:

- **Run locally**: open `index.html` directly in a browser, or serve the
  folder with any static file server. The Netlify function
  (`netlify/functions/fetch-recipe.js`) only runs when deployed, so link
  import falls back to a public relay when testing locally.
- **Deploy**: `git push` to the linked GitHub repo (Netlify auto-deploys,
  publish directory `.`, no build command). Drag-and-drop deploys of a zip
  also work but don't reliably register the Netlify function — see
  `DEPLOYING.md`.
- **Verify a deploy landed**: compare `/version.txt` on the live site
  against `const BUILD` in `index.html` and the build shown in the app's
  Settings screen. See `DEPLOYING.md` / `GIT-SETUP.md` for the full
  checklist, including the `/.netlify/functions/fetch-recipe?url=...`
  smoke test.

**After any change that ships**, bump the build string in both
`version.txt` and `const BUILD = "…"` near the top of `index.html`'s
script — they must always match, or the app is silently serving a cached
copy. If the change alters anything in the offline shell (the script
itself, CSS, markup structure), also bump `CACHE` in `sw.js` so the
service worker invalidates its cache.

## Architecture

### Single file, section-commented

`index.html`'s `<script>` block (~2,360 lines) is organized into
banner-commented sections (search for `====` to jump between them):
parsing, sync, rendering per screen, cook mode, settings. There's no
module system — everything is top-level functions and consts in one
scope.

### Data model and persistence

- `Store` (top of the script) wraps `localStorage` under key `"mise.v1"`,
  falling back to an in-memory object if storage is unavailable (private
  browsing, quota, etc.) — `Store.persistent` tells you which.
- `db` is the single in-memory state object, shaped by `freshDb()`:
  `recipes`, `plan`, `planTs`, `leftovers`, `ticked`, `deleted`,
  `settings`, `settingsTs`, `sync`, `weekStart`.
- `save()` persists `db` via `Store.save` and calls `schedulePush()` to
  queue a sync. There's no other write path — mutate `db` in place, then
  call `save()`.
- `touch(r)` stamps a record's `updated` timestamp; this is what makes
  merge conflict resolution possible (see Sync below).

### Sync (optional, gist-backed)

Two devices can share a shelf via a private GitHub gist (`SYNC_FILE =
"mise-sync.json"`). `mergeDb(local, remote)` does timestamp-based
last-write-wins per record, using each recipe's `updated` field and
`db.deleted` tombstones to distinguish "never existed" from "deleted
elsewhere". `gistCreate`/`gistRead`/`gistWrite` talk to the GitHub API
directly from the browser using a user-supplied personal access token
(gist scope only, stored on-device, never uploaded). `schedulePush` +
`syncNow` debounce and trigger pushes after local edits.

There is a guard (search `sk-ant-`) that detects an Anthropic API key
accidentally pasted into the sync-token field and purges it on load —
keep that in mind if touching the settings/sync code, since it's there to
prevent a real credential leak, not a hypothetical one.

### Recipe import and parsing

`extractRecipe(html)` tries strategies in order and takes the first that
succeeds: `fromJsonLd` → `fromMicrodata` → `fromHeadings` → `fromPlainText`.
Every import lands in an editable form before saving (`showDraft`) because
none of these are guaranteed correct on odd layouts.

- Link imports go through `fetchPage()`, which calls the Netlify function
  first and falls back to a public relay if the function isn't registered
  (drag-and-drop deploys don't reliably register it — see `DEPLOYING.md`).
- Photo imports use on-device OCR (Tesseract, loaded from CDN) by default;
  `looksLikeWords()` sanity-checks the OCR output against a real-word list
  (`REAL`) and refuses to fill the form with garbage rather than silently
  producing nonsense.
- If the user has added their own Anthropic API key in Settings,
  `aiParse`/`aiParseImage` send the page text or photo to the model
  instead — this is the only path that ever leaves the device with
  recipe/photo content, and only to Anthropic.
- Ingredient line parsing (`parseIngredient`, `parseRecipeText`) handles
  unicode fractions (`FRAC`), unit synonyms (`UNITS`), and spelled-out
  numbers (`WORDNUM`) to turn free text into structured `{qty, unit,
  name}`.

### Nutrition

`parseNutrition` only reads figures a recipe site actually published
(via the same structured data used for ingredients) — nothing is
inferred unless the user explicitly requests an AI estimate. Display uses
UK front-of-pack style reference-intake bands (`RI`, `band()`,
`BANDNAME`/`BANDCOL`); salt is derived from sodium via the standard ×2.5
factor. Deliberately absent: any single health score or glycemic index —
see the "Nutrition" section of `README.md` for the reasoning if you're
asked to add one.

### Routing and rendering

Hand-rolled SPA router: `go(name)` toggles `.screen` elements by id
(`#s-<name>`) and calls that screen's `render*` function
(`renderHome`, `renderShelf`, `renderDetail`, `renderPlan`, `renderShop`,
`renderFridge`, `renderSettings`, `renderCook`). `renderRecipes()` is the
entry point sync uses to refresh whichever screen is currently visible
after a merge — call it (not a specific `render*`) when data changes from
a background process.

### Other fixed points worth knowing before editing

- `AISLES` — shopping-list grouping order; `aisleOf()` assigns an
  ingredient to one.
- `seedRecipes()` — the starter recipes a fresh install gets.
- CSS custom properties at the top of the file — the only place colors
  are defined; `PICS` is the separate palette used for auto-generated
  recipe photo placeholders (`picStyle`, `hashOf` — deterministic per
  recipe name).
- `sw.js` fetch handling is network-first for the HTML page (so a
  redeploy is picked up on next load) and cache-first for everything else
  on the same origin; it explicitly bypasses the cache for
  `/.netlify/functions/` and any cross-origin request. Don't route more
  through the cache without checking that split still makes sense.
