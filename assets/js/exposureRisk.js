// Exposure Risk Module - Personal Pollution Risk Assessment

const ExposureRisk = {
  // State
  currentRisk: null,
  weatherData: null,
  exposureTime: 1, // Default 1 hour
  currentAQIData: null,

  // Exposure time options (in hours)
  exposureOptions: {
    '15min': 0.25,
    '30min': 0.5,
    '1hour': 1,
    '2hours': 2,
    '4hours': 4
  },

  // Initialize module
  init: () => {
    ExposureRisk.setupEventListeners();
    ExposureRisk.loadDefaultSettings();
  },

  // Setup event listeners
  setupEventListeners: () => {
    const timeButtons = document.querySelectorAll('.exposure-time-btn');
    timeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Remove active class from all buttons
        timeButtons.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        e.target.classList.add('active');
        
        const timeKey = e.target.dataset.time;
        ExposureRisk.exposureTime = ExposureRisk.exposureOptions[timeKey];
        
        // Recalculate risk
        ExposureRisk.calculateAndDisplayRisk();
      });
    });

    // Refresh button
    const refreshBtn = document.getElementById('refreshExposureRisk');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        ExposureRisk.refreshRiskAnalysis();
      });
    }
  },

  // Load default settings
  loadDefaultSettings: () => {
    // Set default exposure time button as active
    const defaultBtn = document.querySelector('.exposure-time-btn[data-time="1hour"]');
    if (defaultBtn) {
      defaultBtn.classList.add('active');
    }
  },

  // Get pollution factor based on dominant pollutant
  getPollutionFactor: (dominantPollutant) => {
    const factors = {
      'pm25': 0.8,
      'pm10': 0.7,
      'o3': 0.6,
      'ozone': 0.6,
      'co': 0.5,
      'no2': 0.65,
      'so2': 0.7
    };

    const pollutant = (dominantPollutant || 'pm25').toLowerCase();
    return factors[pollutant] || 0.7; // Default to 0.7 if unknown
  },

  // Calculate exposure risk score
  calculateExposureRisk: (aqi, exposureTime, dominantPollutant) => {
    const pollutionFactor = ExposureRisk.getPollutionFactor(dominantPollutant);
    const riskScore = aqi * exposureTime * pollutionFactor;
    
    
    return {
      score: Math.round(riskScore),
      pollutionFactor: pollutionFactor,
      exposureTime: exposureTime
    };
  },

  // Classify risk level
  classifyRiskLevel: (riskScore) => {
    if (riskScore <= 100) {
      return {
        level: 'Low Risk',
        color: '#10b981',
        icon: '✅',
        class: 'low'
      };
    } else if (riskScore <= 200) {
      return {
        level: 'Moderate Risk',
        color: '#f59e0b',
        icon: '⚠️',
        class: 'moderate'
      };
    } else if (riskScore <= 300) {
      return {
        level: 'High Risk',
        color: '#ef4444',
        icon: '🚨',
        class: 'high'
      };
    } else {
      return {
        level: 'Dangerous',
        color: '#991b1b',
        icon: '☠️',
        class: 'dangerous'
      };
    }
  },

  // Generate health advice based on risk level and AQI
  generateHealthAdvice: (riskScore, aqi, dominantPollutant, weatherData) => {
    const classification = ExposureRisk.classifyRiskLevel(riskScore);
    const advice = {
      level: classification.level,
      icon: classification.icon,
      color: classification.color,
      recommendations: [],
      outdoorTime: '',
      warnings: []
    };

    // Risk-based recommendations
    if (riskScore <= 100) {
      advice.recommendations = [
        '👍 Safe for outdoor activities',
        '🏃 Exercise outdoors is okay',
        '🚶 No special precautions needed'
      ];
      advice.outdoorTime = 'No time limit';
    } else if (riskScore <= 200) {
      advice.recommendations = [
        '😷 Consider wearing a mask if sensitive',
        '🏃 Limit intense outdoor exercise',
        '👶 Monitor children and elderly',
        '🪟 Keep windows closed during peak hours'
      ];
      advice.outdoorTime = 'Limit to 2-3 hours';
    } else if (riskScore <= 300) {
      advice.recommendations = [
        '😷 Wear N95 or KN95 mask outdoors',
        '🚫 Avoid outdoor exercise',
        '⏱️ Limit outdoor exposure to essentials',
        '👨‍👩‍👧‍👦 Keep vulnerable groups indoors',
        '💨 Use air purifiers indoors'
      ];
      advice.outdoorTime = 'Max 1 hour, essential only';
    } else {
      advice.recommendations = [
        '🚨 Stay indoors if possible',
        '😷 N95 mask mandatory if going outside',
        '🚫 No outdoor exercise',
        '⚠️ Seek medical attention if breathing difficulty',
        '🏥 High-risk groups should avoid all exposure',
        '💨 Keep all windows closed, use air purifiers'
      ];
      advice.outdoorTime = 'Avoid outdoor exposure';
      advice.warnings.push('⚠️ HEALTH ALERT: Air quality is dangerous');
    }

    // Pollutant-specific advice
    const pollutant = (dominantPollutant || 'pm25').toLowerCase();
    if (pollutant.includes('pm')) {
      advice.recommendations.push('🔬 Particulate matter is elevated - use HEPA filters');
    } else if (pollutant.includes('o3') || pollutant.includes('ozone')) {
      advice.recommendations.push('☀️ Ozone levels high - avoid outdoor activities during afternoon');
    } else if (pollutant.includes('co')) {
      advice.recommendations.push('🚗 Carbon monoxide detected - avoid traffic areas');
    }

    // Weather-based modifications
    if (weatherData) {
      if (weatherData.windSpeed < 5) {
        advice.warnings.push('💨 Low wind speed may increase pollution concentration');
      }
      if (weatherData.humidity > 80) {
        advice.warnings.push('💧 High humidity may worsen respiratory symptoms');
      }
      if (weatherData.temperature > 30) {
        advice.warnings.push('🌡️ High temperature combined with pollution increases health risks');
      }
    }

    return advice;
  },

  // Fetch weather data from Open-Meteo Weather API
  fetchWeatherData: async (lat, lon) => {
    try {
      
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?` +
        `latitude=${lat}&longitude=${lon}&` +
        `current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&` +
        `timezone=auto`
      );

      if (!response.ok) {
        throw new Error('Weather API error');
      }

      const data = await response.json();
      
      if (!data.current) {
        throw new Error('No weather data available');
      }

      const weatherData = {
        temperature: Math.round(data.current.temperature_2m),
        humidity: Math.round(data.current.relative_humidity_2m),
        windSpeed: Math.round(data.current.wind_speed_10m * 10) / 10,
        weatherCode: data.current.weather_code,
        timestamp: data.current.time
      };

      ExposureRisk.weatherData = weatherData;
      return weatherData;

    } catch (error) {
      console.error('❌ Error fetching weather data:', error);
      // Return default/fallback data
      return {
        temperature: 20,
        humidity: 50,
        windSpeed: 10,
        weatherCode: 0,
        error: true
      };
    }
  },

  // Get weather description from code
  getWeatherDescription: (code) => {
    const codes = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Foggy',
      51: 'Light drizzle',
      61: 'Slight rain',
      80: 'Rain showers',
      95: 'Thunderstorm'
    };
    return codes[code] || 'Unknown';
  },

  // Calculate and display risk
  calculateAndDisplayRisk: async () => {
    try {
      // Prefer latest AQI payload pushed from dashboard/search flow.
      let aqiData = ExposureRisk.currentAQIData;

      // Fallback path for manual use before dashboard has pushed data.
      if (!aqiData) {
        const lastLocation = Utils.storage.get('lastLocation');
        if (lastLocation && lastLocation.latitude !== undefined && lastLocation.longitude !== undefined) {
          aqiData = await API.getAQIByCoordinates(lastLocation.latitude, lastLocation.longitude);
        } else if (lastLocation && lastLocation.city) {
          aqiData = await API.getAQI(lastLocation.city);
        } else {
          const coords = await Utils.getDeviceCoordinates({ timeout: 10000, maximumAge: 0 });
          aqiData = await API.getAQIByCoordinates(coords.latitude, coords.longitude);

          const locationName = await Utils.getLocationName(coords.latitude, coords.longitude);
          const resolvedCity = locationName || aqiData.city || 'Current Location';

          aqiData.city = resolvedCity;
          aqiData.stationCity = aqiData.stationCity || aqiData.city;

          Utils.storage.set('lastLocation', {
            city: resolvedCity,
            stationCity: aqiData.stationCity,
            aqi: aqiData.aqi,
            latitude: coords.latitude,
            longitude: coords.longitude,
            pollutants: aqiData.pollutants || {},
            timestamp: new Date().toISOString()
          });
        }
      }
      
      if (!aqiData) {
        throw new Error('Failed to fetch AQI data');
      }

      ExposureRisk.currentAQIData = aqiData;

      // Fetch weather data
      const weatherData = await ExposureRisk.fetchWeatherData(
        aqiData.latitude,
        aqiData.longitude
      );

      // Calculate risk
      const risk = ExposureRisk.calculateExposureRisk(
        aqiData.aqi,
        ExposureRisk.exposureTime,
        aqiData.dominantPollutant
      );

      ExposureRisk.currentRisk = risk;

      // Generate health advice
      const advice = ExposureRisk.generateHealthAdvice(
        risk.score,
        aqiData.aqi,
        aqiData.dominantPollutant,
        weatherData
      );

      // Display results
      ExposureRisk.displayRiskResults(risk, advice, aqiData, weatherData);

      // Update weather impact
      ExposureRisk.displayWeatherImpact(weatherData, aqiData);

      // Create visualization
      ExposureRisk.createRiskCharts(aqiData, risk);


    } catch (error) {
      console.error('❌ Error calculating exposure risk:', error);
      ExposureRisk.displayError('Unable to calculate exposure risk. Please try again.');
    }
  },

  // Update risk using already-fetched AQI data (called after each search/location update).
  updateFromAQIData: async (aqiData) => {
    if (!aqiData || aqiData.aqi === undefined) {
      return;
    }

    ExposureRisk.currentAQIData = aqiData;
    await ExposureRisk.calculateAndDisplayRisk();
  },

  // Display risk results
  displayRiskResults: (risk, advice, aqiData, weatherData) => {
    const container = document.getElementById('exposureRiskResults');
    if (!container) return;

    const classification = ExposureRisk.classifyRiskLevel(risk.score);

    const html = `
      <div class="risk-header" style="border-left: 4px solid ${classification.color}">
        <div class="risk-score">
          <span class="risk-icon" style="font-size: 2.5rem">${advice.icon}</span>
          <div class="risk-details">
            <h3 style="color: ${classification.color}; margin: 0">${advice.level}</h3>
            <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; opacity: 0.8">
              Risk Score: ${risk.score} | Exposure: ${ExposureRisk.exposureTime}h | AQI: ${aqiData.aqi}
            </p>
          </div>
        </div>
      </div>

      <div class="risk-content">
        ${advice.warnings.length > 0 ? `
          <div class="risk-warnings">
            ${advice.warnings.map(w => `<div class="warning-item">${w}</div>`).join('')}
          </div>
        ` : ''}

        <div class="risk-section">
          <h4>⏱️ Recommended Outdoor Time</h4>
          <p class="outdoor-time" style="color: ${classification.color}; font-weight: bold; font-size: 1.1rem">
            ${advice.outdoorTime}
          </p>
        </div>

        <div class="risk-section">
          <h4>🏥 Health Recommendations</h4>
          <ul class="recommendations-list">
            ${advice.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>

        <div class="risk-section">
          <h4>🔬 Pollutant Information</h4>
          <p>
            <strong>Dominant Pollutant:</strong> ${aqiData.dominantPollutant.toUpperCase()}<br>
            <strong>Pollution Factor:</strong> ${risk.pollutionFactor} (higher = more harmful)
          </p>
        </div>

        <div class="risk-footer">
          <small>⏰ Updated: ${new Date().toLocaleTimeString()}</small>
        </div>
      </div>
    `;

    container.innerHTML = html;
    container.style.display = 'block';
  },

  // Display weather impact analysis
  displayWeatherImpact: (weatherData, aqiData) => {
    const container = document.getElementById('weatherImpact');
    if (!container) return;

    let impactLevel = 'Neutral';
    let impactColor = '#6b7280';
    let impactIcon = '⚖️';
    let insights = [];

    // Analyze wind speed impact
    if (weatherData.windSpeed < 5) {
      impactLevel = 'Negative';
      impactColor = '#ef4444';
      impactIcon = '⚠️';
      insights.push(`💨 Low wind speed (${weatherData.windSpeed} km/h) may trap pollutants near ground level, increasing concentration.`);
    } else if (weatherData.windSpeed > 15) {
      impactLevel = 'Positive';
      impactColor = '#10b981';
      impactIcon = '✅';
      insights.push(`💨 Strong wind speed (${weatherData.windSpeed} km/h) helps disperse pollutants, improving air quality.`);
    } else {
      insights.push(`💨 Moderate wind speed (${weatherData.windSpeed} km/h) provides some pollution dispersal.`);
    }

    // Analyze humidity impact
    if (weatherData.humidity > 80) {
      impactLevel = 'Negative';
      impactColor = '#ef4444';
      impactIcon = '⚠️';
      insights.push(`💧 High humidity (${weatherData.humidity}%) may worsen respiratory symptoms and increase particle adhesion.`);
    } else if (weatherData.humidity < 30) {
      insights.push(`💧 Low humidity (${weatherData.humidity}%) - stay hydrated as dry air can irritate airways.`);
    } else {
      insights.push(`💧 Humidity level (${weatherData.humidity}%) is moderate.`);
    }

    // Analyze temperature impact
    if (weatherData.temperature > 30) {
      impactLevel = 'Negative';
      impactColor = '#ef4444';
      impactIcon = '⚠️';
      insights.push(`🌡️ High temperature (${weatherData.temperature}°C) increases heat stress and pollution formation (e.g., ozone).`);
    } else if (weatherData.temperature < 5) {
      insights.push(`🌡️ Cold temperature (${weatherData.temperature}°C) - cold air can worsen symptoms for sensitive individuals.`);
    } else {
      insights.push(`🌡️ Temperature (${weatherData.temperature}°C) is comfortable.`);
    }

    // Overall assessment
    let overallAssessment = '';
    if (impactLevel === 'Negative') {
      overallAssessment = 'Weather conditions are contributing to poor air quality. Extra caution advised.';
    } else if (impactLevel === 'Positive') {
      overallAssessment = 'Weather conditions are helping to improve air quality.';
    } else {
      overallAssessment = 'Weather conditions have a neutral impact on air quality.';
    }

    const html = `
      <div class="weather-impact-header" style="border-left: 4px solid ${impactColor}">
        <span style="font-size: 2rem">${impactIcon}</span>
        <div>
          <h4 style="margin: 0; color: ${impactColor}">${impactLevel} Weather Impact</h4>
          <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem">${overallAssessment}</p>
        </div>
      </div>

      <div class="weather-details">
        <div class="weather-grid">
          <div class="weather-item">
            <span class="weather-icon">🌡️</span>
            <div>
              <strong>${weatherData.temperature}°C</strong>
              <small>Temperature</small>
            </div>
          </div>
          <div class="weather-item">
            <span class="weather-icon">💧</span>
            <div>
              <strong>${weatherData.humidity}%</strong>
              <small>Humidity</small>
            </div>
          </div>
          <div class="weather-item">
            <span class="weather-icon">💨</span>
            <div>
              <strong>${weatherData.windSpeed} km/h</strong>
              <small>Wind Speed</small>
            </div>
          </div>
          <div class="weather-item">
            <span class="weather-icon">☁️</span>
            <div>
              <strong>${ExposureRisk.getWeatherDescription(weatherData.weatherCode)}</strong>
              <small>Conditions</small>
            </div>
          </div>
        </div>

        <div class="weather-insights">
          <h5>📊 Weather Analysis:</h5>
          <ul>
            ${insights.map(insight => `<li>${insight}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;

    container.innerHTML = html;
    container.style.display = 'block';
  },

  // Create risk visualization charts
  createRiskCharts: (aqiData, risk) => {
    // Chart 1: AQI vs Exposure Risk across different time periods
    ExposureRisk.createExposureTimeChart(aqiData);

    // Chart 2: Pollutant breakdown
    ExposureRisk.createPollutantImpactChart(aqiData);
  },

  // Chart 1: Exposure Risk vs Time
  createExposureTimeChart: (aqiData) => {
    const canvas = document.getElementById('exposureTimeChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart
    if (window.exposureTimeChartInstance) {
      window.exposureTimeChartInstance.destroy();
    }

    const times = [0.25, 0.5, 1, 2, 4, 6, 8];
    const pollutionFactor = ExposureRisk.getPollutionFactor(aqiData.dominantPollutant);
    
    const riskScores = times.map(t => aqiData.aqi * t * pollutionFactor);

    window.exposureTimeChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: times.map(t => t < 1 ? `${t * 60}min` : `${t}h`),
        datasets: [{
          label: 'Exposure Risk Score',
          data: riskScores,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7
        }, {
          label: 'Moderate Risk Threshold',
          data: times.map(() => 100),
          borderColor: '#f59e0b',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0
        }, {
          label: 'High Risk Threshold',
          data: times.map(() => 200),
          borderColor: '#dc2626',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#e5e7eb', font: { size: 11 } }
          },
          title: {
            display: true,
            text: 'Risk Score vs Exposure Duration',
            color: '#e5e7eb',
            font: { size: 14, weight: 'bold' }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                const classification = ExposureRisk.classifyRiskLevel(value);
                return `${context.dataset.label}: ${value.toFixed(0)} (${classification.level})`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Risk Score',
              color: '#e5e7eb'
            },
            ticks: { color: '#9ca3af' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          },
          x: {
            title: {
              display: true,
              text: 'Exposure Time',
              color: '#e5e7eb'
            },
            ticks: { color: '#9ca3af' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          }
        }
      }
    });
  },

  // Chart 2: Pollutant Impact Comparison
  createPollutantImpactChart: (aqiData) => {
    const canvas = document.getElementById('pollutantImpactChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart
    if (window.pollutantImpactChartInstance) {
      window.pollutantImpactChartInstance.destroy();
    }

    const pollutants = ['PM2.5', 'PM10', 'O3', 'NO2', 'CO', 'SO2'];
    const values = [
      aqiData.pollutants.pm25 || 0,
      aqiData.pollutants.pm10 || 0,
      aqiData.pollutants.o3 || 0,
      aqiData.pollutants.no2 || 0,
      aqiData.pollutants.co || 0,
      aqiData.pollutants.so2 || 0
    ];

    const factors = pollutants.map(p => ExposureRisk.getPollutionFactor(p.toLowerCase()));
    const impacts = values.map((v, i) => v * factors[i]);

    window.pollutantImpactChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: pollutants,
        datasets: [{
          label: 'Current Level (μg/m³)',
          data: values,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: '#3b82f6',
          borderWidth: 1,
          yAxisID: 'y'
        }, {
          label: 'Health Impact Factor',
          data: impacts,
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: '#ef4444',
          borderWidth: 1,
          yAxisID: 'y1',
          type: 'line',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#e5e7eb', font: { size: 11 } }
          },
          title: {
            display: true,
            text: 'Pollutant Levels & Health Impact',
            color: '#e5e7eb',
            font: { size: 14, weight: 'bold' }
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Concentration (μg/m³)',
              color: '#e5e7eb'
            },
            ticks: { color: '#9ca3af' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Impact Score',
              color: '#e5e7eb'
            },
            ticks: { color: '#9ca3af' },
            grid: { display: false }
          },
          x: {
            ticks: { color: '#9ca3af' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          }
        }
      }
    });
  },

  // Refresh risk analysis
  refreshRiskAnalysis: async () => {
    Utils.toggleLoading(true);
    
    try {
      await ExposureRisk.calculateAndDisplayRisk();
      Utils.showNotification('Exposure risk analysis updated!', 'success');
    } catch (error) {
      console.error('Error refreshing:', error);
      Utils.showNotification('Failed to refresh analysis', 'error');
    } finally {
      Utils.toggleLoading(false);
    }
  },

  // Display error message
  displayError: (message) => {
    const container = document.getElementById('exposureRiskResults');
    if (!container) return;

    container.innerHTML = `
      <div class="error-message" style="text-align: center; padding: 2rem; color: #ef4444">
        <span style="font-size: 3rem">⚠️</span>
        <p style="margin-top: 1rem">${message}</p>
        <button onclick="ExposureRisk.refreshRiskAnalysis()" class="btn-primary" style="margin-top: 1rem">
          Try Again
        </button>
      </div>
    `;
  }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ExposureRisk.init);
} else {
  ExposureRisk.init();
}
