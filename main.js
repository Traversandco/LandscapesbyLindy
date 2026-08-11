// Landscapes by Lindy — site behaviour

/* Scroll-scrubbed hero — home page.
 *
 * The signature fills the page, then travels into the navbar's logo slot in
 * the top-left corner as you scroll through the stage. It is tied to scroll
 * position rather than a timer, so it tracks the scrollbar exactly and runs
 * backwards on the way up. Nothing is locked at any point.
 *
 * The travelling signature is a copy of the hero's, living in a fixed layer
 * above the navbar. That separation is the whole point: the signature has
 * to pass in FRONT of the header while the hero's own copy passes BEHIND
 * it, and one element cannot do both. Raising the hero raised its text too.
 * The original stays in the hero, hidden but still occupying its space, so
 * the layout is untouched and the copy flows exactly as it always did.
 *
 * Positions are measured live each frame from that hidden original, so the
 * travel is correct whether the hero is pinned or not — no offset to
 * correct for, and no stale measurement after a resize.
 *
 * .js-scrub is set in the head before first paint; this only reads it.
 */
(function () {
    'use strict';

    const root = document.documentElement;
    const stage = document.querySelector('[data-hero-stage]');
    const hero = document.querySelector('[data-splash-home]');
    if (!stage || !hero || !root.classList.contains('js-scrub')) return;

    const mark = hero.querySelector('.hero-signature');
    const navLogo = document.querySelector('.navbar .logo img');
    if (!mark || !navLogo) { root.classList.remove('js-scrub'); return; }

    /* The flying copy. Ids inside are rewritten, or its mask would resolve
       to the original's and the two would share one animation. */
    const layer = document.createElement('div');
    layer.className = 'hero-mark-layer';
    layer.setAttribute('aria-hidden', 'true');

    const fly = mark.cloneNode(true);
    fly.classList.add('is-flying');
    fly.removeAttribute('role');
    fly.removeAttribute('aria-label');
    const oldMask = fly.querySelector('mask');
    if (oldMask) {
        oldMask.id = 'pen-mask-fly';
        const masked = fly.querySelector('[mask]');
        if (masked) masked.setAttribute('mask', 'url(#pen-mask-fly)');
    }
    layer.appendChild(fly);
    document.body.appendChild(layer);

    // The original holds its space but is never seen; the copy is the one
    // that draws and travels.
    mark.style.visibility = 'hidden';

    let landed = false;
    let ticking = false;

    function apply() {
        ticking = false;

        // Measured live, so pinned or not this is where the signature is.
        const base = mark.getBoundingClientRect();
        const target = navLogo.getBoundingClientRect();
        if (!base.width || !target.width) return;

        const runway = stage.offsetHeight - window.innerHeight;
        const travelled = window.scrollY - stage.offsetTop;
        let raw = runway > 0 ? travelled / runway : 1;
        raw = raw < 0 ? 0 : (raw > 1 ? 1 : raw);

        // Land before the pin releases, so the arrival is not still running
        // as the page moves on.
        const LANDS_AT = 0.8;
        let p = raw / LANDS_AT;
        if (p > 1) p = 1;

        // Park the copy over the original, then travel from there.
        fly.style.left = base.left + 'px';
        fly.style.top = base.top + 'px';
        fly.style.width = base.width + 'px';
        fly.style.height = base.height + 'px';

        const scale = 1 + (target.width / base.width - 1) * p;
        const dx = (target.left + target.width / 2) - (base.left + base.width / 2);
        const dy = (target.top + target.height / 2) - (base.top + base.height / 2);
        fly.style.transform =
            'translate(' + (dx * p) + 'px, ' + (dy * p) + 'px) scale(' + scale + ')';

        // Hand over to the real navbar logo only once they coincide.
        const nowLanded = p > 0.995;
        if (nowLanded !== landed) {
            landed = nowLanded;
            root.classList.toggle('scrub-landed', landed);
        }
    }

    function onScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(apply);
    }

    apply();
    window.__lblScrubReady = true;

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('orientationchange', onScroll, { passive: true });
    window.addEventListener('load', onScroll);
})();

// Navbar shadow on scroll
const navbar = document.querySelector('.navbar');
if (navbar) {
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
}

// Mobile menu toggle
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');
if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => navLinks.classList.remove('open'));
    });
}

// Reveal-on-scroll animations (respects reduced motion via CSS)
const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length) {
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
        revealEls.forEach(el => observer.observe(el));
    } else {
        revealEls.forEach(el => el.classList.add('visible'));
    }
}

// Enquiry pre-fill — artwork pages link to contact.html?work=Title
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    const params = new URLSearchParams(window.location.search);
    const work = params.get('work');
    if (work) {
        const subject = document.getElementById('subject');
        const message = document.getElementById('message');
        if (subject && !subject.value) {
            subject.value = 'Enquiry — ' + work;
        }
        if (message && !message.value) {
            message.value = 'Hello Lindy,\n\nI would love to know more about "' + work + '". Could you tell me about availability, payment, and delivery?\n\nThank you.';
        }
        const name = document.getElementById('name');
        if (name) name.focus();
    }

    // Returning from the no-JS redirect flow
    if (params.get('sent') === '1') {
        const formMessage = document.getElementById('form-message');
        formMessage.textContent = 'Thank you — your enquiry has been sent. Lindy will reply personally, usually within a day or two.';
        formMessage.style.display = 'block';
        formMessage.setAttribute('role', 'status');
    }

    // Submit silently via FormSubmit — visitor never leaves the page
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formMessage = document.getElementById('form-message');
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const subject = document.getElementById('subject').value.trim();
        const message = document.getElementById('message').value.trim();

        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending…';

        try {
            const resp = await fetch('https://formsubmit.co/ajax/lindyhams@gmail.com', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    _subject: subject,
                    message: message,
                    _template: 'table',
                    _captcha: 'false'
                })
            });

            if (!resp.ok) throw new Error('FormSubmit responded ' + resp.status);

            formMessage.textContent = 'Thank you — your enquiry has been sent. Lindy will reply personally, usually within a day or two.';
            formMessage.style.display = 'block';
            formMessage.setAttribute('role', 'status');
            contactForm.reset();
            submitBtn.textContent = 'Sent';
        } catch (err) {
            // Fallback: open the visitor's email app pre-addressed
            const body = 'Name: ' + name + '\nEmail: ' + email + '\n\n' + message;
            window.location.href = 'mailto:lindyhams@gmail.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
            formMessage.textContent = 'The direct send didn\'t go through, so your email app has been opened with the message ready — or email lindyhams@gmail.com directly.';
            formMessage.style.display = 'block';
            formMessage.setAttribute('role', 'status');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
}

// Smooth scroll for same-page anchors
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href.length > 1) {
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });
});
