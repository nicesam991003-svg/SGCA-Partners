document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle logic
  const navbarContainer = document.querySelector('.navbar .container');
  const nav = document.querySelector('nav');
  
  if (navbarContainer && nav) {
      // Inject hamburger button
      const mobileBtn = document.createElement('button');
      mobileBtn.className = 'mobile-menu-btn';
      mobileBtn.innerHTML = '<span></span><span></span><span></span>';
      
      navbarContainer.appendChild(mobileBtn);
      
      mobileBtn.addEventListener('click', () => {
          mobileBtn.classList.toggle('active');
          nav.classList.toggle('active');
      });
      
      // Close menu when clicking a link
      document.querySelectorAll('.nav-link, .dropdown-link').forEach(link => {
          link.addEventListener('click', () => {
              mobileBtn.classList.remove('active');
              nav.classList.remove('active');
          });
      });
  }
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });

  // Highlight active nav link based on current path
  const currentPath = window.location.pathname.split('/').pop();
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href');
    if (linkPath === currentPath || (currentPath === '' && linkPath === 'index.html')) {
      link.classList.add('active');
    }
  });

  // Hero Slider Logic
  const slidesContainer = document.getElementById('slides-container');
  if (slidesContainer) {
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    let currentSlide = 0;
    const totalSlides = slides.length;
    let slideInterval;

    function updateSlider() {
      slidesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;
    }

    function nextSlide() {
      currentSlide = (currentSlide + 1) % totalSlides;
      updateSlider();
    }

    function prevSlide() {
      currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
      updateSlider();
    }

    nextBtn.addEventListener('click', () => {
      nextSlide();
      resetInterval();
    });

    prevBtn.addEventListener('click', () => {
      prevSlide();
      resetInterval();
    });

    function startInterval() {
      slideInterval = setInterval(nextSlide, 5000);
    }

    function resetInterval() {
      clearInterval(slideInterval);
      startInterval();
    }

    startInterval();
  }
});
