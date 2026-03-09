// Global Pollution Ranking Module

const GlobalRanking = {
  rankings: [],
  lastUserCity: null,
  lastUserAQI: null,

  // Initialize global ranking
  init: async () => {
    await GlobalRanking.fetchGlobalRankings();
  },

  // Fetch top polluted cities from WAQI API
  fetchGlobalRankings: async () => {
    try {
      const majorCities = [
        { name: 'Delhi', country: 'India', coords: [28.6139, 77.2090] },
        { name: 'Beijing', country: 'China', coords: [39.9042, 116.4074] },
        { name: 'Lahore', country: 'Pakistan', coords: [31.5497, 74.3436] },
        { name: 'Dhaka', country: 'Bangladesh', coords: [23.8103, 90.4125] },
        { name: 'Mumbai', country: 'India', coords: [19.0760, 72.8777] },
        { name: 'Cairo', country: 'Egypt', coords: [30.0444, 31.2357] },
        { name: 'Jakarta', country: 'Indonesia', coords: [-6.2088, 106.8456] },
        { name: 'Bangkok', country: 'Thailand', coords: [13.7563, 100.5018] },
        { name: 'Mexico City', country: 'Mexico', coords: [19.4326, -99.1332] },
        { name: 'Los Angeles', country: 'USA', coords: [34.0522, -118.2437] },
        { name: 'New York', country: 'USA', coords: [40.7128, -74.0060] },
        { name: 'London', country: 'UK', coords: [51.5074, -0.1278] },
        { name: 'Paris', country: 'France', coords: [48.8566, 2.3522] },
        { name: 'Tokyo', country: 'Japan', coords: [35.6762, 139.6503] },
        { name: 'Seoul', country: 'South Korea', coords: [37.5665, 126.9780] }
      ];

      const token = 'e52b20dc479791e02b4673f662efb54a4c72d08e';
      const promises = majorCities.map(async (city) => {
        try {
          const response = await fetch(
            `https://api.waqi.info/feed/geo:${city.coords[0]};${city.coords[1]}/?token=${token}`
          );
          const data = await response.json();
          
          if (data.status === 'ok' && data.data) {
            return {
              city: city.name,
              country: city.country,
              aqi: data.data.aqi || 0,
              dominantPollutant: data.data.dominentpol || 'Unknown',
              coords: city.coords
            };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching data for ${city.name}:`, error);
          return null;
        }
      });

      const results = await Promise.all(promises);
      GlobalRanking.rankings = results
        .filter(r => r !== null && r.aqi > 0)
        .sort((a, b) => b.aqi - a.aqi); // Sort by AQI descending

      GlobalRanking.displayRankings();

      // Re-render comparison once rankings are ready.
      if (GlobalRanking.lastUserCity) {
        GlobalRanking.displayUserComparison(GlobalRanking.lastUserCity, GlobalRanking.lastUserAQI);
      }
    } catch (error) {
      console.error('Error fetching global rankings:', error);
      GlobalRanking.displayFallbackRankings();
    }
  },

  // Normalize user-provided location labels (e.g., "Town Hall, Munger, India" -> "town hall").
  normalizeCityName: (city) => {
    if (!city) return '';
    return String(city)
      .split(',')[0]
      .trim()
      .toLowerCase();
  },

  // Display global pollution rankings
  displayRankings: () => {
    const container = document.getElementById('globalRanking');
    if (!container) return;

    const topCities = GlobalRanking.rankings.slice(0, 15); // Top 15

    if (topCities.length === 0) {
      GlobalRanking.displayFallbackRankings();
      return;
    }

    container.innerHTML = `
      <div class="ranking-header">
        <h2><i class="fas fa-globe-americas"></i> Most Polluted Cities Today</h2>
        <p class="update-time">Updated: ${new Date().toLocaleTimeString()}</p>
      </div>
      <div class="ranking-list">
        ${topCities.map((city, index) => {
          const category = Utils.getAQICategory(city.aqi);
          const medal = index < 3 ? GlobalRanking.getMedalIcon(index) : '';
          
          return `
            <div class="ranking-item ${category.class}" data-rank="${index + 1}">
              <div class="rank-number">
                ${medal || `<span class="rank">#${index + 1}</span>`}
              </div>
              <div class="city-info">
                <h3>${city.city}</h3>
                <span class="country">${city.country}</span>
              </div>
              <div class="aqi-badge ${category.class}">
                <span class="aqi-value">${city.aqi}</span>
                <span class="aqi-label">AQI</span>
              </div>
              <div class="pollutant-tag">
                <i class="fas fa-smog"></i>
                ${city.dominantPollutant}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="ranking-footer">
        <button class="refresh-btn" onclick="GlobalRanking.fetchGlobalRankings()">
          <i class="fas fa-sync-alt"></i> Refresh Data
        </button>
      </div>
    `;
  },

  // Get medal icon for top 3
  getMedalIcon: (index) => {
    const medals = [
      '<i class="fas fa-trophy" style="color: #fbbf24;"></i>', // Gold
      '<i class="fas fa-medal" style="color: #9ca3af;"></i>',   // Silver
      '<i class="fas fa-medal" style="color: #cd7f32;"></i>'    // Bronze
    ];
    return medals[index] || '';
  },

  // Display fallback rankings with demo data
  displayFallbackRankings: () => {
    const container = document.getElementById('globalRanking');
    if (!container) return;

    const demoData = [
      { city: 'Delhi', country: 'India', aqi: 298, dominantPollutant: 'PM2.5' },
      { city: 'Lahore', country: 'Pakistan', aqi: 260, dominantPollutant: 'PM2.5' },
      { city: 'Dhaka', country: 'Bangladesh', aqi: 245, dominantPollutant: 'PM2.5' },
      { city: 'Beijing', country: 'China', aqi: 210, dominantPollutant: 'PM2.5' },
      { city: 'Mumbai', country: 'India', aqi: 185, dominantPollutant: 'PM10' },
      { city: 'Cairo', country: 'Egypt', aqi: 175, dominantPollutant: 'PM10' },
      { city: 'Jakarta', country: 'Indonesia', aqi: 168, dominantPollutant: 'PM2.5' },
      { city: 'Bangkok', country: 'Thailand', aqi: 142, dominantPollutant: 'PM2.5' },
      { city: 'Mexico City', country: 'Mexico', aqi: 125, dominantPollutant: 'O3' },
      { city: 'Los Angeles', country: 'USA', aqi: 98, dominantPollutant: 'O3' }
    ];

    container.innerHTML = `
      <div class="ranking-header">
        <h2><i class="fas fa-globe-americas"></i> Most Polluted Cities (Demo Data)</h2>
        <p class="update-time">Typical pollution patterns</p>
      </div>
      <div class="ranking-list">
        ${demoData.map((city, index) => {
          const category = Utils.getAQICategory(city.aqi);
          const medal = index < 3 ? GlobalRanking.getMedalIcon(index) : '';
          
          return `
            <div class="ranking-item ${category.class}" data-rank="${index + 1}">
              <div class="rank-number">
                ${medal || `<span class="rank">#${index + 1}</span>`}
              </div>
              <div class="city-info">
                <h3>${city.city}</h3>
                <span class="country">${city.country}</span>
              </div>
              <div class="aqi-badge ${category.class}">
                <span class="aqi-value">${city.aqi}</span>
                <span class="aqi-label">AQI</span>
              </div>
              <div class="pollutant-tag">
                <i class="fas fa-smog"></i>
                ${city.dominantPollutant}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="ranking-footer">
        <p><i class="fas fa-info-circle"></i> Using demonstration data. Refresh with real API data coming soon.</p>
      </div>
    `;
  },

  // Get user's city rank
  getUserCityRank: (userCity, userAQI) => {
    const normalizedUserCity = GlobalRanking.normalizeCityName(userCity);

    // First try direct city matching against tracked ranking cities.
    const index = GlobalRanking.rankings.findIndex((r) => {
      const tracked = GlobalRanking.normalizeCityName(r.city);
      return tracked === normalizedUserCity || tracked.includes(normalizedUserCity) || normalizedUserCity.includes(tracked);
    });

    if (index !== -1) {
      return {
        rank: index + 1,
        total: GlobalRanking.rankings.length,
        cleanerThan: index,  // Cities before you in descending sort are more polluted
        worseThan: GlobalRanking.rankings.length - index - 1,  // Cities after you are less polluted
        estimated: false
      };
    }

    // If the exact city is not in the monitored list, estimate by closest AQI.
    if (!Number.isFinite(userAQI) || GlobalRanking.rankings.length === 0) {
      return null;
    }

    let closestIndex = 0;
    let smallestDelta = Infinity;

    GlobalRanking.rankings.forEach((r, i) => {
      const delta = Math.abs(r.aqi - userAQI);
      if (delta < smallestDelta) {
        smallestDelta = delta;
        closestIndex = i;
      }
    });

    return {
      rank: closestIndex + 1,
      total: GlobalRanking.rankings.length,
      cleanerThan: closestIndex,  // Cities before you in descending sort are more polluted
      worseThan: GlobalRanking.rankings.length - closestIndex - 1,  // Cities after you are less polluted
      estimated: true,
      referenceCity: GlobalRanking.rankings[closestIndex]?.city || ''
    };
  },

  // Display user's city comparison
  displayUserComparison: (userCity, userAQI) => {
    GlobalRanking.lastUserCity = userCity;
    GlobalRanking.lastUserAQI = userAQI;

    const container = document.getElementById('cityComparison');
    if (!container) return;

    if (!GlobalRanking.rankings.length) {
      // Rankings not loaded yet; avoid rendering empty/incorrect card.
      container.innerHTML = '';
      return;
    }

    const rank = GlobalRanking.getUserCityRank(userCity, userAQI);
    if (!rank) {
      container.innerHTML = `
        <div class="comparison-card">
          <h3>Your City: ${userCity}</h3>
          <div class="alert-message caution">
            <i class="fas fa-info-circle"></i>
            City comparison is unavailable right now for this location.
          </div>
        </div>
      `;
      return;
    }

    const percentile = ((rank.cleanerThan / rank.total) * 100).toFixed(0);

    container.innerHTML = `
      <div class="comparison-card">
        <h3>Your City: ${userCity}</h3>
        <div class="rank-info">
          <div class="rank-stat">
            <span class="label">Global Rank</span>
            <span class="value">#${rank.rank}</span>
            <span class="sublabel">out of ${rank.total} cities</span>
          </div>
          <div class="rank-stat">
            <span class="label">Air Quality Comparison</span>
            <span class="value">${percentile}%</span>
            <span class="sublabel">Cleaner than ${rank.cleanerThan} of ${rank.total} cities</span>
          </div>
        </div>
        ${rank.estimated ? `
          <div class="alert-message caution">
            <i class="fas fa-info-circle"></i>
            Estimated rank by AQI match (closest tracked city: ${rank.referenceCity}).
          </div>
        ` : ''}
        ${rank.rank <= 10 ? `
          <div class="alert-message warning">
            <i class="fas fa-exclamation-triangle"></i>
            Your city ranks in the top 10 most polluted globally!
          </div>
        ` : rank.rank <= 30 ? `
          <div class="alert-message caution">
            <i class="fas fa-info-circle"></i>
            Your city has significantly higher pollution than average.
          </div>
        ` : `
          <div class="alert-message success">
            <i class="fas fa-check-circle"></i>
            Your city has relatively better air quality compared to most polluted cities.
          </div>
        `}
      </div>
    `;
  }
};
