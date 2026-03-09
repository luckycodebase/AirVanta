// Main Application File

const App = {
  // Initialize application
  init: async () => {
    // Setup UI elements
    App.setupUI();
    App.setupDarkMode();
    App.setupNavigation();
    
    // Load initial data
    // Don't pre-fill location - let map auto-detect current location
    const locationInput = document.getElementById('locationInput');
    if (locationInput && !locationInput.value) {
      locationInput.placeholder = 'Detecting your location...';
    }
    
    // Initialize all systems
    await PlantRecommendation.loadPlants();
    if (typeof Prediction !== 'undefined' && typeof Prediction.init === 'function') {
      Prediction.init();
    }
    
    // Initialize new modules
    if (typeof Advisor !== 'undefined') {
      Advisor.init();
    }
    
    if (typeof GlobalRanking !== 'undefined') {
      setTimeout(() => {
        GlobalRanking.init();
      }, 2000); // Delay to avoid overwhelming API
    }
    
    if (typeof Chatbot !== 'undefined') {
      Chatbot.init();
    }
    
  },

  // Setup UI interactions
  setupUI: () => {
    // Search functionality
    document.getElementById('searchBtn')?.addEventListener('click', () => {
      const location = document.getElementById('locationInput').value;
      if (location.trim()) {
        AQIMap.searchLocation(location);
      } else {
        Utils.showNotification('Please enter a location', 'info');
      }
    });

    // Enter key in search box
    document.getElementById('locationInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const location = document.getElementById('locationInput').value;
        if (location.trim()) {
          AQIMap.searchLocation(location);
        }
      }
    });

    // Data source info toggle
    const dataSourceToggle = document.getElementById('dataSourceToggle');
    const dataSourceDetails = document.getElementById('dataSourceDetails');
    if (dataSourceToggle && dataSourceDetails) {
      dataSourceToggle.addEventListener('click', () => {
        const isVisible = dataSourceDetails.style.display !== 'none';
        dataSourceDetails.style.display = isVisible ? 'none' : 'block';
        
        // Rotate icon
        const icon = dataSourceToggle.querySelector('i');
        if (icon) {
          icon.style.transform = isVisible ? 'rotate(0deg)' : 'rotate(180deg)';
        }
      });
    }

    // Smooth scroll for navigation
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href !== '#' && !href.includes('#home')) {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
            App.closeNavMenu();
          }
        }
      });
    });
  },

  // Setup dark mode toggle
  setupDarkMode: () => {
    const darkModeBtn = document.getElementById('darkModeToggle');
    const isDarkMode = Utils.storage.get('darkMode', false);
    
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      darkModeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    darkModeBtn?.addEventListener('click', () => {
      const isCurrentlyDark = document.body.classList.contains('dark-mode');
      
      if (isCurrentlyDark) {
        document.body.classList.remove('dark-mode');
        darkModeBtn.innerHTML = '<i class="fas fa-moon"></i>';
        Utils.storage.set('darkMode', false);
      } else {
        document.body.classList.add('dark-mode');
        darkModeBtn.innerHTML = '<i class="fas fa-sun"></i>';
        Utils.storage.set('darkMode', true);
      }
      
      // STEP 4: Update chart colors when theme changes
      // Use setTimeout to ensure DOM class is applied first
      setTimeout(() => {
        if (typeof Prediction !== 'undefined' && typeof Prediction.updateChartTheme === 'function') {
          Prediction.updateChartTheme();
        }
      }, 10);
    });
  },

  // Setup navigation
  setupNavigation: () => {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    hamburger?.addEventListener('click', () => {
      navMenu?.classList.toggle('active');
      hamburger.classList.toggle('active');
    });
    
    // Close menu when link clicked
    document.querySelectorAll('.nav-menu a').forEach(link => {
      link.addEventListener('click', App.closeNavMenu);
    });
  },

  // Close navigation menu
  closeNavMenu: () => {
    const navMenu = document.querySelector('.nav-menu');
    const hamburger = document.querySelector('.hamburger');
    navMenu?.classList.remove('active');
    hamburger?.classList.remove('active');
  }
};

// Start application when DOM is loaded
document.addEventListener('DOMContentLoaded', App.init);

// Hide loading overlay when everything is loaded
window.addEventListener('load', () => {
  setTimeout(() => {
    Utils.toggleLoading(false);
  }, 1000);
});

// Handle window resize for responsive behavior
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    App.closeNavMenu();
  }
});
