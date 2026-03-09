// Pollution Advisor Module - Health recommendations and risk analysis

const Advisor = {
  currentAQI: 0,
  dominantPollutant: null,

  // Initialize advisor
  init: () => {
  },

  // Update advisor with current AQI data
  updateAdvisor: (data) => {
    Advisor.currentAQI = data.aqi;
    Advisor.dominantPollutant = data.dominantPollutant;

    Advisor.displayHealthAdvisory();
    Advisor.displayPollutionSource();
    Advisor.displayExposureRisk();
    Advisor.detectPollutionTrend();
  },

  // HEALTH ADVISORY SYSTEM
  displayHealthAdvisory: () => {
    const advisory = Advisor.getHealthRecommendations(Advisor.currentAQI);
    const container = document.getElementById('healthAdvisory');
    
    if (!container) return;

    container.innerHTML = `
      <div class="advisory-card ${advisory.class}">
        <div class="advisory-header">
          <i class="fas fa-${advisory.icon}"></i>
          <h3>${advisory.title}</h3>
        </div>
        <div class="advisory-content">
          <h4>Health Recommendations:</h4>
          <ul>
            ${advisory.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
          ${advisory.activities ? `
            <h4>Activities Status:</h4>
            <div class="activity-status">
              ${advisory.activities.map(act => `
                <div class="activity ${act.safe ? 'safe' : 'unsafe'}">
                  <i class="fas fa-${act.icon}"></i>
                  <span>${act.name}</span>
                  <i class="fas fa-${act.safe ? 'check-circle' : 'times-circle'}"></i>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  // Get health recommendations based on AQI
  getHealthRecommendations: (aqi) => {
    if (aqi <= 50) {
      return {
        class: 'good',
        icon: 'smile',
        title: 'Air Quality is Good',
        recommendations: [
          'Perfect conditions for outdoor activities',
          'Safe for everyone including sensitive groups',
          'Ideal time for exercise and recreation',
          'No health precautions needed'
        ],
        activities: [
          { name: 'Running', icon: 'running', safe: true },
          { name: 'Cycling', icon: 'biking', safe: true },
          { name: 'Outdoor Sports', icon: 'futbol', safe: true },
          { name: 'Children Play', icon: 'child', safe: true }
        ]
      };
    } else if (aqi <= 100) {
      return {
        class: 'moderate',
        icon: 'meh',
        title: 'Air Quality is Moderate',
        recommendations: [
          'Generally acceptable for most people',
          'Sensitive individuals should limit prolonged outdoor exertion',
          'Consider closing windows if you have respiratory conditions',
          'Monitor air quality if planning strenuous activities'
        ],
        activities: [
          { name: 'Running', icon: 'running', safe: true },
          { name: 'Cycling', icon: 'biking', safe: true },
          { name: 'Outdoor Sports', icon: 'futbol', safe: true },
          { name: 'Children Play', icon: 'child', safe: true }
        ]
      };
    } else if (aqi <= 150) {
      return {
        class: 'unhealthy-sg',
        icon: 'frown',
        title: 'Unhealthy for Sensitive Groups',
        recommendations: [
          'Children, elderly, and people with respiratory diseases should reduce prolonged outdoor exertion',
          'General public should limit prolonged outdoor activities',
          'Keep windows closed if you have asthma or allergies',
          'Consider wearing a mask if you must be outdoors for extended periods',
          'Use air purifiers indoors'
        ],
        activities: [
          { name: 'Running', icon: 'running', safe: false },
          { name: 'Cycling', icon: 'biking', safe: false },
          { name: 'Outdoor Sports', icon: 'futbol', safe: false },
          { name: 'Children Play', icon: 'child', safe: false }
        ]
      };
    } else if (aqi <= 200) {
      return {
        class: 'unhealthy',
        icon: 'sad-tear',
        title: 'Air Quality is Unhealthy',
        recommendations: [
          'Everyone should avoid prolonged outdoor exertion',
          'Sensitive groups should avoid all outdoor activities',
          'Wear N95 or KN95 mask when going outside',
          'Keep windows and doors closed',
          'Run air purifiers on high setting',
          'Avoid exercise outdoors - use indoor gym instead',
          'Reschedule outdoor events if possible'
        ],
        activities: [
          { name: 'Running', icon: 'running', safe: false },
          { name: 'Cycling', icon: 'biking', safe: false },
          { name: 'Outdoor Sports', icon: 'futbol', safe: false },
          { name: 'Children Play', icon: 'child', safe: false }
        ]
      };
    } else if (aqi <= 300) {
      return {
        class: 'very-unhealthy',
        icon: 'dizzy',
        title: 'Air Quality is Very Unhealthy',
        recommendations: [
          'Everyone should avoid all outdoor activities',
          'Sensitive groups should remain indoors',
          'Wear high-quality N95 mask if you must go outside',
          'Seal windows and doors to prevent outdoor air entry',
          'Use HEPA air purifiers continuously',
          'Cancel all outdoor plans',
          'Work from home if possible',
          'Seek medical help if you experience respiratory distress'
        ],
        activities: [
          { name: 'Running', icon: 'running', safe: false },
          { name: 'Cycling', icon: 'biking', safe: false },
          { name: 'Outdoor Sports', icon: 'futbol', safe: false },
          { name: 'Children Play', icon: 'child', safe: false }
        ]
      };
    } else {
      return {
        class: 'hazardous',
        icon: 'skull-crossbones',
        title: 'Hazardous Air Quality - Emergency Conditions',
        recommendations: [
          '⚠️ STAY INDOORS AT ALL TIMES',
          'Seal all windows, doors, and ventilation openings',
          'Run multiple HEPA air purifiers',
          'Wear N95 mask even indoors if air quality deteriorates',
          'Avoid cooking with gas - use electric appliances',
          'Cancel all non-essential activities',
          'Seek immediate medical attention for any breathing difficulties',
          'Consider evacuation if conditions persist',
          'Follow government emergency advisories'
        ],
        activities: [
          { name: 'Running', icon: 'running', safe: false },
          { name: 'Cycling', icon: 'biking', safe: false },
          { name: 'Outdoor Sports', icon: 'futbol', safe: false },
          { name: 'Children Play', icon: 'child', safe: false }
        ]
      };
    }
  },

  // POLLUTION SOURCE ANALYSIS
  displayPollutionSource: () => {
    const sources = Advisor.getPollutionSources(Advisor.dominantPollutant);
    const container = document.getElementById('pollutionSource');
    
    if (!container) return;

    container.innerHTML = `
      <div class="source-card">
        <div class="source-header">
          <i class="fas fa-industry"></i>
          <h3>Dominant Pollutant: ${Advisor.dominantPollutant || 'Unknown'}</h3>
        </div>
        <div class="source-content">
          <h4>Common Sources:</h4>
          <ul class="source-list">
            ${sources.sources.map(source => `
              <li>
                <i class="fas fa-${source.icon}"></i>
                <span>${source.name}</span>
              </li>
            `).join('')}
          </ul>
          <div class="source-info">
            <h4>Health Impact:</h4>
            <p>${sources.impact}</p>
          </div>
          <div class="source-solutions">
            <h4>How to Reduce Exposure:</h4>
            <ul>
              ${sources.solutions.map(sol => `<li>${sol}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;
  },

  // Get pollution sources based on dominant pollutant
  getPollutionSources: (pollutant) => {
    const pollutantData = {
      'PM2.5': {
        sources: [
          { name: 'Vehicle exhaust emissions', icon: 'car' },
          { name: 'Industrial combustion', icon: 'industry' },
          { name: 'Construction dust', icon: 'hard-hat' },
          { name: 'Biomass burning (crop burning, wildfires)', icon: 'fire' },
          { name: 'Residential cooking and heating', icon: 'home' },
          { name: 'Power plant emissions', icon: 'charging-station' }
        ],
        impact: 'PM2.5 particles are extremely small and can penetrate deep into lungs and bloodstream, causing respiratory issues, cardiovascular diseases, and reduced life expectancy.',
        solutions: [
          'Reduce vehicle usage - use public transport or carpool',
          'Avoid outdoor activities during peak traffic hours',
          'Use N95 masks when air quality is poor',
          'Install HEPA air purifiers at home and office',
          'Keep indoor plants that filter PM2.5'
        ]
      },
      'PM10': {
        sources: [
          { name: 'Road dust and construction sites', icon: 'road' },
          { name: 'Unpaved roads', icon: 'truck' },
          { name: 'Agricultural activities', icon: 'tractor' },
          { name: 'Cement manufacturing', icon: 'warehouse' },
          { name: 'Mining operations', icon: 'mountain' },
          { name: 'Wind-blown dust', icon: 'wind' }
        ],
        impact: 'PM10 particles can irritate eyes, nose, and throat. They can aggravate asthma and cause coughing, wheezing, and shortness of breath.',
        solutions: [
          'Avoid areas with heavy construction',
          'Wet mop floors instead of sweeping',
          'Wear dust masks in dusty environments',
          'Plant trees and grass to reduce dust',
          'Use air filters and purifiers'
        ]
      },
      'O3': {
        sources: [
          { name: 'Vehicle emissions (NOx + sunlight)', icon: 'car' },
          { name: 'Industrial emissions', icon: 'industry' },
          { name: 'Chemical solvents', icon: 'flask' },
          { name: 'Gasoline vapors', icon: 'gas-pump' },
          { name: 'Paints and coatings', icon: 'paint-roller' }
        ],
        impact: 'Ground-level ozone irritates respiratory system, reduces lung function, aggravates asthma, and can lead to chronic respiratory diseases.',
        solutions: [
          'Stay indoors during peak ozone hours (afternoon)',
          'Reduce driving - ozone forms from car exhaust',
          'Avoid using gasoline-powered equipment',
          'Refuel vehicles in evening to reduce vapors',
          'Keep windows closed on high ozone days'
        ]
      },
      'NO2': {
        sources: [
          { name: 'Vehicle exhaust (diesel engines)', icon: 'truck' },
          { name: 'Power plants', icon: 'plug' },
          { name: 'Industrial boilers', icon: 'industry' },
          { name: 'Gas stoves and heaters', icon: 'fire-alt' },
          { name: 'Cigarette smoke', icon: 'smoking' }
        ],
        impact: 'NO2 inflames airways, reduces lung function, increases susceptibility to respiratory infections, and worsens asthma.',
        solutions: [
          'Ensure proper ventilation when using gas appliances',
          'Use electric stoves instead of gas',
          'Avoid busy roads during rush hours',
          'Install exhaust fans in kitchens',
          'Use air purifiers with activated carbon'
        ]
      },
      'SO2': {
        sources: [
          { name: 'Coal-fired power plants', icon: 'fire' },
          { name: 'Industrial processes (metal smelting)', icon: 'industry' },
          { name: 'Diesel vehicles', icon: 'truck' },
          { name: 'Petroleum refineries', icon: 'oil-can' },
          { name: 'Volcanic eruptions', icon: 'volcano' }
        ],
        impact: 'SO2 causes respiratory problems, aggravates asthma, contributes to acid rain, and can lead to cardiovascular issues.',
        solutions: [
          'Avoid areas near industrial zones',
          'Support clean energy initiatives',
          'Use low-sulfur fuels',
          'Keep indoor air clean with purifiers',
          'Monitor air quality alerts'
        ]
      },
      'CO': {
        sources: [
          { name: 'Vehicle emissions (incomplete combustion)', icon: 'car' },
          { name: 'Gas heaters and fireplaces', icon: 'fire' },
          { name: 'Cigarette smoke', icon: 'smoking' },
          { name: 'Generators and engines', icon: 'cog' },
          { name: 'Charcoal grills', icon: 'hamburger' }
        ],
        impact: 'CO reduces oxygen delivery to body organs and tissues. Can cause headaches, dizziness, and at high levels, death.',
        solutions: [
          'Install CO detectors at home',
          'Ensure proper ventilation of fuel-burning appliances',
          'Never use generators indoors',
          'Avoid idling vehicles in enclosed spaces',
          'Regularly service heating systems'
        ]
      }
    };

    return pollutantData[pollutant] || {
      sources: [
        { name: 'Various emission sources', icon: 'question' },
        { name: 'Check local environmental data', icon: 'chart-line' }
      ],
      impact: 'Air pollution can affect respiratory and cardiovascular health.',
      solutions: [
        'Monitor air quality regularly',
        'Use air purifiers indoors',
        'Reduce outdoor exposure on high pollution days'
      ]
    };
  },

  // USER EXPOSURE RISK CALCULATOR
  displayExposureRisk: () => {
    const risk = Advisor.calculateExposureRisk(Advisor.currentAQI);
    const container = document.getElementById('exposureRisk');
    
    if (!container) return;

    container.innerHTML = `
      <div class="risk-card ${risk.class}">
        <div class="risk-header">
          <i class="fas fa-${risk.icon}"></i>
          <h3>Personal Exposure Risk: ${risk.level}</h3>
        </div>
        <div class="risk-meter">
          <div class="risk-bar" style="width: ${risk.percentage}%; background: ${risk.color}"></div>
        </div>
        <div class="risk-content">
          <div class="risk-stat">
            <span class="label">Safe Outdoor Time:</span>
            <span class="value">${risk.safeTime}</span>
          </div>
          <div class="risk-stat">
            <span class="label">Recommended Mask:</span>
            <span class="value">${risk.mask}</span>
          </div>
          <div class="risk-stat">
            <span class="label">Sensitive Groups:</span>
            <span class="value">${risk.sensitiveWarning}</span>
          </div>
          <div class="risk-recommendations">
            <h4>Immediate Actions:</h4>
            <ul>
              ${risk.actions.map(action => `<li>${action}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;
  },

  // Calculate exposure risk
  calculateExposureRisk: (aqi) => {
    if (aqi <= 50) {
      return {
        class: 'low-risk',
        level: 'Low',
        icon: 'shield-alt',
        percentage: 20,
        color: '#22c55e',
        safeTime: 'Unlimited',
        mask: 'Not required',
        sensitiveWarning: 'Safe for everyone',
        actions: [
          'Enjoy outdoor activities',
          'Perfect time for exercise',
          'No precautions needed'
        ]
      };
    } else if (aqi <= 100) {
      return {
        class: 'moderate-risk',
        level: 'Moderate',
        icon: 'shield-alt',
        percentage: 40,
        color: '#eab308',
        safeTime: '6-8 hours',
        mask: 'Optional for sensitive groups',
        sensitiveWarning: 'Monitor symptoms',
        actions: [
          'Generally safe for most people',
          'Sensitive individuals should watch for symptoms',
          'Consider indoor alternatives if you have respiratory issues'
        ]
      };
    } else if (aqi <= 150) {
      return {
        class: 'elevated-risk',
        level: 'Elevated',
        icon: 'exclamation-triangle',
        percentage: 60,
        color: '#f97316',
        safeTime: '2-4 hours',
        mask: 'Recommended for children & elderly',
        sensitiveWarning: 'High risk for sensitive groups',
        actions: [
          'Limit prolonged outdoor activities',
          'Sensitive groups should stay indoors',
          'Close windows and use air purifiers'
        ]
      };
    } else if (aqi <= 200) {
      return {
        class: 'high-risk',
        level: 'High',
        icon: 'exclamation-circle',
        percentage: 75,
        color: '#ef4444',
        safeTime: 'Less than 1 hour',
        mask: 'N95/KN95 required outdoors',
        sensitiveWarning: 'Stay indoors',
        actions: [
          'Avoid all outdoor activities',
          'Wear N95 mask if you must go outside',
          'Keep indoor air purifiers running',
          'Seal windows and doors'
        ]
      };
    } else if (aqi <= 300) {
      return {
        class: 'very-high-risk',
        level: 'Very High',
        icon: 'radiation',
        percentage: 90,
        color: '#9333ea',
        safeTime: 'Less than 30 minutes',
        mask: 'N95/KN95 mandatory',
        sensitiveWarning: 'Emergency conditions',
        actions: [
          'Stay indoors at all times',
          'Seal all openings',
          'Use multiple air purifiers',
          'Seek medical help if breathing difficulties occur'
        ]
      };
    } else {
      return {
        class: 'extreme-risk',
        level: 'EXTREME',
        icon: 'skull-crossbones',
        percentage: 100,
        color: '#7f1d1d',
        safeTime: 'DO NOT GO OUTSIDE',
        mask: 'N95 even indoors',
        sensitiveWarning: 'HEALTH EMERGENCY',
        actions: [
          '⚠️ EMERGENCY: Stay indoors',
          'Seal all entry points immediately',
          'Wear mask even indoors if needed',
          'Consider evacuation if conditions persist',
          'Follow government emergency protocols'
        ]
      };
    }
  },

  // POLLUTION TREND DETECTION
  detectPollutionTrend: () => {
    const history = Prediction.historicalData || [];
    
    if (history.length < 7) {
      return; // Need at least a week of data
    }

    // Calculate last week average
    const lastWeek = history.slice(-7);
    const lastWeekAvg = lastWeek.reduce((sum, h) => sum + h.aqi, 0) / lastWeek.length;

    // Calculate previous week average
    const previousWeek = history.slice(-14, -7);
    const previousWeekAvg = previousWeek.length > 0 
      ? previousWeek.reduce((sum, h) => sum + h.aqi, 0) / previousWeek.length
      : lastWeekAvg;

    const change = lastWeekAvg - previousWeekAvg;
    const changePercent = ((change / previousWeekAvg) * 100).toFixed(1);

    const trendContainer = document.getElementById('pollutionTrend');
    if (!trendContainer) return;

    let trendHTML = '';
    if (change > 5) {
      trendHTML = `
        <div class="trend-alert increasing">
          <i class="fas fa-arrow-up"></i>
          <div class="trend-content">
            <h3>Air Pollution is Increasing</h3>
            <p>AQI increased by ${Math.abs(changePercent)}% compared to last week</p>
            <span class="trend-value">Last Week: ${lastWeekAvg.toFixed(0)} | Previous: ${previousWeekAvg.toFixed(0)}</span>
          </div>
        </div>
      `;
    } else if (change < -5) {
      trendHTML = `
        <div class="trend-alert decreasing">
          <i class="fas fa-arrow-down"></i>
          <div class="trend-content">
            <h3>Air Quality is Improving</h3>
            <p>AQI decreased by ${Math.abs(changePercent)}% compared to last week</p>
            <span class="trend-value">Last Week: ${lastWeekAvg.toFixed(0)} | Previous: ${previousWeekAvg.toFixed(0)}</span>
          </div>
        </div>
      `;
    } else {
      trendHTML = `
        <div class="trend-alert stable">
          <i class="fas fa-equals"></i>
          <div class="trend-content">
            <h3>Air Quality is Stable</h3>
            <p>No significant change from last week</p>
            <span class="trend-value">Last Week: ${lastWeekAvg.toFixed(0)} | Previous: ${previousWeekAvg.toFixed(0)}</span>
          </div>
        </div>
      `;
    }

    trendContainer.innerHTML = trendHTML;
  }
};
