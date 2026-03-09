// AQI Prediction Module using Linear Regression Time-Series Forecasting

const Prediction = {
  forecastChart: null,
  historicalData: [],
  model: null,
  initialized: false,
  activeRequestId: 0,
  currentCity: null,
  minBackendHistoryDays: 15,

  // Normalize city strings for tolerant matching (station names vs typed city names)
  normalizeCityName: (value) => (value || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim(),

  // Match city names even when one is a detailed station label
  cityMatches: (sourceCity, targetCity) => {
    const source = Prediction.normalizeCityName(sourceCity);
    const target = Prediction.normalizeCityName(targetCity);
    if (!source || !target) return false;
    return source === target || source.includes(target) || target.includes(source);
  },
  
  // STEP 1: Detect current theme and return appropriate chart colors
  getChartColors: () => {
    const isDarkMode = document.body.classList.contains('dark-mode');
    return {
      textPrimary: isDarkMode ? '#ffffff' : '#111111',
      textSecondary: isDarkMode ? '#e5e7eb' : '#4b5563',
      gridColor: isDarkMode ? 'rgba(229, 231, 235, 0.2)' : 'rgba(0, 0, 0, 0.15)'
    };
  },
  
  // STEP 3: Update chart colors when theme changes
  updateChartTheme: () => {
    if (!Prediction.forecastChart) return;
    
    const colors = Prediction.getChartColors();
    
    // Update legend colors
    Prediction.forecastChart.options.plugins.legend.labels.color = colors.textPrimary;
    
    // Update x-axis colors
    Prediction.forecastChart.options.scales.x.ticks.color = colors.textSecondary;
    Prediction.forecastChart.options.scales.x.grid.color = colors.gridColor;
    Prediction.forecastChart.options.scales.x.title.color = colors.textPrimary;
    
    // Update y-axis colors
    Prediction.forecastChart.options.scales.y.ticks.color = colors.textSecondary;
    Prediction.forecastChart.options.scales.y.grid.color = colors.gridColor;
    Prediction.forecastChart.options.scales.y.title.color = colors.textPrimary;
    
    // Update tooltip colors
    Prediction.forecastChart.options.plugins.tooltip.bodyColor = colors.textPrimary;
    Prediction.forecastChart.options.plugins.tooltip.titleColor = colors.textPrimary;
    
    // Apply changes with active mode to force redraw
    Prediction.forecastChart.update('active');
  },
  
  // Initialize prediction system
  init: () => {
    if (Prediction.initialized) return;
    Prediction.initialized = true;
    Prediction.setupForecastControls();
    Prediction.loadStoredHistory();

    // Auto-load forecast on startup when location is available
    const lastLocation = Utils.storage.get('lastLocation');
    const startupCity = (lastLocation?.stationCity || lastLocation?.city || '').toString().trim();
    if (startupCity && startupCity.toLowerCase() !== 'unknown') {
      Prediction.generateAndDisplayForecast('aqi', startupCity);
    }
  },

  // STEP 1: Collect and store historical AQI data
  collectHistoricalAQI: async (currentAQI, city) => {
    try {
      const today = Utils.formatDate(new Date());
      let history = Utils.storage.get('aqi_history') || [];
      
      // Parse if string
      if (typeof history === 'string') {
        history = JSON.parse(history);
      }
      
      // Find existing entry for this city and date
      const existingIndex = history.findIndex(
        h => h.date === today && Prediction.cityMatches(h.city, city)
      );
      
      if (existingIndex >= 0) {
        // Update existing entry for this city and date
        history[existingIndex] = { date: today, aqi: currentAQI, city: city };
      } else {
        // Add new entry
        history.push({ date: today, aqi: currentAQI, city: city });
      }
      
      // Keep only last 90 days to avoid localStorage bloat
      if (history.length > 90) {
        history = history.slice(-90);
      }
      
      Utils.storage.set('aqi_history', JSON.stringify(history));
      return history;
    } catch (error) {
      console.error('Error collecting historical AQI:', error);
      return [];
    }
  },

  // Load stored historical data from localStorage
  loadStoredHistory: () => {
    try {
      const stored = Utils.storage.get('aqi_history');
      if (stored) {
        Prediction.historicalData = typeof stored === 'string' 
          ? JSON.parse(stored) 
          : stored;
      }
    } catch (error) {
      console.error('Error loading stored history:', error);
      Prediction.historicalData = [];
    }
  },

  // Build historical dataset for training using WAQI/local history only
  fetchHistoricalForTraining: async (city) => {
    try {

      // Load fresh data from localStorage
      Prediction.loadStoredHistory();

      // Keep only entries for current city and sort by date
      const cityHistory = (Prediction.historicalData || [])
        .filter(item => item && item.city && Prediction.cityMatches(item.city, city))
        .sort((a, b) => new Date(a.date) - new Date(b.date));


      // Try backend MongoDB historical data first (authoritative source)
      let backendHistory = [];
      try {
        const response = await fetch(
          `http://localhost:5001/api/aqi/history/${encodeURIComponent(city)}?days=30`
        );
        if (response.ok) {
          const result = await response.json();
          backendHistory = Array.isArray(result?.data) ? result.data : [];
        }
      } catch (backendError) {
        console.warn('⚠️ Backend historical data unavailable, using local/fallback data.');
      }

      // Priority order for same date: backend > local
      const mergedRealHistory = Prediction.prepareHistoricalData([
        ...cityHistory,
        ...backendHistory
      ]);

      // If we have any real historical data, use it directly for chart/history display.
      // Do not backfill with synthetic values because that makes history appear unstable.
      if (mergedRealHistory.length > 0) {
        Prediction.historicalData = mergedRealHistory;
        return Prediction.historicalData;
      }

      // Only when there is absolutely no real history, generate synthetic fallback.
      console.warn('⚠️ No real history found, generating WAQI-based fallback history');
      const fallbackHistory = await API.generateSyntheticHistoricalData(city, 30);

      // Preserve any real backend/local data by date and only fill missing dates with synthetic values
      Prediction.historicalData = fallbackHistory.map(d => {
        const realData = mergedRealHistory.find(h => h.date === d.date);
        if (realData) {
          return {
            date: realData.date,
            aqi: realData.aqi,
            city: city
          };
        }
        
        return {
          date: d.date,
          aqi: d.aqi,
          city: city
        };
      });

      return Prediction.historicalData;
    } catch (error) {
      console.error('❌ Error preparing training data:', error);
      Prediction.loadStoredHistory();
      Prediction.historicalData = (Prediction.historicalData || [])
        .filter(item => item && item.city && Prediction.cityMatches(item.city, city));
      Prediction.historicalData = Prediction.prepareHistoricalData(Prediction.historicalData);
      return Prediction.historicalData;
    }
  },

  // Fetch predictions trained on backend database; returns null when unavailable
  fetchBackendPredictions: async (city, days = 30) => {
    try {
      const response = await fetch(
        `http://localhost:5001/api/prediction/${encodeURIComponent(city)}?days=${days}`
      );

      if (!response.ok) return null;

      const result = await response.json();
      if (!result.success || !Array.isArray(result.predictions)) return null;

      return result;
    } catch (error) {
      console.warn('Backend prediction unavailable, using frontend model fallback.');
      return null;
    }
  },

  // Format Date object into local YYYY-MM-DD (timezone-safe for date-only values)
  toLocalISODate: (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Parse multiple date formats used across the app (ISO or display labels like "Mar 6")
  parseAQIDate: (value) => {
    if (!value) return null;

    if (value instanceof Date) {
      const clone = new Date(value);
      clone.setHours(0, 0, 0, 0);
      return Number.isNaN(clone.getTime()) ? null : clone;
    }

    if (typeof value === 'string') {
      // ISO-like dates from backend
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        // Parse as local calendar date instead of UTC to avoid day-shift duplicates.
        const [y, m, d] = value.split('T')[0].split('-').map(Number);
        const localDate = new Date(y, (m || 1) - 1, d || 1);
        localDate.setHours(0, 0, 0, 0);
        return Number.isNaN(localDate.getTime()) ? null : localDate;
      }

      // Display dates like "Mar 6" -> assume current year
      const withYear = new Date(`${value}, ${new Date().getFullYear()}`);
      if (!Number.isNaN(withYear.getTime())) {
        withYear.setHours(0, 0, 0, 0);
        return withYear;
      }
    }

    return null;
  },

  // Normalize historical data to valid past/today values only, sorted and deduplicated
  prepareHistoricalData: (rawData = []) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const byDate = new Map();

    (rawData || []).forEach((item) => {
      const parsedDate = Prediction.parseAQIDate(item?.date);
      const aqi = Number(item?.aqi);

      if (!parsedDate || Number.isNaN(aqi) || aqi < 0) return;
      if (parsedDate > today) return; // Exclude future dates from historical dataset

      const key = Prediction.toLocalISODate(parsedDate);
      byDate.set(key, {
        ...item,
        dateObj: parsedDate,
        date: key,
        aqi: Math.round(aqi)
      });
    });

    return Array.from(byDate.values())
      .sort((a, b) => a.dateObj - b.dateObj)
      .slice(-30);
  },

  // Build next N prediction dates from the last historical date
  buildPredictionDates: (lastHistoricalDate, days = 30) => {
    const dates = [];
    for (let i = 1; i <= days; i++) {
      const futureDate = new Date(lastHistoricalDate);
      futureDate.setDate(futureDate.getDate() + i);
      dates.push(futureDate);
    }
    return dates;
  },

  // Consistent readable chart date format (MMM DD)
  formatChartDate: (dateObj) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit'
    }).format(dateObj);
  },

  // STEP 2: Train Linear Regression Model
  // Formula: slope = (n*Σxy - Σx*Σy) / (n*Σx² - (Σx)²)
  //          intercept = (Σy - slope*Σx) / n
  trainLinearRegressionModel: (data) => {
    if (data.length < 2) {
      console.warn('Insufficient data for linear regression, returning fallback model');
      return { slope: 0, intercept: 50, r2: 0 };
    }

    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    // Calculate sums
    data.forEach((point, index) => {
      const x = index;
      const y = point.aqi || point;
      
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    // Calculate slope and intercept
    const denominator = (n * sumX2) - (sumX * sumX);
    const slope = denominator !== 0 
      ? ((n * sumXY) - (sumX * sumY)) / denominator
      : 0;
    
    const intercept = (sumY - (slope * sumX)) / n;

    // Calculate R² for model quality
    const yMean = sumY / n;
    let ssTotal = 0, ssRes = 0;
    
    data.forEach((point, index) => {
      const y = point.aqi || point;
      const yPred = slope * index + intercept;
      ssTotal += (y - yMean) ** 2;
      ssRes += (y - yPred) ** 2;
    });
    
    const r2 = ssTotal !== 0 ? 1 - (ssRes / ssTotal) : 0;

    return {
      slope: slope,
      intercept: Math.max(0, intercept), // Prevent negative baseline
      r2: r2,
      dataPoints: data.length
    };
  },

  // STEP 3: Predict future AQI values using trained model
  predictFutureAQI: (days = 30, baseDate = new Date()) => {
    try {
      // Get historical data - preferring stored data, fallback to API
      let trainingData = Prediction.historicalData;
      
      // If insufficient data, fetch from API
      if (trainingData.length < 7) {
        // Note: This would need to be made async in actual implementation
        // For now, we'll use what we have
      }
      
      if (trainingData.length === 0) {
        console.warn('No historical data available for prediction');
        return Prediction.generateFallbackPrediction(days);
      }

      // Train the model
      const aqiValues = trainingData.map(d => d.aqi || 0);
      Prediction.model = Prediction.trainLinearRegressionModel(aqiValues);

      const predictions = [];
      const startDay = trainingData.length;
      const lastKnownAQI = trainingData[trainingData.length - 1].aqi || 100;

      // Generate realistic 30-day forecast values
      for (let i = 1; i <= days; i++) {
        const dayNumber = startDay + i;
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);

        // 1) Regression trend
        const regression = Prediction.model.slope * dayNumber + Prediction.model.intercept;

        // 2) Random variation (+/- 10)
        const variation = (Math.random() - 0.5) * 20;
        const withNoise = regression + variation;

        // 3) Moving-average style smoothing using last known AQI
        let aqi = (0.7 * withNoise) + (0.3 * lastKnownAQI);

        // 4) Clamp to realistic AQI range
        aqi = Math.max(50, Math.min(350, Math.round(aqi)));

        // Derive pollutant estimates from AQI
        const pm25 = Math.max(0, aqi * 0.8 + (Math.random() - 0.5) * 10);
        const pm10 = Math.max(0, aqi * 0.6 + (Math.random() - 0.5) * 8);

        predictions.push({
          day: i,
          date: Prediction.toLocalISODate(date),
          aqi: aqi,
          pm25: Math.round(pm25),
          pm10: Math.round(pm10),
          isDangerous: aqi > 150,
          category: Prediction.getAQICategory(aqi)
        });
      }

      return predictions;
    } catch (error) {
      console.error('Error predicting future AQI:', error);
      return Prediction.generateFallbackPrediction(days);
    }
  },

  // Fallback prediction if insufficient historical data
  generateFallbackPrediction: (days = 30, baseDate = new Date()) => {
    const predictions = [];
    const baseAQI = 65;

    for (let i = 1; i <= days; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);

      const dayOfWeek = date.getDay();
      let adjustment = 0;
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        adjustment = -5;
      } else if (dayOfWeek === 1) {
        adjustment = 8;
      }

      const variationSeed = `${Prediction.currentCity || 'Unknown'}-${date.toISOString().split('T')[0]}-${i}-fallback`;
      const randomVariation = Prediction.getDeterministicVariation(variationSeed, 15);
      const aqi = Math.max(0, Math.round(baseAQI + adjustment + randomVariation));

      predictions.push({
        day: i,
        date: Prediction.toLocalISODate(date),
        aqi: aqi,
        pm25: Math.round(aqi * 0.8),
        pm10: Math.round(aqi * 0.6),
        isDangerous: aqi > 150,
        category: Prediction.getAQICategory(aqi)
      });
    }

    return predictions;
  },

  // Get AQI category based on value
  getAQICategory: (aqi) => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  },

  // Deterministic pseudo-random variation for stable forecast lines
  getDeterministicVariation: (seed, amplitude = 10) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    }
    const normalized = (Math.abs(hash) % 1000) / 1000; // 0..1
    return (normalized - 0.5) * amplitude;
  },

  // STEP 4: Format forecast data for display
  generateForecastData: (predictions = null) => {
    if (!predictions) {
      predictions = Prediction.predictFutureAQI(30);
    }

    return predictions.map((pred, index) => ({
      day: `Day ${pred.day}`,
      date: pred.date,
      aqi: pred.aqi,
      pm25: pred.pm25,
      pm10: pred.pm10,
      category: pred.category,
      isDangerous: pred.isDangerous
    }));
  },

  // Setup forecast control buttons
  setupForecastControls: () => {
    const buttons = document.querySelectorAll('.forecast-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        buttons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const type = e.target.dataset.type;
        Prediction.generateAndDisplayForecast(type);
      });
    });
  },

  // Identify dangerous days (high AQI prediction > 150)
  getDangerousDays: (predictions) => {
    const dangerous = predictions.filter(p => p.aqi > 150).slice(0, 5); // Show top 5
    
    if (dangerous.length === 0) {
      return '<div class="no-danger-message"><i class="fas fa-check-circle"></i> No high pollution days predicted</div>';
    }

    const dayColors = {
      'Unhealthy for Sensitive Groups': '#f97316',
      'Unhealthy': '#ef4444',
      'Very Unhealthy': '#a855f7',
      'Hazardous': '#7c2d12'
    };

    return dangerous.map(d => {
      const date = Prediction.parseAQIDate(d.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue, etc.
      const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // Mar 7
      const color = dayColors[d.category] || '#ef4444';
      
      return `
        <div class="danger-day-card" style="border-left-color: ${color}">
          <div class="danger-day-name">${dayName}</div>
          <div class="danger-day-date">${monthDay}</div>
          <div class="danger-day-aqi" style="color: ${color}">${d.aqi}</div>
          <div class="danger-day-category">${d.category}</div>
        </div>
      `;
    }).join('');
  },

  // Create combined historical + forecast chart
  createForecastChart: (historicalData, predictions, type = 'aqi') => {
    const ctx = document.getElementById('forecastChart');
    if (!ctx) return;

    if (Prediction.forecastChart) {
      Prediction.forecastChart.destroy();
    }

    // STEP 2: Get theme-aware colors
    const colors = Prediction.getChartColors();

    // Prepare historical labels and data
    const historicalLabels = historicalData.map(d => Prediction.formatChartDate(d.dateObj || Prediction.parseAQIDate(d.date) || new Date()));
    const historicalValues = historicalData.map(d => d.aqi || 0);

    // Prepare prediction labels and data
    const predictionLabels = predictions.map(p => Prediction.formatChartDate(Prediction.parseAQIDate(p.date) || new Date()));
    const predictionValues = predictions.map(p => p[type] || p.aqi);

    // Final x-axis label sequence: past -> future
    const allLabels = [...historicalLabels, ...predictionLabels];

    // Non-overlapping datasets using null placeholders
    const historicalSeries = [
      ...historicalValues,
      ...Array(predictionValues.length).fill(null)
    ];

    const predictionSeries = [
      ...Array(historicalValues.length).fill(null),
      ...predictionValues
    ];

    Prediction.forecastChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: allLabels,
        datasets: [
          {
            label: 'Historical AQI',
            data: historicalSeries,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: '#3b82f6',
            pointBorderColor: 'white',
            pointBorderWidth: 1
          },
          {
            label: '30-Day Forecast',
            data: predictionSeries,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            borderDash: [6, 6],
            spanGaps: true,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: '#ef4444',
            pointBorderColor: 'white',
            pointBorderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index'
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: { size: 13, weight: '600' },
              color: colors.textPrimary
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleColor: colors.textPrimary,
            bodyColor: colors.textPrimary,
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                if (context.parsed.y !== null) {
                  const value = Math.round(context.parsed.y);
                  const isForecast = (context.dataset.label || '').toLowerCase().includes('forecast');
                  return isForecast ? `Predicted AQI: ${value}` : `Historical AQI: ${value}`;
                }
                return '';
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: Math.max(
              300,
              ...historicalValues,
              ...predictionValues.filter(v => v !== null && v !== undefined)
            ) + 20,
            ticks: {
              callback: function(value) {
                return value;
              },
              color: colors.textSecondary,
              font: { size: 12, weight: '500' }
            },
            grid: {
              color: colors.gridColor
            },
            title: {
              display: true,
              text: 'AQI Value',
              color: colors.textPrimary,
              font: { size: 13, weight: '600' }
            }
          },
          x: {
            grid: {
              color: colors.gridColor
            },
            ticks: {
              color: colors.textSecondary,
              font: { size: 12, weight: '500' },
              autoSkip: true,
              maxTicksLimit: 12,
              maxRotation: 35,
              minRotation: 20,
              callback: function(value, index) {
                const label = this.getLabelForValue(value);

                // Reduce visual clutter while keeping periodic date ticks.
                const step = Math.max(1, Math.floor(allLabels.length / 10));
                return index % step === 0 ? label : '';
              }
            },
            title: {
              display: true,
              text: 'Date',
              color: colors.textPrimary,
              font: { size: 13, weight: '600' }
            }
          }
        }
      }
    });
  },

  // Generate and display forecast
  generateAndDisplayForecast: async (type = 'aqi', cityOverride = null) => {
    try {
      // Show loading state
      Utils.toggleLoading(true);

      // Track request order to avoid stale city data rendering
      const requestId = ++Prediction.activeRequestId;

      // Get current city from last location
      const lastLocation = Utils.storage.get('lastLocation');
      let city = cityOverride || lastLocation?.stationCity || lastLocation?.city || 'Unknown';

      if (!city || city.toLowerCase() === 'unknown' || city.toLowerCase() === 'unknown location') {
        try {
          const coords = await Utils.getDeviceCoordinates({ timeout: 10000, maximumAge: 0 });
          const aqiData = await API.getAQIByCoordinates(coords.latitude, coords.longitude);
          const locationName = await Utils.getLocationName(coords.latitude, coords.longitude);

          city = locationName || aqiData.stationCity || aqiData.city || 'Unknown';
          if (city && city.toLowerCase() !== 'unknown' && city.toLowerCase() !== 'unknown location') {
            Utils.storage.set('lastLocation', {
              city,
              stationCity: aqiData.stationCity || aqiData.city || city,
              aqi: aqiData.aqi,
              latitude: coords.latitude,
              longitude: coords.longitude,
              pollutants: aqiData.pollutants || {},
              timestamp: new Date().toISOString()
            });
          }
        } catch (locationError) {
          console.warn('Skipping forecast generation: valid city is not available yet.', locationError);
          Utils.toggleLoading(false);
          return;
        }
      }

      Prediction.currentCity = city;


      // STEP 1: Prepare historical data for this city
      await Prediction.fetchHistoricalForTraining(city);

      // Abort if a newer request started (e.g., rapid city changes)
      if (requestId !== Prediction.activeRequestId) {
        Utils.toggleLoading(false);
        return;
      }

      // Normalize to real historical range only (past/today), excluding future dates
      const historicalData = Prediction.prepareHistoricalData(Prediction.historicalData);
      Prediction.historicalData = historicalData;

      
      // Log today's AQI for debugging
      const today = Utils.formatDate(new Date());
      const todayData = historicalData.find(h => h.date === today);
      if (todayData) {
      }

      if (historicalData.length === 0) {
        throw new Error('No valid historical data up to today available for forecasting.');
      }

      const lastHistoricalDate = historicalData[historicalData.length - 1].dateObj;
      const predictionDates = Prediction.buildPredictionDates(lastHistoricalDate, 30);

      // STEP 2: Prefer backend DB-trained predictions; fallback to frontend model
      let predictions = [];
      const shouldUseBackendModel = historicalData.length >= Prediction.minBackendHistoryDays;
      const backendResult = shouldUseBackendModel
        ? await Prediction.fetchBackendPredictions(city, 30)
        : null;

      if (backendResult) {
        // Backend currently returns AQI series only; derive PM values for existing UI toggle support.
        predictions = backendResult.predictions.map((p, index) => {
          const aqi = p.aqi || 0;
          const predictionDate = predictionDates[index] || predictionDates[predictionDates.length - 1];
          return {
            day: index + 1,
            date: Prediction.toLocalISODate(predictionDate),
            aqi,
            pm25: Math.round(aqi * 0.8),
            pm10: Math.round(aqi * 0.6),
            isDangerous: aqi > 150,
            category: Prediction.getAQICategory(aqi)
          };
        });

        Prediction.model = {
          ...Prediction.model,
          r2: backendResult.model?.r2 ?? null,
          dataPoints: backendResult.model?.historicalDataPoints ?? Prediction.historicalData.length,
          source: 'database'
        };
      } else {
        predictions = Prediction.predictFutureAQI(30, lastHistoricalDate);
      }

      // STEP 4: Create chart with both historical and predictions
      Prediction.createForecastChart(historicalData, predictions, type);

      // STEP 5: Update dangerous days warning
      const warningText = Prediction.getDangerousDays(predictions);
      const warningElement = document.getElementById('warningDays');
      if (warningElement) {
        warningElement.innerHTML = warningText;
      }

      // STEP 6: Show model quality (R² value)
      const qualityElement = document.getElementById('modelQuality');
      if (qualityElement) {
        if (Prediction.model && Prediction.model.r2 !== null && Prediction.model.r2 !== undefined) {
          const quality = (Prediction.model.r2 * 100).toFixed(1);
          let qualityText = `Model Confidence: ${quality}% (${Prediction.model.dataPoints || Prediction.historicalData.length} days)`;

          if (Prediction.model.source === 'database') {
            qualityText += ' - DB trained';
          }

          if ((Prediction.model.dataPoints || 0) >= 25 && Prediction.model.r2 >= 0.7) {
            qualityText += ' - Excellent accuracy';
          } else if ((Prediction.model.dataPoints || 0) >= 15 && Prediction.model.r2 >= 0.5) {
            qualityText += ' - Good accuracy';
          } else {
            qualityText += ' - Building accuracy';
          }

          qualityElement.textContent = qualityText;
        } else {
          qualityElement.textContent = 'Model running with available history';
        }
      }

      Utils.toggleLoading(false);
    } catch (error) {
      console.error('❌ Error generating forecast:', error);
      Utils.toggleLoading(false);
      Utils.showNotification('Error generating forecast. Check console for details.', 'error');
    }
  }
};

// Initialize prediction system when DOM is ready
document.addEventListener('DOMContentLoaded', Prediction.init);
