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
  document.querySelectorAll('a[href*="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      const currentPage = window.location.pathname.split('/').pop() || 'index.html';
      
      // Check if it's a link to an anchor on the current page
      const isSamePageAnchor = href.startsWith('#') || 
                               href.startsWith(currentPage + '#') ||
                               (currentPage === 'index.html' && href.startsWith('./#'));

      if (isSamePageAnchor) {
          const targetId = href.split('#')[1];
          const target = document.getElementById(targetId);
          
          if (target) {
            e.preventDefault();
            const headerHeight = window.innerWidth <= 992 ? 80 : 100;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight - 20;
            
            window.scrollTo({
              top: targetPosition,
              behavior: 'smooth'
            });
            
            // Update URL hash without jump
            history.pushState(null, null, '#' + targetId);
          }
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
