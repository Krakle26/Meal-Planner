#!/usr/bin/env python3
"""Check a built Mise site before it ships.

Point it at a directory or a zip. It always reads the file that is actually
being shipped — checking a copy extracted earlier is how a broken build gets
packaged while the checks report green.

    python3 verify.py .
    python3 verify.py mise-site.zip
"""
import json, re, subprocess, sys, tempfile, zipfile
from pathlib import Path

FAILURES = []
SKIPPED = []
def check(name, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + name + (("  [" + str(detail) + "]") if detail and not ok else ""))
    if not ok:
        FAILURES.append(name)

def load(source):
    """Return {path: bytes} for the files we care about, read from the artefact itself."""
    wanted = ["index.html", "version.txt", "sw.js", "manifest.json"]
    if source.suffix == ".zip":
        with zipfile.ZipFile(source) as z:
            names = z.namelist()
            return {w: z.read(w) for w in wanted if w in names}
    return {w: (source / w).read_bytes() for w in wanted if (source / w).exists()}

def main(target):
    src = Path(target)
    files = load(src)
    if "index.html" not in files:
        print("No index.html in", src); return 1

    html = files["index.html"].decode("utf-8")
    scripts = re.findall(r"<script>([\s\S]*?)</script>", html)
    if not scripts:
        print("No inline script found"); return 1
    js = scripts[-1]

    # 1. It has to parse. Everything else is meaningless if it doesn't.
    #    Without node there is no parser to hand, and crashing out with a
    #    traceback would report nothing at all — so say the check didn't run
    #    and carry on with the ones that don't need it. It is never reported
    #    as a pass: a check that didn't run must not read like one that did.
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f:
        f.write(js); tmp = f.name
    try:
        r = subprocess.run(["node", "--check", tmp], capture_output=True, text=True)
    except OSError:          # FileNotFoundError is an OSError
        r = None
        SKIPPED.append("javascript parses")
        print("  SKIP  javascript parses  [node not installed]")
    if r is not None:
        check("javascript parses", r.returncode == 0, (r.stderr or "").strip().splitlines()[:1])
        if r.returncode != 0:
            print("\nNothing else was checked — fix the syntax error first.")
            return 1

    # A naive "/* vs */" tally looked useful but counts regex literals such
    # as /\s*/ as closers, so it cried wolf. node --check above already
    # rejects an unbalanced comment, which is what caught the real one.

    # 3. No name declared twice at the top level.
    decls = {}
    for m in re.finditer(r"^(?:const|let|var|function|async function)\s+([A-Za-z_$][\w$]*)", js, re.M):
        decls[m.group(1)] = decls.get(m.group(1), 0) + 1
    dupes = [k for k, v in decls.items() if v > 1]
    check("no duplicate declarations", not dupes, dupes)

    # 4. Every element the code reaches for exists.
    ids = set(re.findall(r'id="([^"]+)"', html))
    refs = set(re.findall(r'\$\("#([A-Za-z0-9_-]+)"\)', js))
    made = set(re.findall(r'id="([A-Za-z0-9_-]+)"', js))
    missing = sorted(refs - ids - made)
    check("every referenced element exists", not missing, missing)

    # 5. Every interactive attribute has something listening for it.
    emitted = set(re.findall(r"data-([a-z]+)=", js))
    handled = set(re.findall(r'closest\("\[data-([a-z]+)\]"\)', js)) | set(re.findall(r"dataset\.([a-z]+)", js))
    orphans = sorted(emitted - handled)
    check("every interactive attribute is handled", not orphans, orphans)

    # 6. The build stamp matches, or the app will serve a stale copy silently.
    build = re.search(r'const BUILD = "([^"]+)"', js)
    check("build stamp present", bool(build))
    if build and "version.txt" in files:
        vt = files["version.txt"].decode().strip()
        check("build stamp matches version.txt", build.group(1) == vt, f"{build.group(1)} vs {vt}")

    # 7. Caches must be bumped or nobody receives the change.
    if "sw.js" in files:
        cache = re.search(r'const CACHE = "([^"]+)"', files["sw.js"].decode())
        check("service worker cache is named", bool(cache))

    # 8. The manifest has to be valid and carry real icons.
    if "manifest.json" in files:
        try:
            m = json.loads(files["manifest.json"])
            check("manifest is valid json", True)
            check("manifest has png icons",
                  any(i.get("type") == "image/png" for i in m.get("icons", [])))
        except Exception as e:
            check("manifest is valid json", False, e)

    # 9. No input can carry capture and multiple together.
    both = [t for t in re.findall(r"<input[^>]*>", html) if "capture" in t and "multiple" in t]
    check("no input mixes capture with multiple", not both, both)

    print()
    if FAILURES:
        print(f"{len(FAILURES)} check(s) failed:", ", ".join(FAILURES))
        return 1
    if SKIPPED:
        print("Checks passed for", src,
              "— but these did not run:", ", ".join(SKIPPED))
        print("Install Node if you want the syntax check; it is the one that matters most.")
        return 0
    print("All checks passed for", src)
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "."))
