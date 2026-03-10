# AirVanta - Environmental Monitoring and AQI Intelligence Platform

![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js\&logoColor=white)
![Express](https://img.shields.io/badge/Framework-Express.js-000000?logo=express\&logoColor=white)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb\&logoColor=white)
![Chart.js](https://img.shields.io/badge/Charts-Chart.js-FF6384?logo=chartdotjs\&logoColor=white)
![Netlify](https://img.shields.io/badge/Frontend-Deployed%20on%20Netlify-00C7B7?logo=netlify\&logoColor=white)
![Render](https://img.shields.io/badge/Backend-Deployed%20on%20Render-46E3B7?logo=render\&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-blue)

AirVanta is a full-stack environmental intelligence web application that helps users understand current air quality, predict upcoming pollution risk, and take practical action through health guidance, exposure-risk scoring, and plant recommendations.

Link: https://airvanta.netlify.app/

## Recruiter Snapshot

- Built a production-style full-stack app with a modular frontend and REST API backend.
- Integrated third-party environmental data APIs and normalized responses for UI consumption.
- Implemented forecasting endpoints and risk-oriented UX (danger-day alerts, exposure analysis).
- Designed for real-world usability: location search, map interaction, mobile responsiveness, and dark mode.

## Key Capabilities

- Real-time AQI dashboard with pollutant cards (PM2.5, PM10, O3, NO2, CO, SO2)
- Interactive map using Leaflet markers for location-based AQI exploration
- 30-day prediction workflow with model metadata and confidence context
- Personal exposure-risk module based on time outdoors and current conditions
- AI chatbot assistant for contextual air-quality guidance
- Global city ranking and comparison views
- Plant recommendation engine with pollutant-oriented matching
- Dark mode and mobile-first responsive behavior

## Tech Stack

### Frontend
- HTML5
- CSS3 (custom responsive design system)
- Vanilla JavaScript (modular architecture)
- Chart.js
- Leaflet.js

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- Axios
- node-cron

### External Data Services
- WAQI API
- Open-Meteo API

## Project Architecture

```text
Website/
|- index.html
|- assets/
|  |- css/style.css
|  |- js/
|     |- api.js
|     |- dashboard.js
|     |- map.js
|     |- charts.js
|     |- prediction.js
|     |- plantRecommendation.js
|     |- advisor.js
|     |- exposureRisk.js
|     |- globalRanking.js
|     |- chatbot.js
|     |- main.js
|- aqi-backend/
|  |- server.js
|  |- controllers/
|  |- routes/
|  |- services/
|  |- models/
|  |- cron/
|  |- scripts/
```

## API Surface (Backend)

Representative endpoints:

- `GET /api/aqi/:city`
- `GET /api/aqi/coordinates/:lat/:lon`
- `GET /api/aqi/history/:city?days=30`
- `GET /api/prediction/:city?days=30`
- `GET /api/prediction/:city/stats?days=30`
- `GET /api/prediction/:city/dangerous-days?threshold=150`
- `GET /api/plants/recommend?pollutant=PM2.5&limit=5`
- `GET /api/plants/top?limit=10`
- `GET /api/exposure-risk/:city?duration=60`

## Getting Started

### 1) Frontend

1. Open `index.html` directly in a browser, or
2. Use a local static server (recommended for consistent behavior).

### 2) Backend

From `aqi-backend/`:

```bash
npm install
npm run seed
npm run dev
```

Server default: `http://localhost:5000`

### 3) Environment Variables

Create `.env` inside `aqi-backend/` with values for:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
WAQI_API_KEY=your_waqi_api_key
OPEN_METEO_BASE_URL=https://air-quality-api.open-meteo.com/v1
WAQI_BASE_URL=https://api.waqi.info
DEFAULT_CITIES=New York,London,Beijing,Delhi,Tokyo,Mumbai,Los Angeles,Paris,Sydney,Sao Paulo
CACHE_TTL=300
PREDICTION_DAYS=30
MIN_HISTORICAL_DAYS=15
```

## Engineering Highlights

- Separation of concerns across controllers, services, and route layers
- Reusable frontend modules with feature-based organization
- Graceful API behavior for partial-data scenarios (fallback-oriented responses)
- Scheduled data collection for historical AQI persistence and trend modeling
- User-centric UI decisions: clear AQI semantics, risk messaging, and actionable recommendations

## Why This Project Is Job-Relevant

This project demonstrates the skills expected in full-stack/product engineering roles:

- API integration and data transformation
- Backend endpoint design and reliability handling
- State-driven frontend UI updates
- Data visualization and interaction design
- Domain modeling with MongoDB/Mongoose
- Feature delivery across end-to-end user flows

## Suggested Resume Bullets

- Built a full-stack environmental intelligence dashboard using JavaScript, Node.js, Express, and MongoDB, delivering real-time AQI insights and predictive analytics.
- Developed modular REST APIs for AQI retrieval, forecasting, and exposure-risk assessment, with robust fallback handling for sparse historical datasets.
- Implemented interactive map and chart-driven UI experiences with Leaflet and Chart.js to improve interpretability of pollution trends.
- Engineered pollutant-aware recommendation features (health guidance and plant matching) to translate data into actionable user decisions.

## Roadmap

- Add authentication and user-specific watchlists
- Add exportable reports (CSV/PDF)
- Improve forecast model explainability and metrics surfacing
- Add CI pipeline and automated API tests
- Add deployment docs for cloud hosting

## License

MIT
