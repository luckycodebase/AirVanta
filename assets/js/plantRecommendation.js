// Plant Recommendation System - Optimized

const PlantRecommendation = {
  plants: [],
  currentAQI: null,
  currentPollutants: null,
  cachedRecommendations: new Map(),
  filterCache: new Map(),

  // Load plants data with caching
  loadPlants: async () => {
    try {
      // Check localStorage cache first
      const cached = localStorage.getItem('plantsData');
      const cacheTime = localStorage.getItem('plantsDataTime');
      const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
      
      if (cached && cacheTime && (Date.now() - parseInt(cacheTime)) < cacheExpiry) {
        PlantRecommendation.plants = JSON.parse(cached);
        return;
      }

      // Fetch fresh data
      const response = await fetch('./assets/data/plants.json');
      PlantRecommendation.plants = await response.json();
      
      // Cache the data
      localStorage.setItem('plantsData', JSON.stringify(PlantRecommendation.plants));
      localStorage.setItem('plantsDataTime', Date.now().toString());
    } catch (error) {
      console.error('Error loading plants data:', error);
      PlantRecommendation.plants = [];
    }
  },

  // Optimized scoring algorithm for plant recommendations
  calculatePlantScore: (plant, aqi, pollutants) => {
    let score = plant.efficiency; // Base score from efficiency
    
    // AQI-based scoring boost
    if (aqi > 150 && plant.efficiency >= 80) {
      score += 20; // High priority for efficient plants in bad air
    } else if (aqi > 100 && plant.efficiency >= 75) {
      score += 15;
    } else if (aqi <= 50 && plant.difficulty === 'Easy') {
      score += 10; // Prefer easy-care plants for good AQI
    }
    
    // Pollutant matching bonus
    if (Object.keys(pollutants).length > 0) {
      const dominantPollutant = Utils.getDominantPollutant(pollutants);
      if (dominantPollutant) {
        const pollutantName = dominantPollutant.pollutant;
        
        // Direct pollutant match
        if (plant.pollutantsReduced.includes(pollutantName)) {
          score += 30;
        }
        
        // PM2.5/PM10 matching
        if ((pollutantName === 'PM2.5' || pollutantName === 'PM10') && 
            (plant.pollutantsReduced.includes('PM2.5') || plant.pollutantsReduced.includes('PM10'))) {
          score += 25;
        }
        
        // Common pollutants (Formaldehyde, Benzene)
        const commonPollutants = ['Formaldehyde', 'Benzene', 'CO'];
        const matchCount = plant.pollutantsReduced.filter(p => 
          commonPollutants.includes(p)
        ).length;
        score += matchCount * 5;
      }
    }
    
    // Pet safety bonus
    if (plant.sideEffects.toLowerCase().includes('non-toxic') || 
        plant.sideEffects.toLowerCase().includes('safe for pets')) {
      score += 5;
    }
    
    // Easy care bonus
    if (plant.difficulty === 'Easy') {
      score += 8;
    }
    
    return score;
  },

  // Optimized recommend plants with caching
  recommendPlants: (aqi, pollutants = {}) => {
    PlantRecommendation.currentAQI = aqi;
    PlantRecommendation.currentPollutants = pollutants;

    // Create cache key
    const cacheKey = `${aqi}_${JSON.stringify(pollutants)}`;
    if (PlantRecommendation.cachedRecommendations.has(cacheKey)) {
      return PlantRecommendation.cachedRecommendations.get(cacheKey);
    }

    // Calculate scores for all plants
    const scoredPlants = PlantRecommendation.plants.map(plant => ({
      ...plant,
      score: PlantRecommendation.calculatePlantScore(plant, aqi, pollutants)
    }));

    // Sort by score and filter based on AQI thresholds
    let recommendedPlants = scoredPlants.sort((a, b) => b.score - a.score);
    
    // Apply minimum efficiency thresholds
    if (aqi > 150) {
      recommendedPlants = recommendedPlants.filter(p => p.efficiency >= 75);
    } else if (aqi > 100) {
      recommendedPlants = recommendedPlants.filter(p => p.efficiency >= 70);
    }

    const result = recommendedPlants.slice(0, 15); // Top 15 recommendations
    
    // Cache the result
    PlantRecommendation.cachedRecommendations.set(cacheKey, result);
    
    return result;
  },

  // Get category for filtering
  getCategoryForAQI: (aqi) => {
    if (aqi <= 50) return 'good';
    if (aqi <= 100) return 'moderate';
    return 'unhealthy';
  },

  // Optimized render with fragment and caching
  renderPlants: (plants, filter = 'all') => {
    const container = document.getElementById('plantRecommendations');
    if (!container) return;

    // Check filter cache
    const filterKey = `${filter}_${plants.length}`;
    let filteredPlants = plants;
    
    if (filter !== 'all') {
      if (PlantRecommendation.filterCache.has(filterKey)) {
        filteredPlants = PlantRecommendation.filterCache.get(filterKey);
      } else {
        if (filter === 'good') {
          filteredPlants = plants.filter(p => p.efficiency >= 75);
        } else if (filter === 'moderate') {
          filteredPlants = plants.filter(p => p.efficiency >= 70 && p.efficiency < 75);
        } else if (filter === 'unhealthy') {
          filteredPlants = plants.filter(p => p.efficiency < 70);
        }
        PlantRecommendation.filterCache.set(filterKey, filteredPlants);
      }
    }

    if (filteredPlants.length === 0) {
      container.innerHTML = '<p style="text-align: center; padding: 40px 20px; color: #64748b;">No plants match this filter</p>';
      return;
    }

    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    filteredPlants.forEach(plant => {
      const plantCard = document.createElement('div');
      plantCard.className = 'plant-card fade-in';
      
      // Add score badge if available
      const scoreDisplay = plant.score ? 
        `<div class="plant-score-badge">Match: ${Math.round(plant.score)}%</div>` : '';
      
      plantCard.innerHTML = `
        ${scoreDisplay}
        <div class="plant-image">
          ${plant.emoji}
        </div>
        <div class="plant-content">
          <h3 class="plant-name">${plant.name}</h3>
          
          <div class="plant-efficiency">
            Efficiency: ${plant.efficiency}%
          </div>
          
          <div class="plant-info">
            <div class="plant-info-title">🌿 Pollutants Reduced:</div>
            <div class="plant-info-text">${plant.pollutantsReduced.join(', ')}</div>
          </div>
          
          <div class="plant-info">
            <div class="plant-info-title">⚠️ Side Effects:</div>
            <div class="plant-info-text">${plant.sideEffects}</div>
          </div>
          
          <div class="plant-info">
            <div class="plant-info-title">📍 Best For:</div>
            <div class="plant-info-text">${plant.bestFor}</div>
          </div>
          
          <div class="plant-info">
            <div class="plant-info-title">💧 Watering:</div>
            <div class="plant-info-text">${plant.wateringFrequency}</div>
          </div>
          
          <div class="plant-info">
            <div class="plant-info-title">🌱 Difficulty:</div>
            <div class="plant-info-text difficulty-${plant.difficulty.toLowerCase()}">${plant.difficulty}</div>
          </div>
        </div>
      `;
      fragment.appendChild(plantCard);
    });
    
    // Single DOM update
    container.innerHTML = '';
    container.appendChild(fragment);
  },

  // Update recommendations
  updateRecommendations: (data) => {
    const pollutants = {
      'PM2.5': data.pollutants?.pm25,
      'PM10': data.pollutants?.pm10,
      'O₃': data.pollutants?.o3,
      'NO₂': data.pollutants?.no2,
      'CO': data.pollutants?.co,
      'SO₂': data.pollutants?.so2
    };

    const recommended = PlantRecommendation.recommendPlants(data.aqi, pollutants);
    PlantRecommendation.renderPlants(recommended, 'all');
  },

  // Setup filter buttons with optimized event handling
  setupFilters: () => {
    const filterBtns = document.querySelectorAll('.plant-filter-btn');
    let currentRecommendations = [];
    
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const filter = e.target.dataset.filter;
        
        // Only recalculate if needed
        if (!PlantRecommendation.currentAQI) {
          currentRecommendations = PlantRecommendation.plants;
        } else {
          currentRecommendations = PlantRecommendation.recommendPlants(
            PlantRecommendation.currentAQI,
            PlantRecommendation.currentPollutants || {}
          );
        }
        
        PlantRecommendation.renderPlants(currentRecommendations, filter);
      });
    });
  },

  // Clear cache (useful for updates)
  clearCache: () => {
    PlantRecommendation.cachedRecommendations.clear();
    PlantRecommendation.filterCache.clear();
    localStorage.removeItem('plantsData');
    localStorage.removeItem('plantsDataTime');
  },

  // Initialize
  init: async () => {
    await PlantRecommendation.loadPlants();
    PlantRecommendation.setupFilters();
    
    // Show initial recommendations (top 15 most efficient)
    if (PlantRecommendation.plants.length > 0) {
      const initial = PlantRecommendation.plants
        .sort((a, b) => b.efficiency - a.efficiency)
        .slice(0, 15);
      PlantRecommendation.renderPlants(initial);
    }
  }
};

// Initialize plant recommendations when DOM is ready
document.addEventListener('DOMContentLoaded', PlantRecommendation.init);
