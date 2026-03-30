// ===========================
// Snacks Carousel
// ===========================

let currentSlide = 0;
const carousel = document.querySelector('.snacks-carousel');
const carouselWrapper = document.querySelector('.snacks-carousel-wrapper');
const prevBtn = document.querySelector('.carousel-btn-prev');
const nextBtn = document.querySelector('.carousel-btn-next');
const dotsContainer = document.querySelector('.carousel-dots');

function initSnackImageFallbacks() {
    const images = document.querySelectorAll('.snack-card-img img[data-fallback]');
    images.forEach(img => {
        img.addEventListener('error', () => {
            const fallback = img.dataset.fallback;
            if (fallback) {
                img.src = fallback;
                img.removeAttribute('data-fallback');
            }
        }, { once: true });
    });
}

function initCarousel() {
    if (!carousel || !carouselWrapper) return;

    const cards = carousel.querySelectorAll('.snack-card');
    const totalSlides = cards.length;
    const carouselMobileBreakpoint = 700;
    const mobileQuery = window.matchMedia(`(max-width: ${carouselMobileBreakpoint}px)`);

    // Create dots
    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('button');
            dot.classList.add('carousel-dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(i));
            dotsContainer.appendChild(dot);
        }
    }

    // Update carousel position
    function updateCarousel() {
        if (mobileQuery.matches) {
            carousel.style.transform = 'none';
        } else {
            const cardWidth = cards[0].offsetWidth + 24; // card width + gap
            carousel.style.transform = `translateX(-${currentSlide * cardWidth}px)`;
        }

        // Update dots
        if (dotsContainer) {
            const dots = dotsContainer.querySelectorAll('.carousel-dot');
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === currentSlide);
            });
        }

        // Update button states
        if (prevBtn) prevBtn.disabled = mobileQuery.matches || currentSlide === 0;
        if (nextBtn) nextBtn.disabled = mobileQuery.matches || currentSlide === totalSlides - 1;
    }

    function goToSlide(index) {
        currentSlide = Math.max(0, Math.min(index, totalSlides - 1));
        updateCarousel();
    }

    function nextSlide() {
        if (currentSlide < totalSlides - 1) {
            currentSlide++;
            updateCarousel();
        }
    }

    function prevSlide() {
        if (currentSlide > 0) {
            currentSlide--;
            updateCarousel();
        }
    }

    // Event listeners
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);

    // Handle window resize
    window.addEventListener('resize', updateCarousel);

    // Initial update
    updateCarousel();
}

// ===========================
// Navigation
// ===========================

const header    = document.getElementById('header');
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');
const navAnchors = navLinks ? navLinks.querySelectorAll('a') : [];

// Sticky header on scroll
window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
    updateActiveNavLink();
    revealOnScroll();
});

// Hamburger menu toggle
if (hamburger) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('open');
        navLinks.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', navLinks.classList.contains('open'));
    });
}

// Close mobile menu when a link is clicked
navAnchors.forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
    });
});

// ===========================
// Dropdown keyboard support
// ===========================

document.querySelectorAll('.has-dropdown > a').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
        if (window.innerWidth <= 700) {
            e.preventDefault();
            const parent = trigger.parentElement;
            parent.classList.toggle('open');
        }
    });
});

// ===========================
// Active Nav Link Highlight
// ===========================

function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 100;

    sections.forEach(section => {
        const top    = section.offsetTop;
        const height = section.offsetHeight;
        const id     = section.getAttribute('id');
        const link   = navLinks ? navLinks.querySelector(`a[href="#${id}"]`) : null;

        if (link) {
            if (scrollPos >= top && scrollPos < top + height) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        }
    });
}

// ===========================
// Scroll Reveal Animation
// ===========================

function revealOnScroll() {
    const revealElements = document.querySelectorAll('.reveal');
    const windowHeight   = window.innerHeight;

    revealElements.forEach(el => {
        const top = el.getBoundingClientRect().top;
        if (top < windowHeight - 60) {
            el.classList.add('visible');
        }
    });
}

// ===========================
// Contact Form
// ===========================

const contactForm = document.getElementById('contact-form');
const formStatus  = document.getElementById('form-status');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name    = contactForm.name.value.trim();
        const email   = contactForm.email.value.trim();
        const message = contactForm.message.value.trim();

        if (!name || !email || !message) {
            setFormStatus('Por favor, preencha todos os campos obrigatórios.', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            setFormStatus('Por favor, insira um e-mail válido.', 'error');
            return;
        }

        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const submitSpan = submitBtn ? submitBtn.querySelector('span') : null;
        if (submitBtn) submitBtn.disabled = true;
        if (submitSpan) submitSpan.textContent = 'Enviando...';

        setTimeout(() => {
            setFormStatus('Mensagem enviada com sucesso! Em breve entraremos em contato. ✉', 'success');
            contactForm.reset();
            if (submitBtn) submitBtn.disabled = false;
            if (submitSpan) submitSpan.textContent = 'Enviar Mensagem';
        }, 1200);
    });
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setFormStatus(msg, type) {
    if (!formStatus) return;
    formStatus.textContent = msg;
    formStatus.className = 'form-status ' + type;

    setTimeout(() => {
        formStatus.textContent = '';
        formStatus.className = 'form-status';
    }, 5000);
}

// ===========================
// Init on DOM ready
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize carousel
    initCarousel();
    initSnackImageFallbacks();

    // Add reveal class to cards and sections
    const targets = document.querySelectorAll(
        '.snack-card, .value-card, .program-card, .plan-card, ' +
        '.channel-card, .loyalty-text, .loyalty-visual, ' +
        '.compliance-text, .compliance-seals, ' +
        '.contact-info, .contact-form, .section-header'
    );
    targets.forEach(el => {
        if (!el.classList.contains('reveal')) {
            el.classList.add('reveal');
        }
    });

    revealOnScroll();
    updateActiveNavLink();
});
