# Autofetch System - Code Flow & Examples

## How a City Gets Added to Autofetch

### Flow Diagram
```
User searches for city
    ↓
API receives request: GET /api/aqi/:city
    ↓
getCurrentAQI() controller function
    ↓
waqiService.fetchCurrentAQI(city) → Get live AQI from WAQI
    ↓
WatchedCity.findOrCreateFromAQI(aqiData) [NON-BLOCKING]
    ├─ If city exists in WatchedCity collection:
    │  ├─ usageCount++
    │  ├─ lastAccessed = now
    │  └─ Save to database
    │
    └─ If city doesn't exist:
       ├─ Create new WatchedCity document
       ├─ usageCount = 1
       ├─ autoFetchEnabled = true
       ├─ source = 'user_search'
       └─ Save to database
    ↓
Return AQI response to user
    ↓
(Meanwhile) Background: City now in autofetch list
    ↓
Next midnight UTC: Cron job includes this city in autofetch
    ↓
City's AQI collected and stored daily
```

## Code Examples

### Example 1: User Searches for New City

**Frontend Request:**
```javascript
// User searches for "Bangkok"
fetch('/api/aqi/bangkok')
  .then(res => res.json())
  .then(data => displayAQI(data));
```

**Backend Processing:**
```javascript
// aqiController.js - getCurrentAQI()
const aqiData = await waqiService.fetchCurrentAQI('bangkok');
// Returns: {
//   city: 'Bangkok',
//   aqi: 75,
//   country: 'Thailand',
//   latitude: 13.7563,
//   longitude: 100.5018,
//   ...
// }

// Non-blocking city registration
WatchedCity.findOrCreateFromAQI(aqiData);
// This is NOT awaited - doesn't delay API response

return res.json({
  success: true,
  data: { ...aqiData, category, healthRecommendations }
});
```

**Database Result:**
```javascript
// New document created in watchedcities collection
{
  _id: ObjectId("..."),
  city: "bangkok",
  country: "Thailand",
  latitude: 13.7563,
  longitude: 100.5018,
  usageCount: 1,
  lastAccessed: ISODate("2026-04-10T10:30:00Z"),
  dateAdded: ISODate("2026-04-10T10:30:00Z"),
  isActive: true,
  autoFetchEnabled: true,
  source: "user_search",
  lastFetchedAt: null,
  fetchFailureCount: 0,
  fetchFrequency: "daily",
  createdAt: ISODate("2026-04-10T10:30:00Z"),
  updatedAt: ISODate("2026-04-10T10:30:00Z")
}
```

### Example 2: User Searches Same City Again

**Frontend Request:** (same as before)
```javascript
fetch('/api/aqi/bangkok')
```

**Backend Processing:**
```javascript
const aqiData = await waqiService.fetchCurrentAQI('bangkok');

// In WatchedCity.findOrCreateFromAQI():
const cityNormalized = 'bangkok'; // lowercase & trimmed
let watchedCity = await this.findOne({ city: cityNormalized });

if (watchedCity) {  // ← FOUND (this is the second search)
  watchedCity.usageCount += 1;  // 1 + 1 = 2
  watchedCity.lastAccessed = new Date();
  await watchedCity.save();
}
```

**Database Result:**
```javascript
// Same document, updated
{
  city: "bangkok",
  usageCount: 2,  // ← INCREMENTED
  lastAccessed: ISODate("2026-04-10T14:45:00Z"),  // ← UPDATED
  ...
}
```

### Example 3: Cron Job - Daily Autofetch

**Trigger:** Every day at midnight UTC

**Execution:**
```javascript
// cron/collectAQI.js

async function collectAQI() {
  // Step 1: Get DEFAULT_CITIES from env
  const defaultCities = ['New York', 'London', 'Beijing', ...];
  
  // Step 2: Get WATCHED_CITIES from database
  const watchedCities = await WatchedCity.find({
    isActive: true,
    autoFetchEnabled: true
  }).sort({ usageCount: -1 });  // Prioritize by usage
  
  // Result from database:
  // [{city: 'bangkok', usageCount: 2}, 
  //  {city: 'tokyo', usageCount: 1},
  //  {city: 'paris', usageCount: 1}]
  
  // Step 3: Combine and remove duplicates
  const allCities = [...new Set([...watchedCityNames, ...defaultCities])];
  // Result: Bangkok, Tokyo, Paris + 10 default cities = 13 total
  
  // Step 4: Fetch each city's AQI
  for (const city of allCities) {
    try {
      const aqiData = await waqiService.fetchCurrentAQI(city);
      
      // Store in AQIHistory
      await AQIHistory.findOneAndUpdate(
        { city, date: { $gte: today } },
        { $set: { aqi, pollutants, ... } },
        { upsert: true }
      );
      
      // Update WatchedCity fetch status
      const watchedCityRecord = await WatchedCity.findOne({ 
        city: city.toLowerCase() 
      });
      if (watchedCityRecord) {
        await watchedCityRecord.recordFetch(true);
        // Sets: lastFetchedAt = now, fetchFailureCount = 0
      }
    } catch (error) {
      // On error, record the failure
      if (watchedCityRecord) {
        await watchedCityRecord.recordFetch(false);
        // Increments: fetchFailureCount++
      }
    }
  }
}
```

**Console Output:**
```
🔄 Starting daily AQI collection...
📍 Default cities: 10
📍 Watched cities (auto-fetch): 3
📍 Total unique cities: 13

📡 Fetching AQI for: Bangkok
✅ Updated AQI data for bangkok: 75

📡 Fetching AQI for: Tokyo
✅ Updated AQI data for tokyo: 58

📡 Fetching AQI for: Paris
✅ Updated AQI data for paris: 42

[... 10 default cities ...]

📊 Daily AQI Collection Summary
✅ Successful: 13
❌ Failed: 0
📅 Date: 4/10/2026
⏰ Completed at: 12:00:15 AM
```

**Database Result:**
```javascript
// AQIHistory updated with latest data
db.aqi_histories.findOne({city: "bangkok", date: {$gte: today}})
// Returns:
{
  city: "bangkok",
  aqi: 75,
  category: "Moderate",
  date: ISODate("2026-04-10T00:00:00Z"),
  lastUpdated: ISODate("2026-04-10T00:00:16Z"),
  source: "WAQI"
}

// WatchedCity updated with fetch status
db.watchedcities.findOne({city: "bangkok"})
// Returns:
{
  city: "bangkok",
  usageCount: 2,
  lastFetchedAt: ISODate("2026-04-10T00:00:16Z"),  // ← UPDATED
  fetchFailureCount: 0,
  ...
}
```

### Example 4: User Opens Site Next Morning

**Frontend Request:**
```javascript
// User opens app next morning and searches for Bangkok
fetch('/api/aqi/bangkok')
```

**Backend Processing:**
```javascript
// Could fetch from WAQI API again (fresh data)
const aqiData = await waqiService.fetchCurrentAQI('bangkok');

// OR can serve cached data from AQIHistory (faster)
const historicalData = await AQIHistory.findOne({
  city: 'bangkok',
  date: { $gte: today }
});

return res.json({
  success: true,
  data: {
    ...historicalData,  // Yesterday's data, collected by cron
    ...  
  }
});
```

**Result:**
```json
{
  "success": true,
  "data": {
    "city": "Bangkok",
    "aqi": 75,
    "category": "Moderate",
    "lastUpdated": "2026-04-10T00:00:16Z",
    "source": "WAQI"
  },
  "timestamp": "2026-04-10T..."
}
```

**Key Benefit:** User gets data instantly - no delay waiting for API!

## API Endpoint Code Examples

### Get All Watched Cities with Most Used First

**Request:**
```bash
curl http://localhost:5000/api/aqi/watched-cities/list?sort=-usageCount&activeOnly=true
```

**Controller Code:**
```javascript
exports.getWatchedCities = async (req, res) => {
  const { activeOnly = true, sort = '-usageCount' } = req.query;
  const query = { isActive: true };
  
  const watchedCities = await WatchedCity.find(query)
    .sort(sort)
    .select('-__v')
    .lean();
  
  res.json({
    success: true,
    count: watchedCities.length,
    cities: watchedCities
  });
};
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "cities": [
    {
      "city": "bangkok",
      "usageCount": 2,
      "lastAccessed": "2026-04-10T14:45:00Z",
      ...
    },
    {
      "city": "tokyo",
      "usageCount": 1,
      "lastAccessed": "2026-04-10T11:30:00Z",
      ...
    },
    {
      "city": "paris",
      "usageCount": 1,
      "lastAccessed": "2026-04-10T09:15:00Z",
      ...
    }
  ]
}
```

### Disable Autofetch for a Specific City

**Request:**
```bash
curl -X PATCH http://localhost:5000/api/aqi/watched-cities/bangkok/toggle
```

**Controller Code:**
```javascript
exports.toggleWatchedCity = async (req, res) => {
  const { city } = req.params;
  
  const watchedCity = await WatchedCity.findOne({ 
    city: city.toLowerCase().trim() 
  });
  
  if (!watchedCity) {
    return res.status(404).json({ 
      error: `City "${city}" not found` 
    });
  }
  
  watchedCity.autoFetchEnabled = !watchedCity.autoFetchEnabled;
  await watchedCity.save();
  
  res.json({
    success: true,
    message: `Autofetch ${watchedCity.autoFetchEnabled ? 'enabled' : 'disabled'} for ${city}`,
    data: watchedCity
  });
};
```

**Response:**
```json
{
  "success": true,
  "message": "Autofetch disabled for bangkok",
  "data": {
    "city": "bangkok",
    "autoFetchEnabled": false,
    "usageCount": 2,
    ...
  }
}
```

**Effect:** Bangkok won't be fetched in tomorrow's cron job

## Complete Lifecycle Example

```
Day 1, 2:30 PM:
  User searches "Bangkok"
  → WatchedCity created: {city: bangkok, usageCount: 1}
  
Day 1, 3:00 PM:
  User searches "Bangkok" again
  → WatchedCity updated: {usageCount: 2}
  
Day 1, 4:00 PM:
  User searches "Tokyo"
  → WatchedCity created: {city: tokyo, usageCount: 1}
  
Day 1, 4:30 PM:
  User disables Bangkok autofetch
  → WatchedCity updated: {autoFetchEnabled: false}
  
Day 2, Midnight:
  Cron job runs
  → Gets WatchedCities: [{city: tokyo, autoFetchEnabled: true}]
  → Gets DefaultCities: [New York, London, Beijing, ...]
  → Fetches both
  → Bangkok NOT fetched (autoFetchEnabled = false)
  → AQIHistory updated with data
  
Day 2, 8:00 AM:
  User opens website, searches Tokyo
  → Gets yesterday's AQI from AQIHistory (instant!)
  → Tokyo's usageCount incremented to 2
  
Day 2, 10:00 AM:
  User re-enables Bangkok autofetch
  → WatchedCity updated: {autoFetchEnabled: true}
  
Day 3, Midnight:
  Cron job runs
  → Bangkok is now fetched again (usageCount: 2, but highest priority among watched)
  → Tokyo fetched (usageCount: 2)
```

## Database Query Examples

### Find top 5 most searched cities
```javascript
db.watchedcities.find({isActive: true})
  .sort({usageCount: -1})
  .limit(5)
```

### Find cities not fetched in last 7 days
```javascript
const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
db.watchedcities.find({lastFetchedAt: {$lt: oneWeekAgo}})
```

### Find cities with fetch failures
```javascript
db.watchedcities.find({fetchFailureCount: {$gt: 0}})
```

### Clean up inactive cities older than 30 days
```javascript
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
db.watchedcities.deleteMany({
  isActive: false,
  updatedAt: {$lt: thirtyDaysAgo}
})
```

## Performance Considerations

### Database Indexes
```javascript
// In WatchedCity schema:
WatchedCitySchema.index({ city: 1, isActive: 1 });
WatchedCitySchema.index({ autoFetchEnabled: 1, isActive: 1 });
WatchedCitySchema.index({ lastAccessed: -1 });
```

These ensure:
- Fast lookup when registering cities
- Fast filtering for cron job
- Fast sorting by last accessed

### API Rate Limiting
```javascript
// In collectAQI.js:
// Rate limiting - wait 1 second between requests
await new Promise(resolve => setTimeout(resolve, 1000));
```

Prevents hitting WAQI API rate limits (typically 1000 req/day)

## Summary

The autofetch system achieves the user's goal by:
1. **Automatically registering** cities when users search
2. **Tracking usage** to prioritize popular cities
3. **Daily collection** of AQI for all watched cities
4. **Caching** so users get instant data
5. **User control** to enable/disable specific cities

All without requiring users to do anything special!
