// POST /api/stripe-webhook
// Stripe calls this when a checkout completes. It archives each painting
// that was bought, so the work immediately reads as sold everywhere and
// a second buyer cannot pay for it.
//
// Needs STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in the environment.
// In Stripe: Developers → Webhooks → add endpoint
//   https://landscapesbylindy.co.uk/api/stripe-webhook
//   event: checkout.session.completed

const enc = new TextEncoder();

// Constant-time-ish compare so a signature cannot be guessed byte by byte.
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function verify(payload, header, secret) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.split("=").map((s) => s.trim()))
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;

  // reject anything older than five minutes (replay protection)
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${payload}`));
  const hex = [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return safeEqual(hex, v1);
}

export async function onRequestPost({ request, env }) {
  const raw = await request.text();

  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) {
    return new Response("not configured", { status: 503 });
  }
  const ok = await verify(raw, request.headers.get("stripe-signature"), env.STRIPE_WEBHOOK_SECRET);
  if (!ok) return new Response("bad signature", { status: 400 });

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("bad payload", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response("ignored", { status: 200 });
  }

  const session = event.data.object;
  if (session.payment_status !== "paid") {
    return new Response("unpaid", { status: 200 });
  }

  const { PRICES } = await import("./_prices.js");
  const slugs = (session.metadata?.slugs || "").split(",").filter(Boolean);

  await Promise.all(
    slugs.map(async (slug) => {
      const entry = PRICES[slug];
      if (!entry) return;
      await fetch(`https://api.stripe.com/v1/products/${entry.product}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "active=false",
      });
    })
  );

  return new Response("ok", { status: 200 });
}
