// Aeri - Intent-driven environmental assistant using local logic and live AQI context

const Chatbot = {
  isOpen: false,
  currentAQI: 0,
  currentCity: '',
  dominantPollutant: 'Unknown',
  currentPollutants: {},
  plantsData: [],

  // Intent keywords
  intentKeywords: {
    greeting: [
      'hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening', 'howdy'
    ],
    thanks: [
      'thank', 'thanks', 'appreciate', 'helpful', 'great', 'awesome', 'perfect'
    ],
    outdoor_safety: [
      'safe', 'outside', 'outdoor', 'go out', 'walk', 'run', 'running', 'jog', 'cycling', 'exercise'
    ],
    health_risk: [
      'health', 'risk', 'breathing', 'lungs', 'asthma', 'sick', 'symptom', 'mask', 'headache', 'cough'
    ],
    plant_recommendation: [
      'plant', 'plants', 'indoor', 'purify', 'purifier', 'reduce pollution', 'which plant', 'green'
    ],
    pollution_reason: [
      'why', 'reason', 'cause', 'source', 'high aqi', 'pollution high', 'smog', 'haze'
    ],
    high_pollution_days: [
      'forecast', 'prediction', 'predict', 'future', 'upcoming', 'next week', 'coming days', 
      'high pollution days', 'bad days', 'dangerous days', 'worst days', 'when should', 'avoid going'
    ]
  },

  // Environmental facts and quotes for greeting responses
  environmentalFacts: [
    '🌍 Did you know? Air pollution causes 7 million premature deaths worldwide each year.',
    '🌳 Did you know? A single tree can absorb up to 48 pounds of CO2 per year.',
    '🚶 Fun fact: Walking or cycling instead of driving can reduce your carbon footprint by up to 2.5 tons annually.',
    '💨 Interesting fact: Indoor air can be 2-5 times more polluted than outdoor air.',
    '🌱 Amazing fact: Plants like Spider Plant and Peace Lily can remove up to 87% of indoor air toxins in 24 hours.',
    '🚗 Did you know? Transportation accounts for nearly 30% of greenhouse gas emissions.',
    '🏭 Important to know: PM2.5 particles are so small they can enter your bloodstream through your lungs.',
    '🌊 Did you know? Air pollution doesn\'t just affect humans - it harms wildlife and disrupts entire ecosystems.',
    '♻️ Fun fact: Recycling one aluminum can saves enough energy to power a TV for 3 hours.',
    '☀️ Good news: Renewable energy could power 80% of the world\'s energy needs by 2050.'
  ],

  environmentalQuotes: [
    '"The environment is where we all meet; where all have a mutual interest." - Lady Bird Johnson',
    '"We do not inherit the Earth from our ancestors; we borrow it from our children." - Native American Proverb',
    '"The Earth does not belong to us. We belong to the Earth." - Chief Seattle',
    '"What we are doing to the forests of the world is but a mirror reflection of what we are doing to ourselves." - Mahatma Gandhi',
    '"The greatest threat to our planet is the belief that someone else will save it." - Robert Swan',
    '"Clean air is not a luxury, it\'s a necessity." - Anonymous',
    '"Every breath we take is connected to the health of our planet." - Anonymous',
    '"Small acts, when multiplied by millions of people, can transform the world." - Howard Zinn'
  ],

  init: () => {
    // Prevent duplicate initialization
    if (document.getElementById('chatbot')) {
      return;
    }
    
    Chatbot.createChatbotUI();
    Chatbot.setupEventListeners();
    Chatbot.ensurePlantData();
  },

  createChatbotUI: () => {
    const chatbotHTML = `
      <div id="chatbot" class="chatbot-container hidden">
        <div class="chatbot-header">
          <div class="chatbot-title">
            <i class="fas fa-robot"></i>
            <h3>Aeri</h3>
            <span class="chatbot-status">Online</span>
          </div>
          <div class="chatbot-header-actions">
            <button class="chatbot-clear-btn" onclick="Chatbot.clearChat()" title="Clear chat">
              <i class="fas fa-trash-alt"></i>
            </button>
            <button class="chatbot-close" onclick="Chatbot.toggleChatbot()">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div class="chatbot-messages" id="chatMessages">
          <div class="bot-message">
            <div class="message-avatar">
              <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
              <p>👋 Hello! I'm <strong>Aeri</strong>, your AI air quality assistant.</p>
              <p>I use real-time AQI and pollutant data to provide personalized advice on outdoor safety, health risks, pollution causes, air-purifying plants, and predicted high pollution days.</p>
              <p>Try asking me a question or use the suggestions below! 💬</p>
            </div>
          </div>
        </div>

        <div class="chatbot-quick-questions" id="chatQuickQuestions">
          <button class="quick-btn" onclick="Chatbot.askQuestion('Is it safe to go outside today?')">
            <i class="fas fa-walking"></i> Is it safe to go outside today?
          </button>
          <button class="quick-btn" onclick="Chatbot.askQuestion('Why is AQI high today?')">
            <i class="fas fa-smog"></i> Why is AQI high today?
          </button>
          <button class="quick-btn" onclick="Chatbot.askQuestion('Which plants improve air quality?')">
            <i class="fas fa-leaf"></i> Which plants improve air quality?
          </button>
          <button class="quick-btn" onclick="Chatbot.askQuestion('When are the high pollution days?')">
            <i class="fas fa-calendar-exclamation"></i> High pollution days?
          </button>
        </div>

        <div class="chatbot-input-area">
          <input
            type="text"
            id="chatInput"
            placeholder="Ask about air quality..."
            class="chatbot-input"
          >
          <button class="chatbot-send" onclick="Chatbot.sendMessage()">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>

      <button class="chatbot-fab" onclick="Chatbot.toggleChatbot()" title="Chat with Aeri">
        <i class="fas fa-comments"></i>
        <span class="chatbot-badge">AI</span>
      </button>
    `;

    document.body.insertAdjacentHTML('beforeend', chatbotHTML);
  },

  setupEventListeners: () => {
    const input = document.getElementById('chatInput');
    if (!input) return;

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        Chatbot.sendMessage();
      }
    });
  },

  toggleChatbot: () => {
    const chatbot = document.getElementById('chatbot');
    if (!chatbot) return;

    // CSS uses .active to make chatbot visible and interactive.
    chatbot.classList.remove('hidden');
    chatbot.classList.toggle('active');
    Chatbot.isOpen = chatbot.classList.contains('active');

    if (Chatbot.isOpen) {
      document.getElementById('chatInput')?.focus();
    }
  },

  updateContext: (data) => {
    Chatbot.currentAQI = Number(data?.aqi) || 0;
    Chatbot.currentCity = data?.city || 'your location';
    Chatbot.dominantPollutant = Chatbot.formatPollutantLabel(data?.dominantPollutant || 'Unknown');
    Chatbot.currentPollutants = data?.pollutants || {};
  },

  ensurePlantData: async () => {
    if (
      typeof PlantRecommendation !== 'undefined' &&
      Array.isArray(PlantRecommendation.plants) &&
      PlantRecommendation.plants.length > 0
    ) {
      Chatbot.plantsData = PlantRecommendation.plants;
      return;
    }

    try {
      const response = await fetch('./assets/data/plants.json');
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data)) {
        Chatbot.plantsData = data;
      }
    } catch (error) {
      console.error('Unable to load plants data for chatbot:', error);
    }
  },

  sendMessage: async () => {
    const input = document.getElementById('chatInput');
    const question = input?.value?.trim();
    if (!question) return;

    Chatbot.addMessage(question, 'user');
    input.value = '';

    Chatbot.showTypingIndicator();
    await Chatbot.ensurePlantData();
    const response = Chatbot.getDynamicResponse(question);
    Chatbot.hideTypingIndicator();
    Chatbot.addMessage(response, 'bot');
  },

  askQuestion: (question) => {
    const input = document.getElementById('chatInput');
    if (!input) return;
    input.value = question;
    Chatbot.sendMessage();
  },

  addMessage: (text, sender) => {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    const messageHTML = sender === 'user'
      ? `
      <div class="user-message">
        <div class="message-content">
          <p>${text}</p>
        </div>
        <div class="message-avatar">
          <i class="fas fa-user"></i>
        </div>
      </div>
    `
      : `
      <div class="bot-message">
        <div class="message-avatar">
          <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">${text}</div>
      </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  },

  showTypingIndicator: () => {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    const typingHTML = `
      <div class="bot-message typing-indicator" id="typingIndicator">
        <div class="message-avatar">
          <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
          <div class="typing-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', typingHTML);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  },

  hideTypingIndicator: () => {
    document.getElementById('typingIndicator')?.remove();
  },

  detectIntent: (question) => {
    const normalized = question.toLowerCase();

    if (Chatbot.matchesIntent(normalized, 'greeting')) return 'greeting';
    if (Chatbot.matchesIntent(normalized, 'thanks')) return 'thanks';
    if (Chatbot.matchesIntent(normalized, 'outdoor_safety')) return 'outdoor_safety';
    if (Chatbot.matchesIntent(normalized, 'health_risk')) return 'health_risk';
    if (Chatbot.matchesIntent(normalized, 'plant_recommendation')) return 'plant_recommendation';
    if (Chatbot.matchesIntent(normalized, 'pollution_reason')) return 'pollution_reason';
    if (Chatbot.matchesIntent(normalized, 'high_pollution_days')) return 'high_pollution_days';

    return 'general';
  },

  matchesIntent: (text, intent) => {
    const words = Chatbot.intentKeywords[intent] || [];
    return words.some((keyword) => {
      // Use word boundary regex to match whole words only
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(text);
    });
  },

  formatPollutantLabel: (pollutant) => {
    if (!pollutant) return 'Unknown';

    const normalized = pollutant.toString().trim().toLowerCase().replace(/\s+/g, '');
    const map = {
      pm25: 'PM2.5',
      pm2_5: 'PM2.5',
      'pm2.5': 'PM2.5',
      pm10: 'PM10',
      o3: 'O3',
      no2: 'NO2',
      so2: 'SO2',
      co: 'CO',
      unknown: 'Unknown'
    };

    return map[normalized] || pollutant;
  },

  getCategoryLabel: (aqi) => {
    return Utils.getAQICategory(aqi).category;
  },

  getTopPlantsForPollutant: (dominantPollutant) => {
    if (!Array.isArray(Chatbot.plantsData) || Chatbot.plantsData.length === 0) {
      return [];
    }

    const target = Chatbot.formatPollutantLabel(dominantPollutant).toUpperCase();

    const normalizeList = (values) => values.map((value) => Chatbot.formatPollutantLabel(value).toUpperCase());

    let matched = Chatbot.plantsData.filter((plant) => {
      const reduced = normalizeList(Array.isArray(plant.pollutantsReduced) ? plant.pollutantsReduced : []);
      if (target === 'PM2.5') {
        return reduced.includes('PM2.5') || reduced.includes('PM10');
      }
      return reduced.includes(target);
    });

    if (!matched.length) {
      matched = [...Chatbot.plantsData];
    }

    return matched
      .sort((a, b) => (Number(b.efficiency) || 0) - (Number(a.efficiency) || 0))
      .slice(0, 3)
      .map((plant) => ({
        plantName: plant.name || 'Unknown Plant',
        pollutantsReduced: Array.isArray(plant.pollutantsReduced) ? plant.pollutantsReduced : [],
        efficiency: Number(plant.efficiency) || 0
      }));
  },

  getPollutionReasons: (pollutant) => {
    const key = Chatbot.formatPollutantLabel(pollutant).toUpperCase();

    const reasonsByPollutant = {
      'PM2.5': ['Vehicle exhaust', 'Construction dust', 'Biomass burning'],
      PM10: ['Road dust', 'Construction activity', 'Industrial particles'],
      NO2: ['Traffic congestion', 'Combustion engines', 'Power generation'],
      SO2: ['Industrial fuel burning', 'Power plants', 'Heavy diesel use'],
      O3: ['Sunlight reaction with urban gases', 'Traffic pollutants', 'Industrial emissions'],
      CO: ['Incomplete fuel combustion', 'Traffic exhaust', 'Generator emissions']
    };

    return reasonsByPollutant[key] || ['Traffic emissions', 'Industrial activity', 'Local dust and burning'];
  },

  getHighPollutionDays: () => {
    // Check if Prediction system has data
    if (!window.Prediction || !Array.isArray(window.Prediction.predictions) || window.Prediction.predictions.length === 0) {
      return { available: false, days: [] };
    }

    // Filter for high pollution days (AQI > 150)
    const dangerousDays = window.Prediction.predictions
      .filter(p => p.aqi > 150)
      .slice(0, 5)
      .map(p => {
        // Parse date
        let dateObj;
        try {
          dateObj = new Date(p.date);
          if (isNaN(dateObj.getTime())) {
            dateObj = new Date();
          }
        } catch {
          dateObj = new Date();
        }

        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return {
          dayName,
          monthDay,
          aqi: Math.round(p.aqi),
          category: p.category || 'Unhealthy'
        };
      });

    return { available: true, days: dangerousDays };
  },

  getRandomFact: () => {
    const facts = Chatbot.environmentalFacts;
    return facts[Math.floor(Math.random() * facts.length)];
  },

  getRandomQuote: () => {
    const quotes = Chatbot.environmentalQuotes;
    return quotes[Math.floor(Math.random() * quotes.length)];
  },

  clearChat: () => {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    // Clear all messages except the initial greeting
    messagesContainer.innerHTML = `
      <div class="bot-message">
        <div class="message-avatar">
          <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
          <p>👋 Hello! I'm <strong>Aeri</strong>, your AI air quality assistant.</p>
          <p>I use real-time AQI and pollutant data to provide personalized advice on outdoor safety, health risks, pollution causes, air-purifying plants, and predicted high pollution days.</p>
          <p>Try asking me a question or use the suggestions below! 💬</p>
        </div>
      </div>
    `;

    messagesContainer.scrollTop = 0;
  },

  getDynamicResponse: (question) => {
    const intent = Chatbot.detectIntent(question);
    const aqi = Chatbot.currentAQI;
    const category = Chatbot.getCategoryLabel(aqi);
    const city = Chatbot.currentCity || 'your location';
    const dominant = Chatbot.formatPollutantLabel(Chatbot.dominantPollutant);
    const topPlants = Chatbot.getTopPlantsForPollutant(dominant);

    const summary = `
      <p><strong>Current AQI in ${city} is ${aqi}</strong>, which is <strong>${category}</strong>.</p>
      <p>The dominant pollutant is <strong>${dominant}</strong>.</p>
    `;

    // Greeting intent
    if (intent === 'greeting') {
      const randomFact = Chatbot.getRandomFact();
      const randomQuote = Chatbot.getRandomQuote();
      const useQuote = Math.random() > 0.5;
      
      return `
        <p>👋 Hello! Great to chat with you!</p>
        <p>${useQuote ? randomQuote : randomFact}</p>
        ${aqi ? summary : '<p><strong>Tip:</strong> Search for a location to see current air quality data.</p>'}
        <p>How can I help you today? Try asking about outdoor safety, health risks, pollution causes, air-purifying plants, or predicted high pollution days! 🌱📅</p>
      `;
    }

    // Thanks intent
    if (intent === 'thanks') {
      const responses = [
        `<p>You're welcome! 😊 Remember, every small action counts towards cleaner air.</p>`,
        `<p>Happy to help! 🌍 Keep breathing clean and stay informed about air quality.</p>`,
        `<p>My pleasure! 💚 Together we can make a difference for better air quality.</p>`,
        `<p>Anytime! 🌿 Stay safe and don't hesitate to ask more questions.</p>`
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }

    if (intent === 'outdoor_safety') {
      if (aqi <= 50) {
        return `${summary}<p>✅ Outdoor activity is safe today for most people.</p>`;
      }
      if (aqi <= 100) {
        return `${summary}<p>✅ Outdoor activity is generally fine, but sensitive groups should reduce intense exertion.</p>`;
      }
      if (aqi <= 150) {
        return `${summary}<p>⚠️ Limit prolonged outdoor activity, especially for children, elderly, and people with asthma.</p>`;
      }
      if (aqi <= 200) {
        return `${summary}<p>🚨 Outdoor activity should be limited. Use a well-fitted N95/KN95 mask if you need to go out.</p>`;
      }
      if (aqi <= 300) {
        return `${summary}<p>🚨 Avoid outdoor activity as much as possible and keep windows closed indoors.</p>`;
      }
      return `${summary}<p>⛔ Hazardous conditions. Stay indoors and avoid outdoor exposure.</p>`;
    }

    if (intent === 'health_risk') {
      if (aqi <= 100) {
        return `${summary}<p>✅ Health risk is low to moderate for most people. Sensitive individuals should monitor symptoms.</p>`;
      }
      if (aqi <= 150) {
        return `${summary}<p>⚠️ Health risk is elevated for sensitive groups. Watch for cough, throat irritation, or shortness of breath.</p>`;
      }
      if (aqi <= 200) {
        return `${summary}<p>🚨 Health risk is high. Reduce exposure time and use respiratory protection outdoors.</p>`;
      }
      return `${summary}<p>⛔ Health risk is very high. Minimize exposure and seek medical advice if symptoms worsen.</p>`;
    }

    if (intent === 'plant_recommendation') {
      const plantsHtml = topPlants.length
        ? `<ul>${topPlants.map((plant) => `<li>🌿 <strong>${plant.plantName}</strong> (${plant.efficiency}% efficiency) - helps with ${plant.pollutantsReduced.join(', ')}</li>`).join('')}</ul>`
        : '<p>No plant data is available right now.</p>';

      return `${summary}
        <p>🌱 Plants that can help reduce <strong>${dominant}</strong> indoors:</p>
        ${plantsHtml}
        <p><strong>Tip:</strong> Use 2-3 plants per room with ventilation for better indoor air quality.</p>`;
    }

    if (intent === 'pollution_reason') {
      const reasons = Chatbot.getPollutionReasons(dominant);
      return `${summary}
        <p>💨 Likely reasons AQI is high right now:</p>
        <ul>
          <li>🚗 ${reasons[0]}</li>
          <li>🏭 ${reasons[1]}</li>
          <li>🔥 ${reasons[2]}</li>
        </ul>
        <p><strong>Tip:</strong> If possible, avoid peak traffic hours and keep indoor air filtered.</p>`;
    }

    if (intent === 'high_pollution_days') {
      const predictionData = Chatbot.getHighPollutionDays();
      
      if (!predictionData.available) {
        return `${summary}
          <p>📊 No forecast data available yet.</p>
          <p><strong>Tip:</strong> Visit the <a href="#forecast">30-Day Forecast</a> section to generate predictions for ${city}.</p>`;
      }

      if (predictionData.days.length === 0) {
        return `${summary}
          <p>🎉 Great news! No high pollution days (AQI > 150) are predicted in the next 30 days.</p>
          <p>✅ Current conditions are expected to remain moderate or better.</p>
          <p><strong>Tip:</strong> Check the forecast section regularly for updates.</p>`;
      }

      const daysHtml = predictionData.days.map(d => {
        const emoji = d.aqi > 300 ? '⛔' : d.aqi > 200 ? '🚨' : d.aqi > 150 ? '⚠️' : '🔸';
        return `<li>${emoji} <strong>${d.dayName}, ${d.monthDay}</strong> - AQI ${d.aqi} (${d.category})</li>`;
      }).join('');

      return `${summary}
        <p>📅 <strong>Predicted High Pollution Days</strong> (AQI > 150):</p>
        <ul>${daysHtml}</ul>
        <p><strong>⚠️ Recommendations:</strong></p>
        <ul>
          <li>Plan indoor activities on these days</li>
          <li>Use N95/KN95 masks if going outside</li>
          <li>Keep windows closed and use air purifiers</li>
          <li>Reschedule outdoor exercise to cleaner days</li>
        </ul>
        <p><strong>Tip:</strong> Visit the <a href="#forecast">Forecast</a> section for detailed predictions.</p>`;
    }

    const defaultPlants = topPlants.map((plant) => plant.plantName).join(', ');
    return `${summary}
      <p>I can help with outdoor safety, health risk, pollution causes, plant recommendations, and predicted high pollution days.</p>
      <p>🌿 Top plants for current conditions: <strong>${defaultPlants || 'No data available'}</strong>.</p>
      <p>💡 Try: "Is it safe to go outside today?", "Why is AQI high today?", or "When are the high pollution days?"</p>`;
  }
};

// Required for inline HTML handlers like onclick="Chatbot.toggleChatbot()"
window.Chatbot = Chatbot;
