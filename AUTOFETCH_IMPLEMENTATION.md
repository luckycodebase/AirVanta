# Autofetch City System - Implementation Summary

## Changes Made

### 1. New Database Model: WatchedCity
**File:** `aqi-backend/models/WatchedCity.js` (NEW)

- Tracks all cities that users have searched for
- Records usage patterns (usageCount, lastAccessed)
- Manages autofetch status per city
- Includes methods:
  - `recordAccess()`: Increment usage and update access time
  - `recordFetch()`: Update fetch status and failure count
  - `findOrCreateFromAQI()`: Automatically create or update watched city records

**Key Fields:**
- `city`: Unique city identifier (lowercase, trimmed)
- `autoFetchEnabled`: Controls whether city is included in daily autofetch
- `usageCount`: Tracks how many times city was accessed
- `lastAccessed`: When user last searched for this city
- `lastFetchedAt`: When AQI data was last collected
- `fetchFailureCount`: Tracks consecutive fetch failures

### 2. Enhanced AQI Controller
**File:** `aqi-backend/controllers/aqiController.js` (MODIFIED)

**Added Imports:**
```javascript
const WatchedCity = require('../models/WatchedCity');
```

**Modified Functions:**
1. `getCurrentAQI()` - Now registers city when user searches
2. `getAQIByCoordinates()` - Now registers city when user uses coordinates
3. `storeAQI()` - Now registers city when user stores data

**New Endpoints:**
1. `getWatchedCities()` - Lists all watched cities with pagination
2. `addWatchedCity()` - Manually add a city to watched list
3. `removeWatchedCity()` - Mark city as inactive
4. `toggleWatchedCity()` - Toggle autofetch on/off for a city
5. `getWatchedCitiesStatistics()` - Get statistics and top searched cities

### 3. Updated Routes
**File:** `aqi-backend/routes/aqiRoutes.js` (MODIFIED)

**Route Order Changes:**
- Moved specific routes before generic `/:city` route to prevent route conflicts
- Added new watched city management routes:
  - `GET /api/aqi/watched-cities/list`
  - `GET /api/aqi/watched-cities/statistics`
  - `POST /api/aqi/watched-cities/add`
  - `DELETE /api/aqi/watched-cities/:city`
  - `PATCH /api/aqi/watched-cities/:city/toggle`

### 4. Enhanced Cron Job
**File:** `aqi-backend/cron/collectAQI.js` (MODIFIED)

**Key Changes:**
1. Added `WatchedCity` model import
2. Fetches watched cities from database
3. Combines watched cities with default cities
4. Prioritizes by usage count (frequently searched first)
5. Updates fetch status for each watched city
6. Enhanced logging showing breakdown:
   - Default cities count
   - Watched cities count
   - Total unique cities

**New Behavior:**
- Dynamically grows autofetch list as users search
- Removes duplicates between default and watched lists
- Records successful/failed fetches
- Stops fetching cities that are disabled

## User Workflow: How Cities Get Autofetched

### Automatic Registration Flow:
```
User searches for a city
        ↓
API endpoint called (getCurrentAQI, getAQIByCoordinates, storeAQI)
        ↓
WatchedCity.findOrCreateFromAQI() called
        ↓
City registered in WatchedCity collection
        ↓
If city already exists, usageCount++
        ↓
Daily cron job fetches all active watched cities
        ↓
AQI data stored in AQIHistory
```

### Benefits for Users:
- 🔄 **No manual setup**: Cities are registered automatically
- 📈 **Smart prioritization**: Most-searched cities get priority
- 🚫 **Control**: Users can disable/enable autofetch per city
- 📊 **Organic growth**: Watched list expands as users explore
- ⚡ **Fast access**: Data always available from cache

## Database Growth Expectations

- **Initial:** 10-15 default cities
- **After 1 week:** 15-20 watched cities (if people search new areas)
- **After 1 month:** 20-50 watched cities (depending on user base)
- **Mature state:** 100+ cities from diverse user searches

## API Examples

### Check Current Watched Cities:
```bash
curl http://localhost:5000/api/aqi/watched-cities/list
```

### Get Statistics:
```bash
curl http://localhost:5000/api/aqi/watched-cities/statistics
```

### Disable Autofetch for a City:
```bash
curl -X PATCH http://localhost:5000/api/aqi/watched-cities/paris/toggle
```

## Performance Considerations

### Database Indexes:
- `city`, `isActive`, `autoFetchEnabled` - for fast queries
- Compound indices on: `city + isActive`, `autoFetchEnabled + isActive`

### API Rate Limiting:
- 1 second delay between each WAQI API call (built-in)
- Prevents rate limiting issues

### Storage:
- WatchedCity records are minimal (~500 bytes each)
- 1000 cities = ~500 KB database overhead

## Configuration Options

### Change Default Cities:
Edit `.env`:
```env
DEFAULT_CITIES=New York,London,Beijing,Delhi,Tokyo,Mumbai
```

### Change Cron Schedule:
Edit `server.js`:
```javascript
// Default: 0 0 * * * (midnight UTC)
cron.schedule('0 */6 * * *', () => collectAQI()); // Every 6 hours
```

## Backward Compatibility

✅ All existing endpoints still work  
✅ Default cities still fetched daily  
✅ No breaking changes to API responses  
✅ AQIHistory model unchanged  

## Future Enhancements

- [ ] Weekly/custom fetch frequencies per city
- [ ] User-specific watched lists (authentication)
- [ ] Batch cleanup of failed cities
- [ ] Export watched cities as user preferences
- [ ] Email alerts for specific cities
- [ ] City recommendations based on patterns

## Testing Checklist

- [ ] Search for a new city → Check WatchedCity record created
- [ ] Search same city 3x → Check usageCount = 3
- [ ] Run collectAQI() → Check both default and watched cities fetched
- [ ] Disable autofetch → Check city skipped in next cron run
- [ ] Call /watched-cities/statistics → Verify top cities
- [ ] Check logs for priority ordering

## Files Modified:
1. ✅ Created: `aqi-backend/models/WatchedCity.js`
2. ✅ Modified: `aqi-backend/controllers/aqiController.js`
3. ✅ Modified: `aqi-backend/routes/aqiRoutes.js`
4. ✅ Modified: `aqi-backend/cron/collectAQI.js`
5. ✅ Created: `QUICK_START_AUTOFETCH.md`

## Next Steps

1. **Test the system:**
   - Search for various cities
   - Verify WatchedCity entries created
   - Run cron job and verify data collected

2. **Monitor performance:**
   - Check API response times
   - Monitor database query performance
   - Track cron job execution time

3. **Consider:**
   - Adding user authentication for per-user watched lists
   - Creating admin dashboard for monitoring
   - Setting up alerts for fetch failures
