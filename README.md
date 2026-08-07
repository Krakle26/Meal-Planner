# Mise

Recipes, step-by-step cooking, a week's plan, a shopping list that writes
itself, and a fridge list that tells you what to cook with the half cabbage.

## Putting it live

Drag `mise-site.zip` onto the Netlify deploys page. Do not unzip it first —
Netlify unpacks it and keeps the folder structure, which is the part that
matters. Dragging a plain folder tends to lose nested files, and the link
fetcher lives in one.

Inside the zip:

```
index.html
manifest.json
sw.js
version.txt
netlify.toml
netlify/functions/fetch-recipe.js
```

### Checking a deploy actually landed

Open `https://your-site.netlify.app/version.txt`. It shows the build string
of whatever is really on the server, with no app or cache in the way.
Compare it against the build shown in the app under Settings. If the two
disagree, the app is serving a cached copy — Settings has a "Check for an
update" button, or add `?v=2` to the address to bypass it.

### If the link fetcher doesn't register

Drag-and-drop deploys don't run a build, and Netlify is inconsistent about
picking up functions from them. Open
`https://your-site.netlify.app/.netlify/functions/fetch-recipe?url=https://example.com`
— JSON means it works, a 404 means it didn't register.

This is not fatal. Link import falls back to a public relay and keeps
working; the app tells you which route it used. The only cost is that the
relay sees the recipe addresses you import, and it's slower. To get your
own fetcher working, connect the repo to Git instead of dragging.

## Putting it on your phone

Open the site in Chrome on Android, tap the three-dot menu, then **Add to
Home screen**. It opens full-screen without browser chrome, and works
without a signal once it has loaded once.

## How the parts fit

| Part | Where it runs | Notes |
|---|---|---|
| Recipes, plans, lists | Your phone | Stored in the browser, never uploaded |
| Photo reading | Your phone | Tesseract, loaded from a CDN on first use |
| Link importing | Netlify function | Browsers can't fetch other sites directly |
| Sharper reading | Anthropic API | Only if you add your own key in Settings |

Everything except link importing works offline.

## The two readers

**Built in (default).** Rules-based. It looks for `Serves 4`, `Total time`,
an `Ingredients` block and a `Method` block, and falls back on sentence
shape when a recipe has no headings. Free, instant, private. Good on tidy
layouts, occasionally wrong on odd ones — which is why every import lands
in an editable form before it saves.

**With an API key (optional).** Add an Anthropic key under Settings and
photographed pages are sent to the model as pictures rather than being run
through character recognition — it copes with angles, columns, curved
spines and decorative type, none of which on-device reading handles. Web
pages that publish no recipe data get read properly too. The key is stored
on your phone and sent only to Anthropic.

On-device photo reading is the weakest part of the app and no amount of
tuning fixes that — character recognition on a cookbook photo is simply
hard. Mise now checks whether the result is real text and refuses to fill
the form with noise, so a failure tells you it failed instead of handing
you nonsense to correct.

For link importing, most recipe sites publish machine-readable recipe data
in the page. Mise reads that first and gets a clean result with no key
needed. It only falls back to reading the page text when that data is
missing.

## Sync

Recipes live in the browser on whichever device added them. Two ways to get
the same shelf elsewhere, both under Settings.

**Send a copy / Merge a copy.** No account. Send the file to the other
device however you like and merge it there. Merging never overwrites
wholesale — for anything both devices have, the newer edit wins, and
anything only one side has is kept.

**Private GitHub store.** Automatic. Create a personal access token at
github.com with gist permission only, paste it in on the first device and
tap Connect. That creates a private gist. Copy the store code shown, paste
it on the second device along with its own token, and tap *Use that code*.
From then on each device pulls when it opens and pushes a few seconds
after you change something.

Worth knowing about the token: it is stored on the phone and sent only to
GitHub. Give it gist permission and nothing else, so a lost phone exposes
recipes rather than your account. Your API key is never uploaded — it stays
on the device that owns it.

Conflicts resolve by edit time, which handles the ordinary case of two
people cooking from the same shelf. It is not a substitute for backups; if
both devices edit the same recipe offline, the older edit is the one that
loses.

## Nutrition

Each recipe has three tabs: Ingredients, Method and Nutrition.

The Nutrition tab shows figures **only when the recipe site published
them**. Most established recipe sites do, and Mise reads them from the same
structured data it uses for the ingredients. Nothing is inferred.

- **Per-serving table** with percentages of an adult reference intake
  (2,000 kcal a day), the same basis used on food packaging.
- **Colour bands** for fat, saturates, sugars and salt, following the UK
  front-of-pack guidance applied per portion. Salt is calculated from
  sodium at the standard factor of 2.5.
- Figures are the recipe's own, at its original serving count, so they do
  not change when you scale the ingredients up or down.

With an API key you can also ask for an estimate from the ingredient list.
It is labelled Estimated wherever it appears, and it is a rough sense of a
dish rather than a measurement.

**What is deliberately absent.** No overall health score out of ten, and no
glycemic index or load. A glycemic index comes from feeding measured
portions to people and testing blood glucose — it cannot be derived from a
list of ingredients. A single score out of ten is somebody's private
formula dressed up as a fact. Both would have been easy to generate and
both would have been invented, which is the worst property a nutrition
figure can have.

## Photos

Recipes imported from a link usually arrive with the site's photo. Typed or
photographed ones get a colour drawn from their own name instead — stable,
so the same recipe always looks the same.

To use your own picture, open the recipe and tap **Add a photo**. It is
resized to a 640px long edge and stored on the device, so it still shows
when you're offline.

Browser storage is roughly 5MB in total, which is a few dozen photos
alongside your recipes. Settings shows how much is in use. If a photo won't
fit, Mise says so and keeps the recipe as it was rather than half-saving.

Photos travel through sync like everything else, but if the whole shelf
grows past what the sync store will take, the recipes are sent without them
rather than the sync failing. A device receiving that copy keeps the photos
it already has.

## Fixing an import

Recipe pages don't end where the recipe does — below the method sit comment
threads, ratings and related-recipe lists, and a parser reading the page as
text will swallow them. Mise cuts at the first sign of that furniture.

When something still comes through wrong, open the recipe and tap **Edit
recipe**. It loads back into the same form you saw on import, so you can
delete stray lines or fix a quantity. Editing keeps the favourite star, the
photo, the nutrition figures and where it came from.

## Things worth knowing

- **Servings scale.** Change the serving count on a recipe and quantities
  scale with it. The shopping list uses the servings you planned, not the
  recipe's default.
- **The shopping list merges.** Two recipes wanting onions produce one
  line. It only merges matching units — 200 g and 2 tbsp stay separate,
  because adding them would be a lie.
- **Avoid list.** Settings has a list of things never to suggest. It is
  pre-filled with seafood. Matching recipes are hidden from search,
  suggestions and the planner, but nothing is deleted.
- **Back up before you experiment.** Settings → Export a backup writes a
  JSON file. Restore reads it back on any device.
- **Leftovers.** Finish cook mode and it asks what was left over. Whatever
  you log shows up on the Fridge tab, ranked by how many of your leftovers
  each recipe uses.

## Changing things

It's one HTML file. The aisle groupings are the `AISLES` array, the
starter recipes are `seedRecipes()`, and the colours are the CSS custom
properties at the top.
