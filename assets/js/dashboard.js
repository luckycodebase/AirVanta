// Dashboard Module for updating UI

const Dashboard = {
  // Update all dashboard elements
  updateDashboard: (data) => {
    Dashboard.updateAQIDisplay(data);
    Dashboard.updatePollutants(data);
    Dashboard.updateLocationInfo(data);

    // Keep exposure-risk section in sync with every new AQI payload.
    if (typeof ExposureRisk !== 'undefined' && typeof ExposureRisk.updateFromAQIData === 'function') {
      ExposureRisk.updateFromAQIData(data);
    }
    
    // Automatically collect historical AQI data for predictions
    if (data.aqi !== undefined && data.city) {
      // Update history and regenerate forecast for the same city
      Prediction.collectHistoricalAQI(data.aqi, data.city).then(() => {
        // Wait for history collection to complete before generating forecast
        Prediction.generateAndDisplayForecast('aqi', data.city);
      });
    }
  },

  // Update main AQI display
  updateAQIDisplay: (data) => {
    const { category, class: aqiClass } = Utils.getAQICategory(data.aqi);
    
    // Update AQI value
    document.getElementById('aqiValue').textContent = data.aqi;
    document.getElementById('aqiLabel').textContent = 'AQI';
    
    // Update circle styling
    const circle = document.getElementById('aqiCircle');
    circle.className = `aqi-circle ${aqiClass}`;
    
    // Update category and description
    document.getElementById('aqiCategory').textContent = category;
    document.getElementById('aqiDescription').textContent = Utils.getHealthWarning(data.aqi);
  },

  // Update pollutant cards
  updatePollutants: (data) => {
    const pollutants = data.pollutants || {};
    
    const pollutantMap = {
      'pm25Value': pollutants.pm25,
      'pm10Value': pollutants.pm10,
      'o3Value': pollutants.o3,
      'no2Value': pollutants.no2,
      'coValue': pollutants.co,
      'so2Value': pollutants.so2
    };

    for (const [elementId, value] of Object.entries(pollutantMap)) {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = value !== null && value !== undefined ? Math.round(value) : '--';
      }
    }
  },

  // Update location information
  updateLocationInfo: (data) => {
    const locationName = document.getElementById('locationName');
    const locationTime = document.getElementById('locationTime');
    
    if (locationName) {
      locationName.textContent = data.city || 'Unknown Location';
    }
    
    if (locationTime) {
      locationTime.textContent = `Last updated: ${Utils.formatTime(new Date(data.timestamp))}`;
    }
  }
};
