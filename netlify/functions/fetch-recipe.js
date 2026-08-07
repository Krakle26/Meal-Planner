// Fetches a recipe page server-side so the browser's cross-origin rules
// don't block it. Deployed automatically by Netlify from this path.
// Called by the app as: /.netlify/functions/fetch-recipe?url=...

// Anyone who knows this address can ask it to fetch things, so it must not
// become a way into a private network — or into the host's own metadata
// service. Public addresses only, checked before the fetch and again on
// whatever the redirects landed on.
//
// This catches an address written down as private. It cannot catch a public
// name that resolves to a private one, which would need a resolve-then-pin
// fetch the platform doesn't offer here.
function isPrivateHost(hostname) {
  const h = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal")) return true;

  // IPv6, written out or shortened.
  if (h.includes(":")) return h === "::1" || /^(fc|fd|fe80)/.test(h);

  // Only judge the numeric ranges on a real IPv4 literal, so a name that
  // merely starts with digits ("10.pizza.example") still resolves normally.
  const ip = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ip) return false;
  const [a, b] = ip.slice(1).map(Number);
  if (ip.slice(1).some((n) => Number(n) > 255)) return true;
  if (a === 0 || a === 10 || a === 127) return true;        // this host, private, loopback
  if (a === 169 && b === 254) return true;                  // link-local, incl. metadata
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

export default async (request) => {
  const url = new URL(request.url).searchParams.get("url");

  const reply = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        // The app calls this from its own origin, so no cross-origin reader
        // needs to be let in.
        "Cache-Control": status === 200 ? "public, max-age=3600" : "no-store"
      }
    });

  if (!url) return reply({ error: "No address given" }, 400);

  let target;
  try {
    target = new URL(url);
  } catch {
    return reply({ error: "That is not a valid web address" }, 400);
  }
  if (!/^https?:$/.test(target.protocol)) {
    return reply({ error: "Only http and https addresses work here" }, 400);
  }
  if (isPrivateHost(target.hostname)) {
    return reply({ error: "That address is not a public web page" }, 400);
  }

  try {
    const res = await fetch(target.href, {
      redirect: "follow",
      headers: {
        // Some recipe sites serve a stripped page to unknown clients.
        "User-Agent": "Mozilla/5.0 (compatible; MiseRecipeImporter/1.0)",
        "Accept": "text/html,application/xhtml+xml"
      },
      signal: AbortSignal.timeout(12000)
    });

    // A redirect can land somewhere the first check would have refused.
    try {
      if (isPrivateHost(new URL(res.url).hostname)) {
        return reply({ error: "That address is not a public web page" }, 400);
      }
    } catch { /* no usable final URL — the protocol check above still held */ }

    if (!res.ok) return reply({ error: `The site answered with ${res.status}` }, 502);

    const type = res.headers.get("content-type") || "";
    if (!type.includes("html")) return reply({ error: "That address is not a web page" }, 415);

    let html = await res.text();
    // Keep the payload small — the app only needs the markup, and
    // recipe data lives in JSON-LD or the body text.
    if (html.length > 900000) html = html.slice(0, 900000);

    return reply({ html, finalUrl: res.url });
  } catch (err) {
    const msg = err.name === "TimeoutError"
      ? "The site took too long to answer"
      : "Could not reach that site";
    return reply({ error: msg }, 504);
  }
};

// Netlify serves this automatically at /.netlify/functions/fetch-recipe —
// no path config needed, and declaring one under /.netlify/ is rejected.
