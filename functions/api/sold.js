// GET /api/sold  →  { "sold": ["beached", ...] }
// Lets the gallery and artwork pages mark sold works without a rebuild.
// Cached briefly at the edge so browsing does not hammer the Stripe API.
import { PRICES } from "./_prices.js";

export async function onRequestGet({ env }) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=60",
  };
  if (!env.STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ sold: [] }), { headers });
  }
  try {
    const res = await fetch(
      "https://api.stripe.com/v1/products?limit=100&active=false",
      { headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } }
    );
    const data = await res.json();
    const archived = new Set((data.data || []).map((p) => p.metadata?.slug).filter(Boolean));
    const sold = Object.keys(PRICES).filter((s) => archived.has(s));
    return new Response(JSON.stringify({ sold }), { headers });
  } catch {
    // Never block browsing on a Stripe outage — just show everything available.
    return new Response(JSON.stringify({ sold: [] }), { headers });
  }
}
