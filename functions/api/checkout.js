// POST /api/checkout
// Creates a Stripe Checkout Session for one or more paintings.
//
// The browser sends slugs only — never prices. Prices are resolved
// server-side from PRICES below, so a tampered basket cannot change
// what is charged.
//
// Requires the STRIPE_SECRET_KEY environment variable (Cloudflare Pages
// → Settings → Environment variables). Nothing works until that is set.

import { PRICES } from "./_prices.js";
import { SHIPPING_COUNTRIES } from "./_countries.js";

const STRIPE = "https://api.stripe.com/v1";

async function stripe(env, path, method = "GET", body) {
  const res = await fetch(STRIPE + path, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || `Stripe ${res.status}`);
  return json;
}

// A painting is unavailable if its Stripe product has been archived
// (the webhook does this on a completed sale) or if a succeeded payment
// already carries its slug.
async function soldSlugs(env, slugs) {
  const sold = [];
  await Promise.all(
    slugs.map(async (slug) => {
      const { product } = PRICES[slug];
      try {
        const p = await stripe(env, `/products/${product}`);
        if (p.active === false) return sold.push(slug);
      } catch { /* fall through to the payment check */ }
      try {
        const q = encodeURIComponent(
          `status:'succeeded' AND metadata['slug_${slug}']:'1'`
        );
        const r = await stripe(env, `/payment_intents/search?limit=1&query=${q}`);
        if (r.data && r.data.length) sold.push(slug);
      } catch { /* search unavailable — rely on the archive check */ }
    })
  );
  return sold;
}

export async function onRequestPost({ request, env }) {
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });

  if (!env.STRIPE_SECRET_KEY) {
    return json({ error: "Payments are not configured yet." }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  // de-duplicate: every painting is unique, so quantity is always 1
  const slugs = [...new Set(body.slugs || [])].filter((s) => PRICES[s]);
  if (!slugs.length) return json({ error: "Your basket is empty." }, 400);

  const unavailable = await soldSlugs(env, slugs);
  if (unavailable.length) {
    return json(
      {
        error: "sold",
        sold: unavailable,
        message:
          unavailable.map((s) => PRICES[s].name).join(" and ") +
          (unavailable.length > 1 ? " have" : " has") +
          " just sold. Please remove " +
          (unavailable.length > 1 ? "them" : "it") +
          " to continue.",
      },
      409
    );
  }

  const origin = new URL(request.url).origin;
  const form = {
    mode: "payment",
    success_url: `${origin}/order-complete.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/basket.html`,
    billing_address_collection: "required",
    "phone_number_collection[enabled]": "true",
    submit_type: "pay",
    // Free worldwide delivery, insured — the only shipping option offered.
    "shipping_options[0][shipping_rate_data][type]": "fixed_amount",
    "shipping_options[0][shipping_rate_data][fixed_amount][amount]": "0",
    "shipping_options[0][shipping_rate_data][fixed_amount][currency]": "gbp",
    "shipping_options[0][shipping_rate_data][display_name]":
      "Free worldwide delivery — insured, signed for",
    "shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]": "business_day",
    "shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]": "5",
    "shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]": "business_day",
    "shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]": "21",
  };

  slugs.forEach((slug, i) => {
    form[`line_items[${i}][price]`] = PRICES[slug].price;
    form[`line_items[${i}][quantity]`] = "1";
    // one key per painting so a sold work can be found by search later
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
