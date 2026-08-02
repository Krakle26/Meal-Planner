// Fetches a recipe page server-side so the browser's cross-origin rules
// don't block it. Deployed automatically by Netlify from this path.
// Called by the app as: /.netlify/functions/fetch-recipe?url=...

export default async (request) => {
  const url = new URL(request.url).searchParams.get("url");

  const reply = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600"
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
