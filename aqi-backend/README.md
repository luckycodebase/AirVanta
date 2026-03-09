# airvanta - Backend API

Complete Node.js + Express backend for airvanta Environmental Monitoring Dashboard. Provides real-time air quality data, historical pollution tracking, machine learning-based predictions, plant recommendations, and exposure risk calculations.

## 🌟 Features

- 📡 **Real-time AQI Data** - Fetch current air quality from WAQI API
- 📊 **Historical Pollution Data** - Track pollution trends from Open-Meteo API
- 🔮 **30-Day Predictions** - Linear regression machine learning forecasts
- 🌱 **Plant Recommendations** - Air-purifying plants database with filtering
- ⚠️ **Exposure Risk Calculator** - Personalized health risk assessment
- 📅 **Daily Data Collection** - Automated cron job for data aggregation
- 💾 **MongoDB Storage** - Persistent historical data storage

## 🛠️ Tech Stack

- **Runtime**: Node.js (v16+)
- **Framework**: Express.js
- **Database**: MongoDB Atlas
- **Scheduler**: node-cron
- **HTTP Client**: axios
- **ODM**: Mongoose

## 📁 Project Structure

```
aqi-backend/
├── config/
│   └── db.js                 # MongoDB connection
├── controllers/
│   ├── aqiController.js      # AQI request handlers
│   ├── plantController.js    # Plant recommendation handlers
│   ├── predictionController.js # Prediction handlers
│   └── exposureRiskController.js # Risk calculation handlers
├── cron/
│   └── collectAQI.js         # Daily data collection job
├── models/
│   ├── AQIHistory.js         # AQI data schema
│   └── Plant.js              # Plant data schema
├── routes/
│   ├── aqiRoutes.js          # AQI endpoints
│   ├── plantRoutes.js        # Plant endpoints
│   ├── predictionRoutes.js   # Prediction endpoints
│   └── exposureRiskRoutes.js # Risk endpoints
├── scripts/
│   └── seedPlants.js         # Database seeding script
├── services/
│   ├── waqiService.js        # WAQI API integration
│   ├── openMeteoService.js   # Open-Meteo API integration
│   └── predictionService.js  # Linear regression ML
├── .env.example              # Environment template
├── package.json              # Dependencies
└── server.js                 # Application entry point
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- MongoDB Atlas account (free tier works)
- WAQI API key ([Register here](https://aqicn.org/data-platform/token/))

### Installation

1. **Clone and Navigate**
   ```bash
   cd server
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your credentials:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=your_mongodb_connection_string
   WAQI_API_KEY=your_waqi_api_key
   OPEN_METEO_BASE_URL=https://air-quality-api.open-meteo.com/v1
   WAQI_BASE_URL=https://api.waqi.info
   DEFAULT_CITIES=New York,London,Beijing,Delhi,Tokyo,Mumbai,Los Angeles,Paris,Sydney,São Paulo
   CACHE_TTL=300
   PREDICTION_DAYS=30
   MIN_HISTORICAL_DAYS=15
   ```

4. **Seed Plant Database**
   ```bash
   npm run seed
   ```

5. **Start Server**
   ```bash
   # Production
   npm start

   # Development (with auto-reload)
   npm run dev
   ```

Server runs on `http://localhost:5000`

## 📡 API Endpoints

### AQI Endpoints

#### Get Current AQI
```http
GET /api/aqi/:city
```
**Example**: `/api/aqi/New York`

**Response**:
```json
{
  "success": true,
  "data": {
    "aqi": 45,
    "city": "New York",
    "country": "USA",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "timestamp": "2024-01-15T10:30:00Z",
    "pollutants": {
      "pm25": 12.5,
      "pm10": 18.3,
      "o3": 45.2,
      "no2": 28.1
    },
    "dominantPollutant": "PM2.5",
    "category": "Good",
    "healthRecommendations": [...]
  }
}
```

#### Get AQI by Coordinates
```http
GET /api/aqi/coordinates/:lat/:lon
```
**Example**: `/api/aqi/coordinates/40.7128/-74.0060`

#### Get Historical AQI
```http
GET /api/aqi/history/:city?days=30
```
**Query Parameters**:
- `days` (optional): Number of days (default: 30)

#### Get AQI Statistics
```http
GET /api/aqi/statistics/:city?days=30
```

### Prediction Endpoints

#### Generate Predictions
```http
GET /api/prediction/:city?days=30
```
**Example**: `/api/prediction/Beijing?days=30`

**Response**:
```json
{
  "success": true,
  "city": "Beijing",
  "predictions": [
    {
      "date": "2024-01-16",
      "aqi": 125,
      "confidence": "High",
      "category": "Unhealthy for Sensitive Groups",
      "isDangerous": false
    },
    ...
  ],
  "model": {
    "algorithm": "Linear Regression",
    "slope": 0.523,
    "intercept": 98.45,
    "r2": 0.762,
    "accuracy": "Good"
  }
}
```

#### Get Prediction Statistics
```http
GET /api/prediction/:city/stats?days=30
```

#### Get Dangerous Days
```http
GET /api/prediction/:city/dangerous-days?threshold=150
```

#### Compare Cities
```http
POST /api/prediction/compare
```
**Body**:
```json
{
  "cities": ["New York", "London", "Beijing"],
  "days": 30
}
```

### Plant Endpoints

#### Get Plant Recommendations
```http
GET /api/plants/recommend?pollutant=PM2.5&limit=5
```
**Query Parameters**:
- `pollutant`: PM2.5, PM10, CO2, Benzene, Formaldehyde, etc.
- `limit` (optional): Max results (default: 5)

**Response**:
```json
{
  "success": true,
  "pollutant": "PM2.5",
  "recommendations": [
    {
      "plantName": "Peace Lily",
      "scientificName": "Spathiphyllum",
      "efficiency": 10,
      "pollutantsReduced": ["Ammonia", "Benzene", "Formaldehyde"],
      "careDifficulty": "Easy",
      "compatibility": {
        "petSafe": false,
        "childSafe": false
      },
      "recommendationScore": 92
    },
    ...
  ]
}
```

#### Get All Plants
```http
GET /api/plants?sort=recommendationScore&order=desc&limit=20
```

#### Get Top Plants
```http
GET /api/plants/top?limit=10
```

#### Get Pet-Safe Plants
```http
GET /api/plants/pet-safe?limit=20
```

#### Search Plants
```http
GET /api/plants/search?q=spider&limit=20
```

#### Filter Plants
```http
POST /api/plants/filter
```
**Body**:
```json
{
  "pollutants": ["PM2.5", "Formaldehyde"],
  "careDifficulty": "Easy",
  "petSafe": true,
  "minEfficiency": 7,
  "limit": 10
}
```

### Exposure Risk Endpoints

#### Calculate Exposure Risk
```http
POST /api/exposure-risk
```
**Body**:
```json
{
  "aqi": 150,
  "exposureTime": 8,
  "dominantPollutant": "PM2.5",
  "age": 30,
  "hasRespiratoryConditions": false,
  "hasHeartConditions": false,
  "isPregnant": false,
  "activityLevel": "moderate"
}
```

**Response**:
```json
{
  "success": true,
  "exposureAnalysis": {
    "totalRiskScore": 65,
    "riskLevel": "High",
    "riskCategory": "Unhealthy - Limit outdoor activities",
    "baseRisk": 45,
    "vulnerabilityFactor": 1.0,
    "activityMultiplier": 1.0
  },
  "safeExposureTime": {
    "hours": 4.5,
    "exceeded": true
  },
  "healthImpact": {
    "respiratory": "Moderate - May experience irritation",
    "cardiovascular": "Moderate - Possible cardiovascular stress",
    "overall": "Significant health effects possible"
  },
  "recommendations": [...]
}
```

#### Get City Risk Assessment
```http
GET /api/exposure-risk/:city?exposureTime=8
```

## 🤖 Machine Learning

### Linear Regression Model

The prediction service implements linear regression for 30-day AQI forecasting:

**Formulas**:
- **Slope**: `(n*Σxy - Σx*Σy) / (n*Σx² - (Σx)²)`
- **Intercept**: `(Σy - slope*Σx) / n`
- **R² Score**: `1 - (SS_res / SS_tot)`

**Adjustments**:
- Weekend: -8 AQI
- Monday: +12 AQI (traffic surge)
- Weekday: +5 AQI
- Seasonal: `sin((dayOfYear/365)*2π)*10`
- Natural variation: ±5 random

**Confidence Calculation**:
- Based on R² score and days ahead
- Exponential decay: `confidence *= exp(-daysAhead / 30)`
- Levels: High (≥75%), Medium (≥50%), Low (≥25%), Very Low (<25%)

## 🗄️ Database Schemas

### AQIHistory Model
```javascript
{
  city: String,
  country: String,
  latitude: Number,
  longitude: Number,
  aqi: Number,
  pollutants: {
    pm25: Number,
    pm10: Number,
    o3: Number,
    no2: Number,
    so2: Number,
    co: Number
  },
  dominantPollutant: String,
  category: String,
  date: Date,
  source: String
}
```

### Plant Model
```javascript
{
  plantName: String,
  scientificName: String,
  pollutantsReduced: [String],
  efficiency: Number (1-10),
  careDifficulty: String,
  lightRequirement: String,
  waterRequirement: String,
  size: String,
  compatibility: {
    petSafe: Boolean,
    childSafe: Boolean
  },
  recommendationScore: Number
}
```

## ⏰ Cron Jobs

### Daily AQI Collection
Runs daily at midnight UTC to collect AQI data for monitored cities.

**Manual Execution**:
```bash
# Run collection manually
npm run collect

# View collection statistics
npm run stats

# Cleanup old data (older than 365 days)
npm run cleanup
```

**Configuration**:
Edit `DEFAULT_CITIES` in `.env` to customize monitored cities.

## 🔧 Useful Commands

```bash
# Start server
npm start

# Development mode (auto-reload)
npm run dev

# Seed plant database
npm run seed

# Manual AQI collection
npm run collect

# View database statistics
npm run stats

# Cleanup old records
npm run cleanup
```

## 📊 API Response Codes

- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `404` - Not Found (no data available)
- `500` - Server Error

## 🌐 External APIs

### WAQI API
- **Endpoint**: `https://api.waqi.info`
- **Authentication**: API key required
- **Rate Limit**: 1000 requests/day (free tier)
- **Register**: https://aqicn.org/data-platform/token/

### Open-Meteo Air Quality API
- **Endpoint**: `https://air-quality-api.open-meteo.com/v1`
- **Authentication**: None required
- **Rate Limit**: None
- **Free**: Yes

## 🔒 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 5000 |
| `NODE_ENV` | Environment | No | development |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `WAQI_API_KEY` | WAQI API key | Yes | - |
| `OPEN_METEO_BASE_URL` | Open-Meteo base URL | No | https://air-quality-api.open-meteo.com/v1 |
| `WAQI_BASE_URL` | WAQI base URL | No | https://api.waqi.info |
| `DEFAULT_CITIES` | Cities for cron collection | No | See .env.example |
| `CACHE_TTL` | Cache duration (seconds) | No | 300 |
| `PREDICTION_DAYS` | Default prediction days | No | 30 |
| `MIN_HISTORICAL_DAYS` | Min data for predictions | No | 15 |

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Verify connection string in `.env`
- Check network access in MongoDB Atlas (whitelist IP)
- Ensure database user has read/write permissions

### WAQI API Errors
- Verify API key is correct
- Check rate limits (1000 requests/day)
- Ensure city name is spelled correctly

### No Historical Data
- Run initial data collection: `npm run collect`
- Wait 15+ days for meaningful predictions
- Check DATABASE logs for collection errors

### Prediction Errors
- Ensure minimum 15 days of historical data
- Check if city name matches database records
- Verify MongoDB connection

## 📝 License

MIT

## 👨‍💻 Author

AQI Environmental Intelligence Dashboard Backend

## 🙏 Acknowledgments

- WAQI (World Air Quality Index) Project
- Open-Meteo API
- NASA Clean Air Study
- EPA Air Quality Standards
