/* Basket for Landscapes by Lindy.
   Every painting is a unique original, so the basket is a set of slugs —
   there are no quantities. Prices shown here are for display only; the
   amount charged is resolved server-side in /api/checkout. */
(function () {
  "use strict";

  var KEY = "lbl-basket";

  /* Works sold away from the website, so no Stripe payment archived them.
     Their pages and gallery cards are already marked sold in the HTML; this
     list is what clears them from a basket saved before they sold, and what
     greys the button if one is ever missed. Keep in step with SOLD_OUT in
     worker/index.js, which is what actually refuses the sale. */
  var SOLD_OUT = ["blossom-walk", "emerald-surf"];

  function read() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(v) ? v.filter(function (s) { return typeof s === "string"; }) : [];
    } catch (e) { return []; }
  }
  function write(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
    paint();
    document.dispatchEvent(new CustomEvent("basket:change", { detail: items }));
  }

  var Basket = {
    items: read,
    has: function (slug) { return read().indexOf(slug) !== -1; },
    add: function (slug) {
      var it = read();
      if (it.indexOf(slug) === -1) it.push(slug);
      write(it);
    },
    remove: function (slug) {
      write(read().filter(function (s) { return s !== slug; }));
    },
    toggle: function (slug) {
      this.has(slug) ? this.remove(slug) : this.add(slug);
      return this.has(slug);
    },
    clear: function () { write([]); },
  };
  window.Basket = Basket;

  /* ---- nav badge ---- */
  function paint() {
    var n = read().length;
    document.querySelectorAll("[data-basket-count]").forEach(function (el) {
      el.textContent = n;
      el.hidden = n === 0;
    });
    document.querySelectorAll("[data-basket-link]").forEach(function (el) {
      el.setAttribute("aria-label", n === 1 ? "Basket, 1 work" : "Basket, " + n + " works");
    });
  }

  /* ---- add / remove buttons on artwork and gallery pages ---- */
  function label(btn, inBasket) {
    // A sold work's button is greyed out and reads Sold — never relabel it.
    if (btn.classList.contains("is-sold")) return;
    btn.textContent = inBasket ? "In Basket — Remove" : (btn.dataset.addLabel || "Add to Basket");
    btn.classList.toggle("in-basket", inBasket);
  }

  function wire() {
    document.querySelectorAll("[data-add-to-basket]").forEach(function (btn) {
      var slug = btn.getAttribute("data-add-to-basket");
      label(btn, Basket.has(slug));
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        label(btn, Basket.toggle(slug));
      });
    });
    document.addEventListener("basket:change", function () {
      document.querySelectorAll("[data-add-to-basket]").forEach(function (btn) {
        label(btn, Basket.has(btn.getAttribute("data-add-to-basket")));
      });
    });
  }

  /* ---- grey out sold works and drop them from the basket ---- */
  function applySold(sold) {
    if (!sold || !sold.length) return;

    // Mark the buttons before touching the basket: writing fires
    // basket:change, and the is-sold class is what stops the relabel.
    sold.forEach(function (slug) {
      document.querySelectorAll('[data-add-to-basket="' + slug + '"]').forEach(function (btn) {
        btn.classList.add("is-sold");
        btn.disabled = true;
        btn.textContent = "Sold";
      });
    });

    // a sold work cannot stay in someone's basket
    var kept = read().filter(function (s) { return sold.indexOf(s) === -1; });
    if (kept.length !== read().length) write(kept);
  }

  /* ---- and again from the API, which knows about works sold since ---- */
  function markSold() {
    fetch("/api/sold")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d) applySold(d.sold); })
      .catch(function () { /* offline or not configured — leave as is */ });
  }

  document.addEventListener("DOMContentLoaded", function () {
    paint();
    wire();
    applySold(SOLD_OUT);
    markSold();
  });
})();
