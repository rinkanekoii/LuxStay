document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar');
  if (navbar) {
    const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const active = navMenu.classList.toggle('active');
      navToggle.classList.toggle('active', active);
      navToggle.setAttribute('aria-expanded', String(active));
    });
  }

  document.querySelectorAll('[data-confirm]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      if (!window.confirm(form.getAttribute('data-confirm'))) {
        event.preventDefault();
      }
    });
  });

  const bookingForm = document.querySelector('.booking-form[data-price]');
  const pricePreview = document.getElementById('pricePreview');
  if (bookingForm && pricePreview) {
    const price = Number(bookingForm.dataset.price || 0);
    const checkIn = bookingForm.querySelector('[name="check_in"]');
    const checkOut = bookingForm.querySelector('[name="check_out"]');
    const formatter = new Intl.NumberFormat('vi-VN');

    const updatePrice = () => {
      const inDate = new Date(`${checkIn.value}T00:00:00Z`);
      const outDate = new Date(`${checkOut.value}T00:00:00Z`);
      const nights = Math.round((outDate - inDate) / (24 * 60 * 60 * 1000));
      if (!Number.isFinite(nights) || nights < 1) {
        pricePreview.textContent = 'Chọn ngày để tính giá';
        return;
      }
      pricePreview.textContent = `${formatter.format(nights * price)}đ · ${nights} đêm`;
    };

    checkIn.addEventListener('change', updatePrice);
    checkOut.addEventListener('change', updatePrice);
    updatePrice();
  }

  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 360);
    }, { passive: true });
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  document.querySelectorAll('#flashMessage').forEach((msg) => {
    setTimeout(() => {
      msg.style.opacity = '0';
      msg.style.transform = 'translateX(-50%) translateY(-8px)';
      setTimeout(() => msg.remove(), 260);
    }, 4500);
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.animate-on-scroll').forEach((el) => observer.observe(el));
  } else {
    document.querySelectorAll('.animate-on-scroll').forEach((el) => el.classList.add('visible'));
  }
});
