// Landscapes by Lindy — site behaviour

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
