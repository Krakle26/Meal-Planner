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

  // IPv6. An IPv4 address can be written inside one — "::ffff:169.254.169.254",
  // which the URL parser turns into "::ffff:a9fe:a9fe" — and that form slipped
  // past a check that only knew ::1 and the fc/fd/fe80 prefixes. Unwrap it and
  // judge the IPv4 inside. Any other address starting "::" is unspecified,
  // loopback or the old IPv4-compatible form; none of those is a public page.
  if (h.includes(":")) {
    const m = h.match(/^(?:::ffff:|64:ff9b::)(?:(\d{1,3}(?:\.\d{1,3}){3})|([0-9a-f]{1,4}):([0-9a-f]{1,4}))$/);
    if (m) {
      const v4 = m[1] || [parseInt(m[2], 16) >> 8, parseInt(m[2], 16) & 255,
                          parseInt(m[3], 16) >> 8, parseInt(m[3], 16) & 255].join(".");
      return isPrivateHost(v4);
    }
    return h.startsWith("::") || /^(fc|fd|fe[89ab])/.test(h);
  }

  // Only judge the numeric ranges on a real IPv4 literal, so a name that
  // merely starts with digits ("10.pizza.example") still resolves normally.
  // The URL parser has already rewritten "2130706433" and "0x7f.1" as dotted
  // quads by the time a hostname gets here.
  const ip = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ip) return false;
  const [a, b] = ip.slice(1).map(Number);
  if (ip.slice(1).some((n) => Number(n) > 255)) return true;
  if (a === 0 || a === 10 || a === 127) return true;        // this host, private, loopback
  if (a === 169 && b === 254) return true;                  // link-local, incl. metadata
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;        // carrier-grade NAT
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
    // Redirects are followed one hop at a time, each checked before it is
    // requested. Letting fetch follow them and checking where it ended up
    // meant the private address had already been requested by then — the
    // check only stopped the reply from being passed back.
    let res;
    for (let hop = 0; ; hop++) {
      res = await fetch(target.href, {
        redirect: "manual",
        headers: {
          // Some recipe sites serve a stripped page to unknown clients.
          "User-Agent": "Mozilla/5.0 (compatible; MiseRecipeImporter/1.0)",
          "Accept": "text/html,application/xhtml+xml"
        },
        signal: AbortSignal.timeout(12000)
      });
      const next = res.status >= 300 && res.status < 400 && res.headers.get("location");
      if (!next) break;
      if (hop >= 5) return reply({ error: "That address redirects too many times" }, 502);
      target = new URL(next, target);
      if (!/^https?:$/.test(target.protocol)) {
        return reply({ error: "Only http and https addresses work here" }, 400);
      }
      if (isPrivateHost(target.hostname)) {
        return reply({ error: "That address is not a public web page" }, 400);
      }
    }

    if (!res.ok) return reply({ error: `The site answered with ${res.status}` }, 502);

    const type = res.headers.get("content-type") || "";
    if (!type.includes("html")) return reply({ error: "That address is not a web page" }, 415);

    let html = await res.text();
    // Keep the payload small — the app only needs the markup, and
    // recipe data lives in JSON-LD or the body text.
    if (html.length > 900000) html = html.slice(0, 900000);

    return reply({ html, finalUrl: target.href });
  } catch (err) {
    const msg = err.name === "TimeoutError"
      ? "The site took too long to answer"
      : "Could not reach that site";
    return reply({ error: msg }, 504);
  }
};

// Netlify serves this automatically at /.netlify/functions/fetch-recipe —
// no path config needed, and declaring one under /.netlify/ is rejected.
