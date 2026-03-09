// AI Environmental Chatbot Module

const Chatbot = {
  isOpen: false,
  currentAQI: 0,
  currentCity: '',
  dominantPollutant: '',
  conversationHistory: [],
  
  // OpenAI API configuration (user should add their own key)
  apiKey: '', // Add your OpenAI API key here
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',

  // Initialize chatbot
  init: () => {
    Chatbot.createChatbotUI();
    Chatbot.setupEventListeners();
    Chatbot.loadKnowledgeBase();
  },

  // Create chatbot UI
  createChatbotUI: () => {
    const chatbotHTML = `
      <div id="chatbot" class="chatbot-container hidden">
        <div class="chatbot-header">
          <div class="chatbot-title">
            <i class="fas fa-robot"></i>
            <h3>AQI Assistant</h3>
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
              <p>Hello! I'm your AI Environmental Assistant. 🌿</p>
              <p>I can help you with:</p>
              <ul>
                <li>Understanding current air quality</li>
                <li>Health recommendations</li>
                <li>Plant recommendations</li>
                <li>Pollution sources & solutions</li>
              </ul>
              <p>Ask me anything about air quality!</p>
            </div>
          </div>
        </div>
        
        <div class="chatbot-quick-questions">
          <button class="quick-btn" onclick="Chatbot.askQuestion('Is it safe to go outside today?')">
            Is it safe to go outside?
          </button>
          <button class="quick-btn" onclick="Chatbot.askQuestion('Which plants reduce PM2.5?')">
            Plants for PM2.5?
          </button>
          <button class="quick-btn" onclick="Chatbot.askQuestion('Why is AQI high today?')">
            Why is AQI high?
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
      
      <button class="chatbot-fab" onclick="Chatbot.toggleChatbot()" title="Ask AI Assistant">
        <i class="fas fa-comments"></i>
        <span class="chatbot-badge">AI</span>
      </button>
    `;

    document.body.insertAdjacentHTML('beforeend', chatbotHTML);
  },

  // Setup event listeners
  setupEventListeners: () => {
    const input = document.getElementById('chatInput');
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          Chatbot.sendMessage();
        }
      });
    }
  },

  // Toggle chatbot visibility
  toggleChatbot: () => {
    const chatbot = document.getElementById('chatbot');
    if (chatbot) {
      chatbot.classList.toggle('hidden');
      Chatbot.isOpen = !Chatbot.isOpen;
      
      if (Chatbot.isOpen) {
        document.getElementById('chatInput')?.focus();
      }
    }
  },

  // Update chatbot with current environmental data
  updateContext: (data) => {
    Chatbot.currentAQI = data.aqi;
    Chatbot.currentCity = data.city;
    Chatbot.dominantPollutant = data.dominantPollutant;
  },

  // Send message
  sendMessage: async () => {
    const input = document.getElementById('chatInput');
    const question = input?.value.trim();
    
    if (!question) return;

    // Display user message
    Chatbot.addMessage(question, 'user');
    input.value = '';

    // Show typing indicator
    Chatbot.showTypingIndicator();

    // Get response
    const response = await Chatbot.getResponse(question);
    
    // Remove typing indicator
    Chatbot.hideTypingIndicator();

    // Display bot response
    Chatbot.addMessage(response, 'bot');
  },

  // Ask predefined question
  askQuestion: (question) => {
    document.getElementById('chatInput').value = question;
    Chatbot.sendMessage();
  },

  // Add message to chat
  addMessage: (text, sender) => {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    const messageHTML = sender === 'user' ? `
      <div class="user-message">
        <div class="message-content">
          <p>${text}</p>
        </div>
        <div class="message-avatar">
          <i class="fas fa-user"></i>
        </div>
      </div>
    ` : `
      <div class="bot-message">
        <div class="message-avatar">
          <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
          ${text}
        </div>
      </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  },

  // Show typing indicator
  showTypingIndicator: () => {
    const messagesContainer = document.getElementById('chatMessages');
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

  // Hide typing indicator
  hideTypingIndicator: () => {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
      indicator.remove();
    }
  },

  // Get AI response
  getResponse: async (question) => {
    // Try OpenAI API if key is configured
    if (Chatbot.apiKey) {
      try {
        return await Chatbot.getOpenAIResponse(question);
      } catch (error) {
        console.error('OpenAI API error:', error);
        // Fall back to rule-based system
      }
    }

    // Rule-based response system
    return Chatbot.getRuleBasedResponse(question);
  },

  // OpenAI API integration
  getOpenAIResponse: async (question) => {
    const context = `Current AQI: ${Chatbot.currentAQI}, Location: ${Chatbot.currentCity}, Dominant Pollutant: ${Chatbot.dominantPollutant}`;
    
    const response = await fetch(Chatbot.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Chatbot.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an AI environmental assistant helping users understand air quality. ${context}. Provide helpful, concise advice about air quality, health impacts, and recommendations.`
          },
          {
            role: 'user',
            content: question
          }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  },

  // Load knowledge base
  loadKnowledgeBase: () => {
    Chatbot.knowledgeBase = {
      safetyPatterns: /safe|outside|outdoor|go out|exercise|running|cycling/i,
      plantsPatterns: /plant|indoor|purif|reduce|clean air/i,
      reasonPatterns: /why|reason|cause|source|high|bad/i,
      healthPatterns: /health|sick|symptom|affect|breathing/i,
      maskPatterns: /mask|protection|what wear/i,
      predictionPatterns: /tomorrow|forecast|predict|future|will be/i,
      tipsPatterns: /how reduce|what do|improve|better|solution/i
    };
  },

  // Rule-based response system
  getRuleBasedResponse: (question) => {
    const q = question.toLowerCase();
    const aqi = Chatbot.currentAQI;
    const category = Utils.getAQICategory(aqi);

    // Safety questions
    if (Chatbot.knowledgeBase.safetyPatterns.test(q)) {
      if (aqi <= 50) {
        return `<p>✅ Yes, it's perfectly safe to go outside! Current AQI is ${aqi} (${category.category})</p><p>Perfect conditions for outdoor activities including running, cycling, and sports.</p>`;
      } else if (aqi <= 100) {
        return `<p>⚠️ Generally safe, but sensitive individuals should be cautious. Current AQI: ${aqi} (${category.category})</p><p>Most people can exercise outdoors, but watch for symptoms if you have respiratory conditions.</p>`;
      } else if (aqi <= 150) {
        return `<p>⚠️ Not recommended for prolonged outdoor activities. Current AQI: ${aqi} (${category.category})</p><p>Sensitive groups should stay indoors. General public should limit outdoor exertion.</p>`;
      } else {
        return `<p>❌ <strong>No, stay indoors.</strong> Current AQI: ${aqi} (${category.category})</p><p>Air quality is unhealthy. Avoid all outdoor activities and wear N95 mask if you must go outside.</p>`;
      }
    }

    // Plant questions
    if (Chatbot.knowledgeBase.plantsPatterns.test(q)) {
      const pollutant = Chatbot.dominantPollutant;
      return `<p>🌿 For ${pollutant} pollution, I recommend:</p>
        <ul>
          <li><strong>Snake Plant (Sansevieria)</strong> - Removes ${pollutant}, 78% efficiency</li>
          <li><strong>Peace Lily</strong> - Excellent air purifier, 85% efficiency</li>
          <li><strong>Spider Plant</strong> - Great for PM2.5 and formaldehyde</li>
          <li><strong>Bamboo Palm</strong> - Natural humidifier, 88% efficiency</li>
        </ul>
        <p>Check the Plants section for complete recommendations!</p>`;
    }

    // Reason/cause questions
    if (Chatbot.knowledgeBase.reasonPatterns.test(q)) {
      return `<p>The dominant pollutant is <strong>${Chatbot.dominantPollutant}</strong>. Common sources include:</p>
        <ul>
          <li>🚗 Vehicle emissions</li>
          <li>🏭 Industrial activities</li>
          <li>🔥 Biomass burning</li>
          <li>🏗️ Construction dust</li>
        </ul>
        <p>Check the "Pollution Source" section for detailed information!</p>`;
    }

    // Health questions
    if (Chatbot.knowledgeBase.healthPatterns.test(q)) {
      if (aqi > 150) {
        return `<p>⚠️ At AQI ${aqi}, health effects include:</p>
          <ul>
            <li>Respiratory irritation</li>
            <li>Reduced lung function</li>
            <li>Aggravated asthma</li>
            <li>Increased risk of heart problems</li>
          </ul>
          <p>Symptoms: coughing, shortness of breath, chest tightness. Seek medical help if severe.</p>`;
      } else {
        return `<p>At current AQI levels (${aqi}), health risks are ${aqi > 100 ? 'moderate' : 'minimal'}.</p>
          <p>Stay hydrated, monitor air quality, and follow recommendations in the Health Advisory section.</p>`;
      }
    }

    // Mask questions
    if (Chatbot.knowledgeBase.maskPatterns.test(q)) {
      if (aqi > 150) {
        return `<p>😷 <strong>Yes, wear a mask!</strong> At AQI ${aqi}, I recommend:</p>
          <ul>
            <li><strong>N95 or KN95 mask</strong> - Filters 95% of particles</li>
            <li>Ensure proper fit with no gaps</li>
            <li>Replace after 40 hours of use</li>
          </ul>
          <p>Regular cloth masks are NOT effective for air pollution.</p>`;
      } else if (aqi > 100) {
        return `<p>At AQI ${aqi}, masks are optional but recommended for:</p>
          <ul>
            <li>Children and elderly</li>
            <li>People with respiratory conditions</li>
            <li>Those exercising outdoors</li>
          </ul>
          <p>N95/KN95 masks provide best protection.</p>`;
      } else {
        return `<p>✅ No mask needed at current AQI levels (${aqi}).</p><p>Air quality is acceptable for most people.</p>`;
      }
    }

    // Prediction questions
    if (Chatbot.knowledgeBase.predictionPatterns.test(q)) {
      return `<p>📊 Check the <strong>30-Day Forecast</strong> section for detailed predictions!</p>
        <p>Our AI model uses linear regression to forecast AQI trends based on historical data.</p>
        <p>Predictions include:</p>
        <ul>
          <li>Daily AQI forecasts</li>
          <li>Dangerous days alerts</li>
          <li>Weekly trends</li>
        </ul>`;
    }

    // Tips questions
    if (Chatbot.knowledgeBase.tipsPatterns.test(q)) {
      return `<p>🌱 Ways to reduce air pollution exposure:</p>
        <ul>
          <li><strong>Indoors:</strong> Use HEPA air purifiers, keep windows closed on high pollution days</li>
          <li><strong>Outdoors:</strong> Avoid peak traffic hours, exercise in parks away from roads</li>
          <li><strong>Travel:</strong> Use public transport, carpool, or bike on low-pollution days</li>
          <li><strong>Plants:</strong> Add air-purifying plants (see recommendations)</li>
          <li><strong>Monitor:</strong> Check AQI daily and plan activities accordingly</li>
        </ul>`;
    }

    // Default response
    return `<p>I can help you with:</p>
      <ul>
        <li>🌡️ <strong>"Is it safe to go outside?"</strong> - Safety advice</li>
        <li>🌿 <strong>"Which plants reduce pollution?"</strong> - Plant recommendations</li>
        <li>🤔 <strong>"Why is AQI high?"</strong> - Pollution sources</li>
        <li>😷 <strong>"Should I wear a mask?"</strong> - Protection advice</li>
        <li>📈 <strong>"What will air quality be tomorrow?"</strong> - Forecasts</li>
        <li>💡 <strong>"How can I reduce pollution?"</strong> - Tips & solutions</li>
      </ul>
      <p>Current AQI in ${Chatbot.currentCity}: <strong>${aqi}</strong> (${category.category})</p>`;
  }
};
