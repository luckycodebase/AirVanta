// AQI Copilot Module - Intent-driven environmental assistant using local logic and live AQI context

const Chatbot = {
  isOpen: false,
  currentAQI: 0,
  currentCity: '',
  dominantPollutant: 'Unknown',
  currentPollutants: {},
  plantsData: [],

  // Intent keywords
  intentKeywords: {
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
    ]
  },

  init: () => {
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
            <h3>AQI Copilot</h3>
            <span class="chatbot-status">Online</span>
          </div>
          <button class="chatbot-close" onclick="Chatbot.toggleChatbot()">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="chatbot-messages" id="chatMessages">
          <div class="bot-message">
            <div class="message-avatar">
              <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
              <p>Hello, I am your AQI Copilot.</p>
              <p>I use your current AQI and pollutant data to provide practical advice on outdoor safety, health risk, pollution causes, and plants.</p>
              <p>Try one of the suggested questions below.</p>
            </div>
          </div>
        </div>

        <div class="chatbot-quick-questions" id="chatQuickQuestions">
          <button class="quick-btn" onclick="Chatbot.askQuestion('Is it safe to go outside today?')">Is it safe to go outside today?</button>
          <button class="quick-btn" onclick="Chatbot.askQuestion('Why is AQI high today?')">Why is AQI high today?</button>
          <button class="quick-btn" onclick="Chatbot.askQuestion('Which plants improve air quality?')">Which plants improve air quality?</button>
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

      <button class="chatbot-fab" onclick="Chatbot.toggleChatbot()" title="Ask AQI Copilot">
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

    chatbot.classList.toggle('hidden');
    Chatbot.isOpen = !Chatbot.isOpen;

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
    if (Array.isArray(PlantRecommendation?.plants) && PlantRecommendation.plants.length > 0) {
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

    if (Chatbot.matchesIntent(normalized, 'outdoor_safety')) return 'outdoor_safety';
    if (Chatbot.matchesIntent(normalized, 'health_risk')) return 'health_risk';
    if (Chatbot.matchesIntent(normalized, 'plant_recommendation')) return 'plant_recommendation';
    if (Chatbot.matchesIntent(normalized, 'pollution_reason')) return 'pollution_reason';

    return 'general';
  },

  matchesIntent: (text, intent) => {
    const words = Chatbot.intentKeywords[intent] || [];
    return words.some((keyword) => text.includes(keyword));
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

    if (intent === 'outdoor_safety') {
      if (aqi <= 50) {
        return `${summary}<p>Outdoor activity is safe today for most people.</p>`;
      }
      if (aqi <= 100) {
        return `${summary}<p>Outdoor activity is generally fine, but sensitive groups should reduce intense exertion.</p>`;
      }
      if (aqi <= 150) {
        return `${summary}<p>Limit prolonged outdoor activity, especially for children, elderly, and people with asthma.</p>`;
      }
      if (aqi <= 200) {
        return `${summary}<p>Outdoor activity should be limited. Use a well-fitted N95/KN95 mask if you need to go out.</p>`;
      }
      if (aqi <= 300) {
        return `${summary}<p>Avoid outdoor activity as much as possible and keep windows closed indoors.</p>`;
      }
      return `${summary}<p>Hazardous conditions. Stay indoors and avoid outdoor exposure.</p>`;
    }

    if (intent === 'health_risk') {
      if (aqi <= 100) {
        return `${summary}<p>Health risk is low to moderate for most people. Sensitive individuals should monitor symptoms.</p>`;
      }
      if (aqi <= 150) {
        return `${summary}<p>Health risk is elevated for sensitive groups. Watch for cough, throat irritation, or shortness of breath.</p>`;
      }
      if (aqi <= 200) {
        return `${summary}<p>Health risk is high. Reduce exposure time and use respiratory protection outdoors.</p>`;
      }
      return `${summary}<p>Health risk is very high. Minimize exposure and seek medical advice if symptoms worsen.</p>`;
    }

    if (intent === 'plant_recommendation') {
      const plantsHtml = topPlants.length
        ? `<ul>${topPlants.map((plant) => `<li><strong>${plant.plantName}</strong> (${plant.efficiency}% efficiency) - helps with ${plant.pollutantsReduced.join(', ')}</li>`).join('')}</ul>`
        : '<p>No plant data is available right now.</p>';

      return `${summary}
        <p>Plants that can help reduce <strong>${dominant}</strong> indoors:</p>
        ${plantsHtml}
        <p>Use 2-3 plants per room with ventilation for better indoor air quality.</p>`;
    }

    if (intent === 'pollution_reason') {
      const reasons = Chatbot.getPollutionReasons(dominant);
      return `${summary}
        <p>Likely reasons AQI is high right now:</p>
        <ul>
          <li>${reasons[0]}</li>
          <li>${reasons[1]}</li>
          <li>${reasons[2]}</li>
        </ul>
        <p>If possible, avoid peak traffic hours and keep indoor air filtered.</p>`;
    }

    const defaultPlants = topPlants.map((plant) => plant.plantName).join(', ');
    return `${summary}
      <p>I can help with outdoor safety, health risk, pollution causes, and plant recommendations.</p>
      <p>Top plants for current conditions: <strong>${defaultPlants || 'No data available'}</strong>.</p>
      <p>Try: "Is it safe to go outside today?" or "Why is AQI high today?"</p>`;
  }
};
