# Autofetch Integration - AQIHistory Model (Refactored)

## ✅ Changes Completed

Your autofetch system now uses your existing **AQIHistory model** instead of a separate WatchedCities collection. This solves the data clashing issue while preserving all historical AQI data.

## What Changed

### 1. ✅ Enhanced AQIHistory Model
**File:** `aqi-backend/models/AQIHistory.js`

Added autofetch fields to your existing model:
```javascript
{
  // ... existing fields (city, aqi, date, etc.) ...
  
  // NEW AutoFetch fields (on latest record per city)
  isWatched: Boolean,           // Whether city was accessed
  usageCount: Number,           // How many times accessed
  lastAccessed: Date,           // When user last searched
  autoFetchEnabled: Boolean,    // Include in daily autofetch
  fetchFailureCount: Number     // Track failed fetches
}
```

**Key Point:** These fields are stored on the latest AQIHistory record for each city. Historical data (previous days) remains unchanged and intact.

**New Methods Added:**
- `AQIHistory.recordCityAccess(city)` - Track when user searches
- `AQIHistory.getWatchedCities(activeOnly)` - Get all watched cities
- `AQIHistory.toggleAutoFetch(city, enabled)` - Enable/disable autofetch
- `AQIHistory.recordFetchAttempt(city, success)` - Track fetch success/failure

### 2. ✅ Updated Controllers
**File:** `aqi-backend/controllers/aqiController.js`

- Removed: `WatchedCity` import
- Change: Uses `AQIHistory.recordCityAccess()` instead of `WatchedCity.findOrCreateFromAQI()`
- All endpoints updated to query AQIHistory

### 3. ✅ Updated Cron Job
**File:** `aqi-backend/cron/collectAQI.js`

- Removed: `WatchedCity` import
- Change: Uses `AQIHistory.getWatchedCities()` to get watched cities
- Change: Uses `AQIHistory.recordFetchAttempt()` to track fetch status

### 4. ✅ Removed Duplicate
**File:** `aqi-backend/models/WatchedCity.js`

This file is no longer needed. You can delete it:
```bash
rm aqi-backend/models/WatchedCity.js
```

## Benefits of This Approach

✅ **No Data Clashing** - Historical AQI stays separate from autofetch metadata  
✅ **Single Model** - Everything in one place (AQIHistory)  
✅ **Simpler Structure** - Less database clutter  
✅ **Historical Data Protected** - All previous daily records completely untouched  
✅ **Efficient** - One record per city per day (as before)  

## How It Works Now

### Storage Structure
```
AQIHistory Collection:
{
  _id: ...,
  city: "Bangkok",
  date: 2026-04-08,
  aqi: 72,
  ... (all historical fields)
  isWatched: false,
  usageCount: 0,
  autoFetchEnabled: false
}  ← April 8 (untouched, historical only)

{
  _id: ...,
  city: "Bangkok",
  date: 2026-04-09,
  aqi: 75,
  ... (all historical fields)
  isWatched: false,
  usageCount: 0,
  autoFetchEnabled: false
}  ← April 9 (untouched, historical only)

{
  _id: ...,
  city: "Bangkok",
  date: 2026-04-10,
  aqi: 73,
  ... (all historical fields)
  isWatched: true,           ← LATEST: Has autofetch tracking
  usageCount: 2,
  lastAccessed: 2026-04-10 14:45,
  autoFetchEnabled: true,
  fetchFailureCount: 0
}  ← April 10 (TODAY: autofetch metadata tracked here)
```

### Flow

```
User searches Bangkok
    ↓
AQIHistory.recordCityAccess('bangkok')
    ↓
Finds latest record for Bangkok
    ↓
Updates: isWatched=true, usageCount++, lastAccessed=now
    ↓
All historical records (Apr 8, 9, etc.) UNTOUCHED
    ↓
Only APR 10's record has autofetch metadata
```

## Database Query Examples

Get all watched cities for autofetch:
```javascript
const watchedCities = await AQIHistory.getWatchedCities(true);
// Returns [{city: 'bangkok', usageCount: 2, ...}]
```

Get historical data (completely separate):
```javascript
const historicalData = await AQIHistory.find({
  city: 'bangkok',
  date: { $lt: today }  // Past dates
});
// Returns array of previous days' data, unaffected
```

Get today's autofetch status:
```javascript
const todayRecord = await AQIHistory.findOne({
  city: 'bangkok',
  date: { $gte: today }
});
console.log(todayRecord.usageCount); // 2
console.log(todayRecord.autoFetchEnabled); // true
```

## API Endpoints (Unchanged)

All endpoints work exactly the same from user perspective:

```
GET /api/aqi/watched-cities/list
GET /api/aqi/watched-cities/statistics
POST /api/aqi/watched-cities/add
DELETE /api/aqi/watched-cities/:city
PATCH /api/aqi/watched-cities/:city/toggle
```

But now they query AQIHistory instead of WatchedCities.

## Migration Notes

✅ **Backward Compatible** - Existing AQI data completely protected  
✅ **No Data Loss** - All historical records remain  
✅ **Smooth Transition** - Just drop the changes and test  

## What to Delete

```bash
# Optional: Remove the now-unused WatchedCity model
rm aqi-backend/models/WatchedCity.js
```

The model file is no longer imported or used anywhere.

## Testing

The system works exactly the same from an API perspective:

```bash
# Search for a city (auto-registered for autofetch)
curl http://localhost:5000/api/aqi/bangkok

# Check watched cities
curl http://localhost:5000/api/aqi/watched-cities/list

# Get statistics
curl http://localhost:5000/api/aqi/watched-cities/statistics

# Manual add
curl -X POST http://localhost:5000/api/aqi/watched-cities/add \
  -H "Content-Type: application/json" \
  -d '{"city":"Singapore","latitude":1.35,"longitude":103.82}'

# Toggle autofetch
curl -X PATCH http://localhost:5000/api/aqi/watched-cities/bangkok/toggle
```

## Summary

**Before:** Separate WatchedCities collection → Data clashing  
**Now:** Autofetch fields in AQIHistory → Clean, integrated, safe

Your historical AQI data stays exactly as it is, and autofetch metadata is added to the latest records without any interference! ✅
