# Making Mise a proper app, just for the two of you

Two people is the easy case. Everything below is free, and none of it
involves a developer account, a review process or a store listing.

---

## What you already have

Adding Mise to your home screen isn't a shortcut to a website. It opens
full screen with no browser bar, keeps its own icon in the app drawer,
appears in the app switcher, and works without a signal.

For most households that's the whole answer. Before doing anything else,
it's worth being clear about what a packaged version would actually add:

| | Home screen install | Packaged APK |
|---|---|---|
| Own icon and name | Yes | Yes |
| Full screen, no browser bar | Yes | Yes |
| Works offline | Yes | Yes |
| Appears in the app drawer | Yes | Yes |
| Installs from a file you send | No | Yes |
| Survives clearing browser data | No | Yes |
| Feels like "a real app" to install | Not quite | Yes |

The honest summary: an APK is mostly about how it gets onto the phone, not
what it does once it's there.

---

## Route A — install from the browser (two minutes)

On each phone, open the site in Chrome, then the three-dot menu →
**Add to Home screen** → **Install**.

If it offers *Add shortcut* rather than *Install*, the service worker
hasn't registered. Reload twice and try again.

**Done.** Skip the rest unless you specifically want an installable file.

---

## Route B — a real APK you can send to each other

This wraps the site in an Android app. It's still the web app inside, which
turns out to be the good part: when you push a change to GitHub, both
phones get it on next open. No rebuilding, no reinstalling.

### 1. Deploy first

The packager reads your live site, so the manifest and icons have to be
published. Push the current files to GitHub and check
`https://krakle26.github.io/Meal-Planner/manifest.json` loads and lists three icons.

### 2. Build the package

Go to **pwabuilder.com**, enter your site address, and let it score the
site. Then **Package for stores → Android → Download package**.

Choose **signed APK** when asked. The download contains:

- `app-release-signed.apk` — the file you install
- `signing.keystore` and a passwords file — **keep these**
- `assetlinks.json` — needed for the next step

Back up the keystore somewhere that isn't the phone. Without it you can't
build an update that Android will accept over the top of the installed app;
you'd have to uninstall first, and uninstalling takes your recipes with it.

### 3. Prove the app owns the site

Without this, the app opens with a browser address bar across the top,
which rather spoils the effect.

Put the `assetlinks.json` from the package into your project at:

```
.well-known/assetlinks.json
```

There's a template already at that path — replace its contents entirely
with the file PWABuilder gave you, since only that one carries your
signing fingerprint. Then:

```powershell
git add .
git commit -m "Add asset links for the Android app"
git push
```

Check `https://krakle26.github.io/Meal-Planner/.well-known/assetlinks.json` returns
the file before installing.

### 4. Install on both phones

Send the APK however suits — email, WhatsApp, Google Drive, a USB cable.

On each phone, tap the file. Android will say it can't install from this
source; follow the prompt to allow it for whichever app you sent it
through, then tap the file again. This warning is Android being careful
about files from the internet, which is reasonable — you happen to know
where this one came from.

### 5. Set up the second phone

Install, then open **Settings → Sync**, choose the private store, paste in
a GitHub token and the store code from the first phone.

---

## Keeping it updated

For anything you change in the app itself:

```powershell
git add .
git commit -m "what changed"
git push
```

Both phones pick it up on next open. The APK never needs rebuilding.

Rebuild it only if you change the app's **name, icon, or address**.

---

## If either of you has an iPhone

Safari → Share → **Add to Home screen**. Same result as Route A: full
screen, own icon, works offline.

There's no iPhone equivalent of Route B without paying Apple £79 a year,
and a sideloaded iOS app expires after seven days unless you re-sign it. So
for iPhones, Route A isn't a compromise — it's the sensible answer.

---

## What I'd do

Route A on both phones, and stop there. The only reason to go further is if
you want to hand someone a file, or you're bothered that clearing Chrome's
data would remove the install.

Whichever route, **export a backup first** — Settings → Your data. Two
devices syncing is not the same as a copy you hold.

---

## Things not worth doing

**The Play Store.** £20 one-off, plus Google now requires new personal
developer accounts to run a closed test with twelve testers for fourteen
days before they'll allow a public release. For an app with two users, that
is a lot of process for no benefit.

**Rewriting it natively.** A native rebuild would take weeks and mainly buy
things you don't need. The one genuine limit you might eventually hit is
storage: browsers cap you around 5MB, which is a few dozen photos. If that
becomes the problem, host the images rather than rebuild the app.
