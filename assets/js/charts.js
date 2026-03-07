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
  initCharts: async () => {
    await Charts.createAQITrendChart();
    Charts.createPollutantChart();
    await Charts.createHourlyChart();
    await Charts.createHistoricalChart();
  },

  // Create 7-day AQI trend chart
  createAQITrendChart: async () => {
    const ctx = document.getElementById('aqiTrendChart');
    if (!ctx) return;

    const currentData = Utils.storage.get('lastLocation');
    const city = currentData?.city || 'Unknown';
    let data = [];

    try {
      const response = await fetch(
        `http://localhost:5001/api/aqi/history/${encodeURIComponent(city)}?days=7`
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

  // Create pollutant breakdown chart
  createPollutantChart: () => {
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
          data: [120, 100, 60, 80, 50, 40],
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
  createHourlyChart: async () => {
    const ctx = document.getElementById('hourlyChart');
    if (!ctx) return;

    // Get current location for hourly data
    const currentData = Utils.storage.get('lastLocation');
    const lat = currentData?.lat || 40.7128; // Default NYC
    const lon = currentData?.lon || -74.0060;

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
  createHistoricalChart: async () => {
    const ctx = document.getElementById('historicalChart');
    if (!ctx) return;

    try {
      const currentData = Utils.storage.get('lastLocation');
      const city = currentData?.city || 'Unknown';
      
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
    await Charts.initCharts();
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
