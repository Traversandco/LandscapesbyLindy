/* Server-side routes for landscapesbylindy.co.uk.
 *
 * The site is a Cloudflare Worker with static assets (see wrangler.jsonc),
 * not Pages Functions — there is no functions/ directory pipeline here.
 * Requests matching a static asset are served directly by the assets layer;
 * everything else reaches this worker, which answers /api/* and hands any
 * other path back to the static site via env.ASSETS.
 *
 * Requires STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET for the webhook) as
 * Worker environment variables. Without them the site still works and
 * checkout fails with a clear message rather than breaking.
 *
 * .assetsignore keeps this file out of the public asset upload.
 */

const PRICES = {
  "succulent-garden":       { price: "price_1TxicABrZ8ulnngRG9QheR9r", product: "prod_UxdtYtPkJad7ou", name: "Succulent Garden" },
  "harbour-at-rest":        { price: "price_1TxicvBrZ8ulnngRy6vvKMe2", product: "prod_UxduQsSu1EzuJB", name: "Harbour at Rest" },
  "wide-blue-bay":          { price: "price_1Txid7BrZ8ulnngRE5vkUBvN", product: "prod_Uxdu3ufvAgDJUV", name: "Wide Blue Bay" },
  "paris-in-bloom":         { price: "price_1TxidIBrZ8ulnngROKeW0uW4", product: "prod_Uxdv5OYwJpVlyw", name: "Paris in Bloom" },
  "emerald-surf":           { price: "price_1TxidVBrZ8ulnngRl3IpaaMp", product: "prod_UxdvjeHQsTnl8R", name: "Emerald Surf" },
  "lavender-abbey":         { price: "price_1TxidjBrZ8ulnngR8ppFngZM", product: "prod_Uxdvs1oW5UgNHq", name: "Lavender Abbey" },
  "the-curl":               { price: "price_1TxidvBrZ8ulnngRKOrLabMO", product: "prod_Uxdvf03KzW2Jhn", name: "The Curl" },
  "muizenberg-beach-huts":  { price: "price_1Txie9BrZ8ulnngRTqCl3Ieh", product: "prod_UxdwvPchKiSTmN", name: "Beach Huts" },
  "beached":                { price: "price_1TxieOBrZ8ulnngRhTOeUsDR", product: "prod_UxdwbQdOcroqPS", name: "Beached" },
  "turquoise-break":        { price: "price_1TxiewBrZ8ulnngRXSz77xX8", product: "prod_UxdwLWwCvhudHV", name: "Turquoise Break" },
  "glass-wave":             { price: "price_1Txif7BrZ8ulnngRuZXTFiS0", product: "prod_Uxdx2CtygXBe8B", name: "Glass Wave" },
  "hydrangeas":             { price: "price_1TxifNBrZ8ulnngRoZuTQF9y", product: "prod_UxdxNPrl9Y8EDH", name: "Hydrangeas in Bloom" },
  "spring-blossom":         { price: "price_1TxifXBrZ8ulnngRTYkuVXbj", product: "prod_UxdxECVK5VHfzL", name: "Spring Blossom" },
  "blossom-walk":           { price: "price_1Txig0BrZ8ulnngR5avFgld8", product: "prod_UxdxM19bDwf3z3", name: "Blossom Walk" },
  "proteas-in-the-dark":    { price: "price_1TxigDBrZ8ulnngRry6qV4w8", product: "prod_Uxdysg2jZIJV49", name: "Proteas in the Dark" },
  "red-boats":              { price: "price_1TxigPBrZ8ulnngRCRUNkvae", product: "prod_UxdyiT0IO4VEn5", name: "Red Boats, Clear Water" },
  "pink-protea":            { price: "price_1TxigdBrZ8ulnngRSHxSqXY1", product: "prod_UxdyvI5VKRGaYm", name: "Pink Protea" },
  "king-protea":            { price: "price_1TxignBrZ8ulnngRXvnXdqkS", product: "prod_UxdyQeURSKOlq4", name: "King Protea" },
  "little-donkey":          { price: "price_1TxigyBrZ8ulnngRm34ucGOL", product: "prod_UxdyABJGc1JWlI", name: "Little Donkey" },
  "provence-lavender-farm": { price: "price_1TxiciBrZ8ulnngRbE3a1RYy", product: "prod_UxdufHZiBl2tZ4", name: "Provence Lavender Farm" },
  "red-roofs-still-water":  { price: "price_1TxihBBrZ8ulnngRIF7yPMM8", product: "prod_UxdzAeQpAbqBH2", name: "Red Roofs, Still Water" },
  "clifftop-cottage":       { price: "price_1TxihLBrZ8ulnngR7twjrcFy", product: "prod_UxdzuNZkqascyx", name: "Clifftop Cottage" },
  "cosmos-and-windpump":    { price: "price_1TxihWBrZ8ulnngRq8T9yCI8", product: "prod_UxdzIamb4O4Wq6", name: "Cosmos and Windpump" },
  "the-sea-arch":           { price: "price_1TxihgBrZ8ulnngRyZgNyZuT", product: "prod_Uxdzak9BPyD5Tl", name: "The Sea Arch" },
  "nguni-on-the-shore":     { price: "price_1TxihrBrZ8ulnngRz1xbv1Ka", product: "prod_UxdzgvnHSTPsBT", name: "Nguni on the Shore" },
  "storm-light":            { price: "price_1Txii2BrZ8ulnngRu8dgBUtS", product: "prod_Uxe0HjSDVKlFKn", name: "Storm Light" },
  "table-mountain-bay":     { price: "price_1TxiiFBrZ8ulnngRXkZmn4fE", product: "prod_Uxe0QmY8RTlBTF", name: "Table Mountain from the Bay" },
  "winelands-cottage":      { price: "price_1TxiiPBrZ8ulnngRCumwvWbg", product: "prod_Uxe0uaZFfZqaOg", name: "Winelands Cottage" },
  "table-mountain-sunset":  { price: "price_1TxiieBrZ8ulnngRe2dkFx7x", product: "prod_Uxe0E019TzPlcK", name: "Table Mountain at Sunset" },
  "geraniums-on-the-steps": { price: "price_1TxiipBrZ8ulnngRVs3kxlIA", product: "prod_Uxe05MMeJKMCKl", name: "Geraniums on the Steps" },
};

const SHIPPING_COUNTRIES = [
  "GB","IE","US","CA","AU","NZ","ZA",
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IS","IT",
  "LV","LI","LT","LU","MT","MC","NL","NO","PL","PT","RO","SK","SI","ES","SE","CH",
  "AE","AR","BR","CL","CN","CO","HK","IL","IN","JP","KR","MX","MY","PE","PH",
  "QA","SA","SG","TH","TR","TW","UY","VN",
  "BW","EG","GH","KE","MA","MU","NA","NG","TZ","UG","ZM","ZW",
];

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  });

async function stripe(env, path, method = "GET", body) {
  const res = await fetch("https://api.stripe.com/v1" + path, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Stripe ${res.status}`);
  return data;
}

/* ---------- GET /api/sold ---------- */
async function getSold(env) {
  if (!env.STRIPE_SECRET_KEY) return json({ sold: [] }, 200, { "Cache-Control": "public, max-age=60" });
  try {
    const data = await stripe(env, "/products?limit=100&active=false");
    const archived = new Set((data.data || []).map((p) => p.metadata && p.metadata.slug).filter(Boolean));
    const sold = Object.keys(PRICES).filter((s) => archived.has(s));
    return json({ sold }, 200, { "Cache-Control": "public, max-age=60" });
  } catch {
    // never block browsing on a Stripe problem
    return json({ sold: [] }, 200, { "Cache-Control": "public, max-age=60" });
  }
}

/* ---------- POST /api/checkout ---------- */
async function soldSlugs(env, slugs) {
  const sold = [];
  await Promise.all(slugs.map(async (slug) => {
    try {
      const p = await stripe(env, `/products/${PRICES[slug].product}`);
      if (p.active === false) { sold.push(slug); return; }
    } catch { /* fall through */ }
    try {
      const q = encodeURIComponent(`status:'succeeded' AND metadata['slug_${slug}']:'1'`);
      const r = await stripe(env, `/payment_intents/search?limit=1&query=${q}`);
      if (r.data && r.data.length) sold.push(slug);
    } catch { /* search unavailable — rely on the archive check */ }
  }));
  return sold;
}

async function postCheckout(request, env, url) {
  if (!env.STRIPE_SECRET_KEY) {
    return json({ error: "Payments are not configured yet. Please send an enquiry and we'll arrange it directly." }, 503);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }

  const slugs = [...new Set(body.slugs || [])].filter((s) => PRICES[s]);
  if (!slugs.length) return json({ error: "Your basket is empty." }, 400);

  const unavailable = await soldSlugs(env, slugs);
  if (unavailable.length) {
    return json({
      error: "sold",
      sold: unavailable,
      message:
        unavailable.map((s) => PRICES[s].name).join(" and ") +
        (unavailable.length > 1 ? " have" : " has") +
        " just sold. Please remove " + (unavailable.length > 1 ? "them" : "it") + " to continue.",
    }, 409);
  }

  const form = {
    mode: "payment",
    success_url: `${url.origin}/order-complete.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${url.origin}/basket.html`,
    billing_address_collection: "required",
    "phone_number_collection[enabled]": "true",
    submit_type: "pay",
    "shipping_options[0][shipping_rate_data][type]": "fixed_amount",
    "shipping_options[0][shipping_rate_data][fixed_amount][amount]": "0",
    "shipping_options[0][shipping_rate_data][fixed_amount][currency]": "gbp",
    "shipping_options[0][shipping_rate_data][display_name]": "Free worldwide delivery — insured, signed for",
    "shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]": "business_day",
    "shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]": "5",
    "shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]": "business_day",
    "shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]": "21",
  };

  slugs.forEach((slug, i) => {
    form[`line_items[${i}][price]`] = PRICES[slug].price;
    form[`line_items[${i}][quantity]`] = "1";
    form[`payment_intent_data[metadata][slug_${slug}]`] = "1";
  });
  form["payment_intent_data[metadata][slugs]"] = slugs.join(",");
  form["metadata[slugs]"] = slugs.join(",");
  SHIPPING_COUNTRIES.forEach((c, i) => {
    form[`shipping_address_collection[allowed_countries][${i}]`] = c;
  });

  try {
    const session = await stripe(env, "/checkout/sessions", "POST", form);
    return json({ url: session.url });
  } catch (err) {
    return json({ error: "Could not start checkout. " + err.message }, 502);
  }
}

/* ---------- POST /api/stripe-webhook ---------- */
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function verifySignature(payload, header, secret) {
  if (!header) return false;
  const parts = {};
  header.split(",").forEach((p) => {
    const [k, v] = p.split("=").map((s) => s.trim());
    parts[k] = v;
  });
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${parts.t}.${payload}`));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return safeEqual(hex, parts.v1);
}

async function postWebhook(request, env) {
  const raw = await request.text();
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) {
    return new Response("not configured", { status: 503 });
  }
  if (!(await verifySignature(raw, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET))) {
    return new Response("bad signature", { status: 400 });
  }

  let event;
  try { event = JSON.parse(raw); } catch { return new Response("bad payload", { status: 400 }); }

  // async_payment_succeeded matters for delayed methods (bank debits and the
  // like): those fire completed while still unpaid, and only settle later.
  // Without it, such a sale would never mark the painting as sold.
  const HANDLED = ["checkout.session.completed", "checkout.session.async_payment_succeeded"];
  if (!HANDLED.includes(event.type)) return new Response("ignored", { status: 200 });

  const session = event.data.object;
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return new Response("not yet paid", { status: 200 });
  }

  const slugs = ((session.metadata && session.metadata.slugs) || "").split(",").filter(Boolean);
  await Promise.all(slugs.map(async (slug) => {
    const entry = PRICES[slug];
    if (!entry) return;
    await stripe(env, `/products/${entry.product}`, "POST", { active: "false" });
  }));

  return new Response("ok", { status: 200 });
}

/* ---------- GET /api/health ----------
   Configuration check. Reports only whether variables exist and which
   Stripe mode a key is for — never any value, prefix or length. */
function getHealth(env) {
  const key = env.STRIPE_SECRET_KEY;
  let mode = "missing";
  if (typeof key === "string" && key) {
    if (key.startsWith("sk_live_") || key.startsWith("rk_live_")) mode = "live";
    else if (key.startsWith("sk_test_") || key.startsWith("rk_test_")) mode = "test";
    else mode = "set-but-unrecognised-format";
  }
  const all = Object.keys(env).sort();
  return json({
    worker: "ok",
    // bump this by hand so we can tell which deployment is answering
    version: "2026-07-27-c",
    stripeSecretKey: Boolean(key),
    stripeKeyMode: mode,
    stripeWebhookSecret: Boolean(env.STRIPE_WEBHOOK_SECRET),
    // every binding name, ASSETS included. If this shows only ASSETS then
    // env is working fine and the secrets simply are not on this Worker.
    allBindings: all,
    bindingCount: all.length,
    envVarNames: all.filter((k) => k !== "ASSETS"),
  });
}

/* ---------- router ---------- */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        if (url.pathname === "/api/health" && request.method === "GET") return getHealth(env);
        if (url.pathname === "/api/sold" && request.method === "GET") return await getSold(env);
        if (url.pathname === "/api/checkout" && request.method === "POST") return await postCheckout(request, env, url);
        if (url.pathname === "/api/stripe-webhook" && request.method === "POST") return await postWebhook(request, env);
        return json({ error: "Not found" }, 404);
      } catch (err) {
        return json({ error: "Server error. Please try again or send an enquiry." }, 500);
      }
    }

    // Belt and braces: .assetsignore already keeps these out of the upload,
    // but never serve server-side source even if one slips in.
    if (
      url.pathname === "/_worker.js" ||
      url.pathname.startsWith("/worker/") ||
      url.pathname.startsWith("/functions/") ||
      url.pathname === "/wrangler.jsonc" ||
      url.pathname === "/.assetsignore"
    ) {
      return new Response("Not found", { status: 404 });
    }

    // Everything else is the static site.
    return env.ASSETS.fetch(request);
  },
};
