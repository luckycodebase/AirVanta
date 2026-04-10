# Testing the Autofetch System

## Prerequisites
- MongoDB running and connected
- AQI Backend server running
- WAQI API key configured
- Postman or curl for API testing

## Step 1: Verify Database

### Check if WatchedCity collection exists
```bash
# In MongoDB shell
use aqi_db  # or your database name
db.watchedcities.find({})
```

Expected output: Empty array initially (or existing watched cities)

## Step 2: Test Automatic City Registration

### Step 2.1: Search for a new city
```bash
curl http://localhost:5000/api/aqi/bangkok
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "city": "Bangkok",
    "aqi": 75,
    "category": "Moderate",
    ...
  },
  "timestamp": "2026-04-10T..."
}
```

### Step 2.2: Check WatchedCity collection
```bash
db.watchedcities.findOne({city: "bangkok"})
```

**Expected Output:**
```json
{
  "_id": ObjectId("..."),
  "city": "bangkok",
  "country": "Thailand",
  "latitude": 13.7563,
  "longitude": 100.5018,
  "usageCount": 1,
  "lastAccessed": ISODate("2026-04-10T..."),
  "isActive": true,
  "autoFetchEnabled": true,
  "source": "user_search",
  ...
}
```

✅ **SUCCESS**: City was automatically registered!

## Step 3: Test Usage Tracking

### Step 3.1: Search for the same city again
```bash
curl http://localhost:5000/api/aqi/bangkok
```

### Step 3.2: Verify usageCount incremented
```bash
db.watchedcities.findOne({city: "bangkok"})
```

**Expected:** `"usageCount": 2`

✅ **SUCCESS**: Usage tracking works!

## Step 4: Test Watched Cities Management

### Step 4.1: Get all watched cities
```bash
curl http://localhost:5000/api/aqi/watched-cities/list
```

**Expected Response:**
```json
{
  "success": true,
  "count": 1,
  "cities": [
    {
      "city": "bangkok",
      "country": "Thailand",
      "usageCount": 2,
      "lastAccessed": "2026-04-10T...",
      "autoFetchEnabled": true
    }
  ]
}
```

✅ **SUCCESS**: List endpoint works!

### Step 4.2: Get statistics
```bash
curl http://localhost:5000/api/aqi/watched-cities/statistics
```

**Expected Response:**
```json
{
  "success": true,
  "statistics": {
    "totalWatchedCities": 1,
    "activeWatchedCities": 1,
    "inactiveCities": 0,
    "topSearchedCities": [
      {
        "city": "bangkok",
        "usageCount": 2,
        "country": "Thailand"
      }
    ]
  }
}
```

✅ **SUCCESS**: Statistics endpoint works!

## Step 5: Test Coordinates Lookup

### Step 5.1: Search by coordinates (new city)
```bash
# Tokyo: 35.6762, 139.6503
curl http://localhost:5000/api/aqi/coordinates/35.6762/139.6503
```

### Step 5.2: Verify Tokyo was registered
```bash
curl http://localhost:5000/api/aqi/watched-cities/list
```

**Expected:** Tokyo should appear in the list

✅ **SUCCESS**: Coordinate-based registration works!

## Step 6: Test Manual City Addition

### Step 6.1: Add a city manually
```bash
curl -X POST http://localhost:5000/api/aqi/watched-cities/add \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Sydney",
    "country": "Australia",
    "latitude": -33.8688,
    "longitude": 151.2093
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Sydney added to watched cities for autofetch",
  "data": {
    "city": "sydney",
    "country": "Australia",
    "usageCount": 1,
    "source": "manual_add",
    "autoFetchEnabled": true
  }
}
```

✅ **SUCCESS**: Manual addition works!

## Step 7: Test Toggle Autofetch

### Step 7.1: Disable autofetch for Bangkok
```bash
curl -X PATCH http://localhost:5000/api/aqi/watched-cities/bangkok/toggle
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Autofetch disabled for bangkok",
  "data": {
    "city": "bangkok",
    "autoFetchEnabled": false
  }
}
```

### Step 7.2: Re-enable autofetch
```bash
curl -X PATCH http://localhost:5000/api/aqi/watched-cities/bangkok/toggle
```

**Expected:** `"autoFetchEnabled": true`

✅ **SUCCESS**: Toggle works!

## Step 8: Test City Removal

### Step 8.1: Remove a city
```bash
curl -X DELETE http://localhost:5000/api/aqi/watched-cities/bangkok
```

**Expected Response:**
```json
{
  "success": true,
  "message": "bangkok removed from watched cities",
  "data": {
    "city": "bangkok",
    "isActive": false,
    "autoFetchEnabled": false
  }
}
```

### Step 8.2: Verify in list (should still show but inactive)
```bash
curl http://localhost:5000/api/aqi/watched-cities/list?activeOnly=false
```

✅ **SUCCESS**: Removal works!

## Step 9: Test Cron Job

### Step 9.1: Manually trigger cron job (for testing)
In your node shell:
```javascript
const { collectAQI } = require('./aqi-backend/cron/collectAQI');
const connectDB = require('./aqi-backend/config/db');

connectDB();
setTimeout(() => collectAQI(), 1000);
```

### Step 9.2: Check logs
Expected output:
```
🔄 Starting daily AQI collection...
📍 Default cities: 10
📍 Watched cities (auto-fetch): 3
📍 Total unique cities: 13

📡 Fetching AQI for: New York
✅ Updated AQI data for new york: 52

📡 Fetching AQI for: tokyo
✅ Updated AQI data for tokyo: 45

📡 Fetching AQI for: sydney
✅ Updated AQI data for sydney: 38

📊 Daily AQI Collection Summary
==========================================
✅ Successful: 13
❌ Failed: 0
```

### Step 9.3: Verify data stored
```bash
db.aqi_histories.findOne({city: "tokyo"}, {sort: {date: -1}})
```

**Expected:** Fresh data field with today's date

✅ **SUCCESS**: Cron job works!

## Step 10: Performance Test

### Step 10.1: Add multiple cities
```bash
for city in Amsterdam Barcelona Rome Madrid Vienna; do
  curl -X POST http://localhost:5000/api/aqi/watched-cities/add \
    -H "Content-Type: application/json" \
    -d "{\"city\": \"$city\", \"latitude\": 0, \"longitude\": 0}"
done
```

### Step 10.2: Get statistics
```bash
curl http://localhost:5000/api/aqi/watched-cities/statistics
```

### Step 10.3: Verify performance
- Response should still be fast (<100ms)
- Database queries should use indexes

✅ **SUCCESS**: Performance is good!

## Troubleshooting

### Issue: WatchedCity not created
**Possible Causes:**
- MongoDB connection not established
- WatchedCity model not imported in controller
- Non-blocking error in try-catch block

**Solution:**
```bash
# Check logs for errors
tail -f logs/server.log

# Verify connection
db.watchedcities.find({})
```

### Issue: Duplicate cities in autofetch
**Solution:**
```bash
# Check for duplicates
db.watchedcities.aggregate([
  {$group: {_id: "$city", count: {$sum: 1}}},
  {$match: {count: {$gt: 1}}}
])

# Remove duplicates (keep most recent)
db.watchedcities.deleteMany({
  city: "bangkok",
  usageCount: {$lt: 2}  # Adjust as needed
})
```

### Issue: Cron job not running
**Solution:**
```javascript
// Check if cron is scheduled in server.js
// Look for: cron.schedule('0 0 * * *', ...)

// Manually test collectAQI
require('dotenv').config();
const { collectAQI } = require('./cron/collectAQI');
const connectDB = require('./config/db');

connectDB();
collectAQI().then(result => {
  console.log('Result:', result);
  process.exit(0);
});
```

## Success Criteria Checklist

- [ ] Search for city → WatchedCity created with usageCount=1
- [ ] Search same city again → usageCount incremented to 2
- [ ] /watched-cities/list endpoint works
- [ ] /watched-cities/statistics shows correct data
- [ ] Manual add endpoint creates new city
- [ ] Coordinates lookup creates WatchedCity entry
- [ ] Toggle endpoint changes autoFetchEnabled
- [ ] Delete endpoint marks city inactive
- [ ] Cron job fetches both default and watched cities
- [ ] AQIHistory updated with correct data
- [ ] Query performance is acceptable

## Next: Frontend Integration

Once backend is tested, update frontend to:
1. Display total watched cities count
2. Show top searched cities
3. Allow users to manage watched cities
4. Display fetch status for each city

## Documentation References

- [Autofetch System Overview](QUICK_START_AUTOFETCH.md)
- [Implementation Summary](AUTOFETCH_IMPLEMENTATION.md)
- [API Endpoints](aqi-backend/controllers/aqiController.js)
- [Database Schema](aqi-backend/models/WatchedCity.js)
