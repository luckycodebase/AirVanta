// Charts Module using Chart.js

const Charts = {
  instances: {},
  chartConfigs: {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 12, weight: '500' }
        }
      }
    }
  },

  // Initialize all charts
  initCharts: async (locationData = null) => {
    const currentData = locationData || Utils.storage.get('lastLocation');
    if (!currentData?.city && !currentData?.stationCity) {
      Charts.displayEmptyPollutantChart();
      return;
    }

    await Charts.createAQITrendChart(locationData);
    await Charts.createPollutantChart(locationData);
    await Charts.createHourlyChart(locationData);
    await Charts.createHistoricalChart(locationData);
  },

  // Create 7-day AQI trend chart
  createAQITrendChart: async (locationData = null) => {
    const ctx = document.getElementById('aqiTrendChart');
    if (!ctx) return;

    const currentData = locationData || Utils.storage.get('lastLocation');
    const city = currentData?.stationCity || currentData?.city;
    if (!city) return;
    let data = [];

    try {
      const response = await fetch(
        `https://air-quality-index-tracker.onrender.com/api/aqi/history/${encodeURIComponent(city)}?days=7`
      );

      if (response.ok) {
        const result = await response.json();
        const backendData = Array.isArray(result?.data) ? result.data : [];

        data = backendData.map((item) => ({
          date: Utils.formatDate(new Date(item.date)),
          value: Math.round(Number(item.aqi) || 0)
        }));
      }
    } catch (error) {
      console.warn('7-day trend backend fetch unavailable, trying local history fallback.');
    }

    // Fallback to local history for the city if backend has no data yet.
    if (!data.length) {
      const localHistory = Utils.storage.get('aqi_history', []) || [];
      const normalizedCity = (city || '').toString().toLowerCase();

      data = localHistory
        .filter(item => item && item.city && item.date)
        .filter(item => (item.city || '').toString().toLowerCase().includes(normalizedCity) || normalizedCity.includes((item.city || '').toString().toLowerCase()))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-7)
        .map((item) => ({
          date: Utils.formatDate(new Date(item.date)),
          value: Math.round(Number(item.aqi) || 0)
        }));
    }

    // If still empty, use one stable point from current AQI card data instead of random demo data.
    if (!data.length) {
      const latestAQI = Number(currentData?.aqi);
      if (Number.isFinite(latestAQI)) {
        data = [{ date: Utils.formatDate(new Date()), value: Math.round(latestAQI) }];
      } else {
        data = [{ date: Utils.formatDate(new Date()), value: 0 }];
      }
    }

    if (Charts.instances.aqiTrend) {
      Charts.instances.aqiTrend.destroy();
    }

    Charts.instances.aqiTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d => d.date),
        datasets: [{
          label: 'AQI Value',
          data: data.map(d => d.value),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointBackgroundColor: '#10b981',
          pointBorderColor: 'white',
          pointBorderWidth: 2,
          pointHoverRadius: 8
        }]
      },
      options: {
        ...Charts.chartConfigs,
        scales: {
          y: {
            beginAtZero: true,
            max: 300,
            ticks: {
              callback: function(value) {
                return value;
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          }
        }
      }
    });
  },

  // Create pollutant breakdown chart with real data
  createPollutantChart: async (locationData = null) => {
    const ctx = document.getElementById('pollutantChart');
    if (!ctx) return;

    try {
      // Use already-fetched payload first to avoid mismatches from extra API calls.
      const currentData = locationData || Utils.storage.get('lastLocation');
      const city = currentData?.stationCity || currentData?.city;
      let pollutants = currentData?.pollutants || {};

      if (!city) {
        console.warn('No city data available for pollutant chart');
        Charts.displayEmptyPollutantChart();
        return;
      }

      const hasRealPollutants = Object.values(pollutants).some(
        (value) => value !== null && value !== undefined && Number.isFinite(Number(value))
      );

      // Fallback to latest stored backend data when the live payload has no pollutant values.
      if (!hasRealPollutants) {
        try {
          const response = await fetch(
            `https://air-quality-index-tracker.onrender.com/api/aqi/history/${encodeURIComponent(city)}?days=1`
          );

          if (response.ok) {
            const result = await response.json();
            const backendData = Array.isArray(result?.data) ? result.data : [];
            const latest = backendData.length ? backendData[backendData.length - 1] : null;
            if (latest?.pollutants) {
              pollutants = latest.pollutants;
            }
          }
        } catch (err) {
          console.warn('Pollutant backend fallback failed:', err.message);
        }
      }

      const pollutantLabels = ['PM2.5', 'PM10', 'O₃', 'NO₂', 'CO', 'SO₂'];
      const pollutantKeys = ['pm25', 'pm10', 'o3', 'no2', 'co', 'so2'];
      const pollutantValues = pollutantKeys.map(key => Math.round(Number(pollutants[key]) || 0));


      if (Charts.instances.pollutant) {
        Charts.instances.pollutant.destroy();
      }

      Charts.instances.pollutant = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: pollutantLabels,
          datasets: [{
            data: pollutantValues,
            backgroundColor: [
              '#ef4444',
              '#f97316',
              '#eab308',
              '#3b82f6',
              '#8b5cf6',
              '#06b6d4'
            ],
            borderColor: 'white',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 15,
                font: { size: 11 },
                boxWidth: 12
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error creating pollutant chart:', error);
      Charts.displayEmptyPollutantChart();
    }
  },

  // Display empty pollutant chart when data unavailable
  displayEmptyPollutantChart: () => {
    const ctx = document.getElementById('pollutantChart');
    if (!ctx) return;

    if (Charts.instances.pollutant) {
      Charts.instances.pollutant.destroy();
    }

    Charts.instances.pollutant = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['PM2.5', 'PM10', 'O₃', 'NO₂', 'CO', 'SO₂'],
        datasets: [{
          data: [0, 0, 0, 0, 0, 0],
          backgroundColor: [
            '#ef4444',
            '#f97316',
            '#eab308',
            '#3b82f6',
            '#8b5cf6',
            '#06b6d4'
          ],
          borderColor: 'white',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 11 },
              boxWidth: 12
            }
          }
        }
      }
    });
  },

  // Create hourly variation chart (async - fetches real data)
  createHourlyChart: async (locationData = null) => {
    const ctx = document.getElementById('hourlyChart');
    if (!ctx) return;

    // Get current location for hourly data
    const currentData = locationData || Utils.storage.get('lastLocation');
    const lat = Number(currentData?.latitude) || 40.7128; // Default NYC
    const lon = Number(currentData?.longitude) || -74.0060;

    try {
      const data = await API.getHourlyData(lat, lon);

      if (Charts.instances.hourly) {
        Charts.instances.hourly.destroy();
      }

      Charts.instances.hourly = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: data.map(d => d.hour),
          datasets: [{
            label: 'AQI',
            data: data.map(d => d.aqi),
            backgroundColor: data.map(d => {
              const color = Utils.getAQICategory(d.aqi).class;
              return color ? `var(--aqi-${color})` : '#10b981';
            }),
            borderColor: data.map(d => Utils.getAQICategory(d.aqi).color),
            borderWidth: 1,
            borderRadius: 5
          }]
        },
        options: {
          ...Charts.chartConfigs,
          indexAxis: 'x',
          scales: {
            y: {
              beginAtZero: true,
              max: 300,
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error creating hourly chart:', error);
    }
  },

  // Create historical 30-day trend chart (async - fetches real data)
  createHistoricalChart: async (locationData = null) => {
    const ctx = document.getElementById('historicalChart');
    if (!ctx) return;

    try {
      const currentData = locationData || Utils.storage.get('lastLocation');
      const city = currentData?.stationCity || currentData?.city;
      if (!city) return;
      
      const data = await API.getHistoricalData(city, 30);

      if (Charts.instances.historical) {
        Charts.instances.historical.destroy();
      }

      Charts.instances.historical = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.map(d => d.date),
          datasets: [
            {
              label: 'AQI',
              data: data.map(d => d.aqi),
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.05)',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointBackgroundColor: '#10b981',
              pointBorderColor: 'white'
            },
            {
              label: 'PM2.5',
              data: data.map(d => d.pm25),
              borderColor: '#ef4444',
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderDash: [5, 5],
              filled: false,
              tension: 0.4,
              pointRadius: 2,
              pointBackgroundColor: '#ef4444'
            }
          ]
        },
        options: {
          ...Charts.chartConfigs,
          scales: {
            y: {
              beginAtZero: true,
              max: 300,
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error creating historical chart:', error);
    }
  },

  // Update all charts with new data
  updateAll: async (data) => {
    // Regenerate charts with new location data
    await Charts.initCharts(data || null);
  },

  // Update specific chart
  updateChart: (chartName, newData) => {
    if (Charts.instances[chartName]) {
      Charts.instances[chartName].data = newData;
      Charts.instances[chartName].update();
    }
  }
};

// Initialize charts when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Charts.initCharts().catch(err => console.error('Error initializing charts:', err));
});
