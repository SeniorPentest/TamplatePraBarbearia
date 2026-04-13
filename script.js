// Função principal do Carrossel
function initCarousel(containerSelector) {
    const carouselWrapper = document.querySelector(containerSelector);
    if (!carouselWrapper) return;

    const carousel = carouselWrapper.querySelector('.carousel-track') || carouselWrapper.querySelector('.snacks-carousel');
    if (!carousel) return;

    const cards = carousel.querySelectorAll('.snack-card, .plan-card, .value-card, .carousel-item');
    const totalSlides = cards.length;
    if (!totalSlides) return;

    const prevBtn = carouselWrapper.querySelector('.carousel-btn-prev');
    const nextBtn = carouselWrapper.querySelector('.carousel-btn-next');
    const dotsContainer = carouselWrapper.querySelector('.carousel-dots');

    let currentSlide = 0;
    let autoplayId = null;

    carousel.classList.add('is-carousel');

    // Criar pontos de navegação
    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('button');
            dot.classList.add('carousel-dot');
            if (i === 0) dot.classList.add('active');
            dot.addEventListener('click', () => { currentSlide = i; updateCarousel(); resetAutoplay(); });
            dotsContainer.appendChild(dot);
        }
    }

    const getGap = () => {
        const style = getComputedStyle(carousel);
        const gapValue = style.columnGap || style.gap || '0';
        return parseFloat(gapValue) || 0;
    };

    const getCarouselMetrics = () => {
        const cardWidth = cards[0].offsetWidth + getGap();
        const visibleCards = Math.max(1, Math.round(carouselWrapper.offsetWidth / cardWidth));
        const maxIndex = Math.max(0, totalSlides - visibleCards);
        return { cardWidth, maxIndex };
    };

    function updateCarousel() {
        const { cardWidth, maxIndex } = getCarouselMetrics();
        if (currentSlide > maxIndex) currentSlide = maxIndex;
        carousel.style.transform = `translateX(-${currentSlide * cardWidth}px)`;
        if (dotsContainer) {
            const dots = dotsContainer.querySelectorAll('.carousel-dot');
            dots.forEach((dot, index) => dot.classList.toggle('active', index === currentSlide));
        }
    }

    function nextSlide() {
        const { maxIndex } = getCarouselMetrics();
        currentSlide = (currentSlide >= maxIndex) ? 0 : currentSlide + 1;
        updateCarousel();
    }

    function prevSlide() {
        const { maxIndex } = getCarouselMetrics();
        currentSlide = (currentSlide > 0) ? currentSlide - 1 : maxIndex;
        updateCarousel();
    }

    const startAutoplay = () => {
        stopAutoplay();
        autoplayId = setInterval(nextSlide, 3000);
    };

    const stopAutoplay = () => {
        if (autoplayId) { clearInterval(autoplayId); autoplayId = null; }
    };

    const resetAutoplay = () => { stopAutoplay(); startAutoplay(); };

    if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); resetAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); resetAutoplay(); });
    window.addEventListener('resize', updateCarousel);
    carouselWrapper.addEventListener('mouseenter', stopAutoplay);
    carouselWrapper.addEventListener('mouseleave', startAutoplay);

    updateCarousel();
    startAutoplay();
}

// Inicialização Global
document.addEventListener('DOMContentLoaded', () => {
    initCarousel('.snacks-carousel-wrapper');
    initCarousel('.plans-wrapper');
    initCarousel('.values-wrapper');

    // Fallback de imagens
    document.querySelectorAll('.snack-card-img img[data-fallback]').forEach(img => {
        img.addEventListener('error', () => {
            if (img.dataset.fallback) { img.src = img.dataset.fallback; img.removeAttribute('data-fallback'); }
        }, { once: true });
    });

    // Header scroll
    const header = document.getElementById('header');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 20);
        });
    }

    // Hamburger menu
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('open');
            navLinks.classList.toggle('open');
            hamburger.setAttribute('aria-expanded', navLinks.classList.contains('open'));
        });
    }

    // Contact form
    const form = document.getElementById('contact-form');
    const status = document.getElementById('form-status');
    if (form && status) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            status.textContent = 'Mensagem enviada com sucesso!';
            status.className = 'form-status success';
            form.reset();
            setTimeout(() => { status.textContent = ''; status.className = 'form-status'; }, 4000);
        });
    }
});
