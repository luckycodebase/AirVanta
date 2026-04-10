# Autofetch City Management System

## Overview

The autofetch system automatically registers cities that users search for and includes them in the daily AQI data collection. This means users don't need to regularly open the site to fetch data for their cities—the system will automatically collect and store AQI data for any city they've accessed.

## How It Works

### 1. **Automatic City Registration**
When a user:
- Searches for a city (`GET /api/aqi/:city`)
- Uses coordinates lookup (`GET /api/aqi/coordinates/:lat/:lon`)
- Stores AQI data (`POST /api/aqi/store`)

The city is automatically registered in the `WatchedCities` collection with:
- City name, country, latitude, longitude
- Usage count (tracks how many times accessed)
- Last accessed timestamp
- Auto-fetch enabled by default

### 2. **Daily Autofetch Process**
The cron job (`collectAQI`) runs daily at midnight UTC:

1. **Fetches default cities** (configured via `DEFAULT_CITIES` env variable)
2. **Fetches user-watched cities** (from database)
3. **Combines and prioritizes** (with user-watched cities sorted by usage count)
4. **Updates fetch status** for each watched city

**Priority Order:**
- Most frequently searched cities are checked first
- Default cities are always included
- Duplicates are automatically removed

### 3. **Tracking & Management**
Each watched city tracks:
- **usageCount**: Number of times the city was accessed
- **lastAccessed**: When the city was last searched
- **lastFetchedAt**: When AQI data was last collected
- **fetchFailureCount**: Failed consecutive fetch attempts
- **isActive**: City is in the watch list
- **autoFetchEnabled**: City should be included in autofetch

## API Endpoints

### Get Watched Cities
```
GET /api/aqi/watched-cities/list
```

**Query Parameters:**
- `activeOnly` (boolean, default: true) - Only return active cities
- `sort` (string, default: '-usageCount') - Sort field

**Response:**
```json
{
  "success": true,
  "count": 5,
  "cities": [
    {
      "city": "new york",
      "country": "United States",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "usageCount": 15,
      "lastAccessed": "2026-04-10T14:30:00Z",
      "autoFetchEnabled": true,
      "fetchFailureCount": 0
    }
  ]
}
```

### Get Watched Cities Statistics
```
GET /api/aqi/watched-cities/statistics
```

**Response:**
```json
{
  "success": true,
  "statistics": {
    "totalWatchedCities": 12,
    "activeWatchedCities": 10,
    "inactiveCities": 2,
    "topSearchedCities": [
      {
        "city": "delhi",
        "usageCount": 28,
        "lastAccessed": "2026-04-10T15:45:00Z",
        "country": "India"
      }
    ]
  }
}
```

### Add City to Watched List (Manual)
```
POST /api/aqi/watched-cities/add
```

**Request Body:**
```json
{
  "city": "Tokyo",
  "country": "Japan",
  "latitude": 35.6762,
  "longitude": 139.6503
}
```

### Remove City from Watched List
```
DELETE /api/aqi/watched-cities/:city
```

This marks the city as inactive and disables autofetch.

### Toggle Autofetch for a City
```
PATCH /api/aqi/watched-cities/:city/toggle
```

Switches `autoFetchEnabled` on/off for a specific city.

## Database Schema (WatchedCity)

```javascript
{
  city: String (unique, lowercase),
  country: String,
  latitude: Number,
  longitude: Number,
  dateAdded: Date,
  usageCount: Number,
  lastAccessed: Date,
  isActive: Boolean,
  autoFetchEnabled: Boolean,
  fetchFrequency: String ('daily', 'weekly', 'custom'),
  source: String ('user_search', 'coordinates', 'manual_add', 'default'),
  lastFetchedAt: Date,
  fetchFailureCount: Number,
  timestamps: true
}
```

## Usage Flow

### For End Users

1. **User Opens Website**
   ```
   GET /api/aqi/new-delhi
   → City automatically registered in watched list
   → AQI data returned
   ```

2. **User Continues Using Site**
   ```
   Every search/lookup increments usageCount and updates lastAccessed
   ```

3. **Nightly Autofetch** (automatic, no user action needed)
   ```
   Cron job collects AQI for all watched cities
   → Data stored in database
   → User can view latest data anytime
   ```

4. **Optional: Manage Watched Cities**
   ```
   PATCH /api/aqi/watched-cities/delhi/toggle
   → Disable autofetch if not needed
   
   DELETE /api/aqi/watched-cities/paris
   → Remove city from watched list
   ```

### For Developers

#### Check Active Watched Cities
```bash
curl http://localhost:5000/api/aqi/watched-cities/list
```

#### Monitor Statistics
```bash
curl http://localhost:5000/api/aqi/watched-cities/statistics
```

#### Manually Add a City
```bash
curl -X POST http://localhost:5000/api/aqi/watched-cities/add \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Singapore",
    "country": "Singapore",
    "latitude": 1.3521,
    "longitude": 103.8198
  }'
```

## Configuration

### Environment Variables

**DEFAULT_CITIES** (existing)
```env
DEFAULT_CITIES=New York,London,Beijing,Delhi,Tokyo,Mumbai,Los Angeles,Paris,Sydney,São Paulo
```

These cities are always included in autofetch, regardless of user interaction.

### Cron Schedule

The autofetch runs daily at midnight UTC:
```javascript
cron.schedule('0 0 * * *', () => collectAQI()); // Midnight UTC
```

To change the schedule, modify [server.js](aqi-backend/server.js).

## Benefits

✅ **Automatic Growth**: Watched cities list grows organically based on user searches  
✅ **No User Action Required**: Once a user searches for a city, data is collected daily  
✅ **Intelligent Prioritization**: Frequently searched cities are prioritized  
✅ **Failure Tracking**: Monitors fetch failures for reliability  
✅ **User Control**: Users can manage which cities to autofetch  
✅ **Storage Efficient**: Only active cities use database storage and API calls  

## Monitoring & Maintenance

### Check Health
```bash
GET /health  # Verify backend is running
GET /api/aqi/watched-cities/statistics  # Monitor watched cities
```

### Clean Up Inactive Cities
Cities marked as `isActive: false` can be archived or deleted periodically.

### Reset Failure Count
When a fetch succeeds, `fetchFailureCount` resets to 0.

## Example: Complete User Journey

**Day 1:**
1. User searches for "Singapore"
   - City registered with usageCount=1
   - AQI data returned immediately

**Day 2:**
1. User searches for "Singapore" again
   - usageCount incremented to 2
   - lastAccessed updated

2. **Midnight UTC**: Cron job runs
   - Singapore is in watched list
   - AQI data collected and stored

3. User visits site next morning
   - Latest AQI available immediately
   - No need to wait for API fetch

**Day 3:**
1. User searches for "Bangkok"
   - Bangkok registered in watched list
   - Now both Singapore and Bangkok will be autofetched daily

## Troubleshooting

### Watched Cities Not Updating
- Check if `autoFetchEnabled` is true
- Verify MongoDB connection
- Check cron logs for errors

### Too Many Cities Being Fetched
- Disable autofetch for inactive cities using toggle endpoint
- Or manually delete city entries

### Fetch Failures
- Monitor `fetchFailureCount` in WatchedCity records
- Check WAQI API rate limits
- Verify city name spelling in database

## Future Enhancements

- [ ] Custom fetch frequency per city (daily/weekly)
- [ ] User-specific watched city lists
- [ ] Batch cleanup of failed cities
- [ ] Analytics dashboard for most watched cities
- [ ] Email notifications for high AQI cities
