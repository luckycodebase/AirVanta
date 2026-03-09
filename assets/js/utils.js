// Utility Functions

const Utils = {
  // Get AQI category and color based on value
  getAQICategory: (aqi) => {
    if (aqi <= 50) return { category: 'Good', color: '#22c55e', class: 'good' };
    if (aqi <= 100) return { category: 'Moderate', color: '#eab308', class: 'moderate' };
    if (aqi <= 150) return { category: 'Unhealthy for Sensitive Groups', color: '#f97316', class: 'sensitive' };
    if (aqi <= 200) return { category: 'Unhealthy', color: '#ef4444', class: 'unhealthy' };
    if (aqi <= 300) return { category: 'Very Unhealthy', color: '#a855f7', class: 'very-unhealthy' };
    return { category: 'Hazardous', color: '#7c2d12', class: 'hazardous' };
  },

  // Get health warning message
  getHealthWarning: (aqi) => {
    if (aqi <= 50) return 'Enjoy the fresh air! Air quality is great.';
    if (aqi <= 100) return 'Air quality is acceptable. Sensitive groups should consider limiting outdoor exposure.';
    if (aqi <= 150) return 'Members of sensitive groups should reduce outdoor exposure.';
    if (aqi <= 200) return 'Everyone should reduce outdoor exposure. Use masks if necessary.';
    if (aqi <= 300) return 'Avoid outdoor activities. Use air purifiers indoors.';
    return 'Take urgent action! Stay indoors and use air purifiers.';
  },

  // Format time
  formatTime: (date = new Date()) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  },

  // Format date for charts
  formatDate: (date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(date);
  },

  // Get dominant pollutant
  getDominantPollutant: (pollutants) => {
    if (!pollutants || Object.keys(pollutants).length === 0) return null;
    
    let max = 0;
    let maxPollutant = null;
    
    for (const [key, value] of Object.entries(pollutants)) {
      if (value > max) {
        max = value;
        maxPollutant = key;
      }
    }
    
    return { pollutant: maxPollutant, value: max };
  },

  // Generate random data for demo
  generateDemoData: (days = 7, baseValue = 65) => {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const trend = Math.sin(i / days * Math.PI) * 20;
      const variation = (Math.random() - 0.5) * 30;
      const value = Math.max(0, baseValue + trend + variation);
      
      data.push({
        date: Utils.formatDate(date),
        value: Math.round(value),
        fullDate: date
      });
    }
    return data;
  },

  // Debounce function
  debounce: (func, delay) => {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  },

  // Toggle loading state
  toggleLoading: (show = true) => {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  },

  // Show notification
  showNotification: (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
      ${type === 'error' ? 'background: #ef4444; color: white;' : ''}
      ${type === 'success' ? 'background: #22c55e; color: white;' : ''}
      ${type === 'info' ? 'background: #06b6d4; color: white;' : ''}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  },

  // Get reverse geocoding (city from coordinates)
  getLocationName: async (lat, lon) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const data = await response.json();
      
        // Prefer clean city names over bureaucratic ones
        let cityName = data.address?.city || data.address?.town || data.address?.village;
      
        // Remove "Municipal Corporation" suffix if present
        if (cityName && cityName.includes('Municipal Corporation')) {
          cityName = cityName.replace(' Municipal Corporation', '').trim();
        }
      
        return cityName || 'Unknown Location';
    } catch (error) {
      console.error('Error getting location name:', error);
      return 'Unknown Location';
    }
  },

  // Get precise device coordinates using browser geolocation.
  getDeviceCoordinates: (options = {}) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: options.timeout || 10000,
          maximumAge: options.maximumAge || 0
        }
      );
    });
  },

  // localStorage helpers
  storage: {
    set: (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error('Storage error:', e);
      }
    },
    get: (key, defaultValue = null) => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (e) {
        console.error('Storage error:', e);
        return defaultValue;
      }
    },
    remove: (key) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error('Storage error:', e);
      }
    }
  }
};

// Add styles for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(300px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(300px);
    }
  }
`;
document.head.appendChild(style);
