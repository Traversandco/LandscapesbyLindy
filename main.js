// Landscapes by Lindy — site behaviour

/* Scroll-scrubbed hero — home page.
 *
 * The signature fills the page, then travels into the navbar's logo slot in
 * the top-left corner as you scroll through the stage. It is tied to scroll
 * position rather than to a timer, so it tracks the scrollbar exactly and
 * runs backwards when you scroll up. Nothing is locked at any point.
 *
 * The geometry is FLIP: measure where the signature sits naturally, measure
 * where the navbar logo rests, and interpolate between the two by progress.
 * Both are the same artwork at the same 1247:398 aspect, so at progress 1
 * the travelling signature lies exactly over the navbar logo and the two
 * are swapped without a visible seam.
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

    // Everything except the signature fades out as the signature departs.
    const fading = hero.querySelectorAll(
        '.eyebrow, .hero-wordmark, .hero-content p, .hero-actions, .hero-scroll'
    );

    let from = null;
    let to = null;
    let landed = false;
    let ticking = false;

    function measure() {
        // Measure the signature untransformed, or the deltas compound.
        mark.style.transform = '';
        const f = mark.getBoundingClientRect();
        const t = navLogo.getBoundingClientRect();
        if (!f.width || !t.width) { from = to = null; return; }
        from = { cx: f.left + f.width / 2, cy: f.top + f.height / 2, w: f.width };
        to = { cx: t.left + t.width / 2, cy: t.top + t.height / 2, w: t.width };
    }

    function apply() {
        ticking = false;
        if (!from || !to) return;

        const runway = stage.offsetHeight - window.innerHeight;
        const travelled = window.scrollY - stage.offsetTop;
        let p = runway > 0 ? travelled / runway : 1;
        p = p < 0 ? 0 : (p > 1 ? 1 : p);

        const scale = 1 + (to.w / from.w - 1) * p;
        const dx = (to.cx - from.cx) * p;
        const dy = (to.cy - from.cy) * p;
        mark.style.transform =
            'translate(' + dx + 'px, ' + dy + 'px) scale(' + scale + ')';

        // The hero copy clears well before the signature arrives.
        const fade = 1 - Math.min(1, p * 1.7);
        for (let i = 0; i < fading.length; i++) fading[i].style.opacity = fade;

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

    function remeasure() {
        // Measuring is only valid with the stage pinned at its start.
        const y = window.scrollY;
        if (y > 4) { onScroll(); return; }
        measure();
        onScroll();
    }

    measure();
    apply();
    // Tells the head script's failsafe that the scrub is running after all.
    window.__lblScrubReady = true;

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', remeasure, { passive: true });
    window.addEventListener('orientationchange', remeasure, { passive: true });
    /* The signature is an inline SVG with its own width and height, so its
       box is known immediately; the PNG it masks arrives later and does not
       change the box. Re-measure on window load anyway, in case webfonts or
       late layout have moved the navbar logo the scrub is aiming at. */
    window.addEventListener('load', function () { remeasure(); });
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
