// AQI Controller - Handle AQI-related requests

const waqiService = require('../services/waqiService');
const openMeteoService = require('../services/openMeteoService');
const AQIHistory = require('../models/AQIHistory');
const WatchedCity = require('../models/WatchedCity');

/**
 * Get current AQI data for a city
 * @route GET /api/aqi/:city
 */
exports.getCurrentAQI = async (req, res) => {
  try {
    const { city } = req.params;

    if (!city) {
      return res.status(400).json({
        error: 'City parameter is required'
      });
    }

    console.log(`📡 Fetching current AQI for: ${city}`);

    // Fetch from WAQI API
    const aqiData = await waqiService.fetchCurrentAQI(city);

    // Register city for autofetch (non-blocking)
    try {
      await WatchedCity.findOrCreateFromAQI(aqiData);
      console.log(`📌 City registered in watchlist: ${aqiData.city}`);
    } catch (error) {
      console.error(`⚠️  Failed to register city in watchlist:`, error.message);
      // Don't block the response if watchlist update fails
    }

    // Add health recommendations
    const healthRecommendations = waqiService.getHealthRecommendations(aqiData.aqi);
    const category = waqiService.getAQICategory(aqiData.aqi);

    res.json({
      success: true,
      data: {
        ...aqiData,
        category,
        healthRecommendations
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in getCurrentAQI:', error.message);
    res.status(500).json({
      error: error.message || 'Failed to fetch AQI data'
    });
  }
};

/**
 * Get AQI by coordinates
 * @route GET /api/aqi/coordinates/:lat/:lon
 */
exports.getAQIByCoordinates = async (req, res) => {
  try {
    const { lat, lon } = req.params;

    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Latitude and longitude parameters are required'
      });
    }

    console.log(`📡 Fetching AQI for coordinates: ${lat}, ${lon}`);

    const aqiData = await waqiService.fetchAQIByCoordinates(
      parseFloat(lat),
      parseFloat(lon)
    );

    // Register city for autofetch (non-blocking)
    try {
      await WatchedCity.findOrCreateFromAQI(aqiData);
      console.log(`📌 City registered in watchlist: ${aqiData.city}`);
    } catch (error) {
      console.error(`⚠️  Failed to register city in watchlist:`, error.message);
      // Don't block the response if watchlist update fails
    }

    const category = waqiService.getAQICategory(aqiData.aqi);
    const healthRecommendations = waqiService.getHealthRecommendations(aqiData.aqi);

    res.json({
      success: true,
      data: {
        ...aqiData,
        category,
        healthRecommendations
      }
    });

  } catch (error) {
    console.error('❌ Error in getAQIByCoordinates:', error.message);
    res.status(500).json({
      error: error.message || 'Failed to fetch AQI by coordinates'
    });
  }
};

/**
 * Get historical AQI data from database
 * @route GET /api/aqi/history/:city
 */
exports.getHistoricalAQI = async (req, res) => {
  try {
    const { city } = req.params;
    const { days = 30 } = req.query;

    if (!city) {
      return res.status(400).json({
        error: 'City parameter is required'
      });
    }

    console.log(`📊 Fetching historical AQI for: ${city} (${days} days)`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    // Query database for historical data
    const historicalData = await AQIHistory.find({
      city: { $regex: new RegExp(city, 'i') },
      date: { $gte: cutoffDate }
    })
    .sort({ date: 1 })
    .select('-__v -createdAt -updatedAt')
    .lean();

    if (historicalData.length === 0) {
      return res.json({
        success: true,
        city,
        days: parseInt(days),
        statistics: {
          count: 0,
          average: null,
          min: null,
          max: null,
          latestAQI: null
        },
        data: [],
        message: `No historical data found for ${city} yet.`
      });
    }

    // Calculate statistics
    const aqiValues = historicalData.map(d => d.aqi);
    const statistics = {
      count: historicalData.length,
      average: Math.round(aqiValues.reduce((sum, val) => sum + val, 0) / aqiValues.length),
      min: Math.min(...aqiValues),
      max: Math.max(...aqiValues),
      latestAQI: aqiValues[aqiValues.length - 1]
    };

    res.json({
      success: true,
      city,
      days: parseInt(days),
      statistics,
      data: historicalData
    });

  } catch (error) {
    console.error('❌ Error in getHistoricalAQI:', error.message);
    res.status(500).json({
      error: error.message || 'Failed to fetch historical AQI data'
    });
  }
};

/**
 * Get historical pollution data from Open-Meteo API
 * @route GET /api/aqi/pollution-history/:lat/:lon
 */
exports.getPollutionHistory = async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const { days = 30 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        error: 'Latitude and longitude parameters are required'
      });
    }

    console.log(`📊 Fetching pollution history for: ${lat}, ${lon}`);

    const historicalData = await openMeteoService.fetchHistoricalPollution(
      parseFloat(lat),
      parseFloat(lon),
      parseInt(days)
    );

    res.json({
      success: true,
      coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) },
      days: historicalData.length,
      data: historicalData
    });

  } catch (error) {
    console.error('❌ Error in getPollutionHistory:', error.message);
    res.status(500).json({
      error: error.message || 'Failed to fetch pollution history'
    });
  }
};

/**
 * Store AQI data in database
 * @route POST /api/aqi/store
 */
exports.storeAQI = async (req, res) => {
  try {
    const {
      city,
      country,
      latitude,
      longitude,
      aqi,
      pollutants,
      dominantPollutant,
      timestamp,
      source
    } = req.body;

    if (!city) {
      return res.status(400).json({
        error: 'City is required in request body'
      });
    }

    console.log(`💾 Storing AQI data for: ${city}`);

    // Use provided payload when available to keep DB aligned with displayed AQI.
    // Fallback to WAQI fetch for backward compatibility.
    const hasPayload = (
      Number.isFinite(Number(aqi)) &&
      Number.isFinite(Number(latitude)) &&
      Number.isFinite(Number(longitude))
    );

    const normalizePollutant = (value) => {
      const key = String(value || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '');
      const map = {
        pm25: 'pm25',
        pm10: 'pm10',
        o3: 'o3',
        no2: 'no2',
        so2: 'so2',
        co: 'co'
      };
      return map[key] || 'unknown';
    };

    const aqiData = hasPayload
      ? {
          city,
          country: country || '',
          latitude: Number(latitude),
          longitude: Number(longitude),
          aqi: Math.max(0, Number(aqi)),
          pollutants: pollutants || {},
          dominantPollutant: normalizePollutant(dominantPollutant),
          timestamp: timestamp || new Date().toISOString()
        }
      : await waqiService.fetchCurrentAQI(city);

    // Calculate category from AQI value
    const category = waqiService.getAQICategory(aqiData.aqi);

    // Upsert exactly one record per city per day, then always update it with latest AQI.
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const sourceLabel = hasPayload ? (source || 'Manual') : 'WAQI';

    const updatedRecord = await AQIHistory.findOneAndUpdate(
      {
        city: aqiData.city,
        date: { $gte: todayStart, $lt: tomorrowStart }
      },
      {
        $set: {
          country: aqiData.country,
          latitude: aqiData.latitude,
          longitude: aqiData.longitude,
          aqi: aqiData.aqi,
          category,
          pollutants: aqiData.pollutants,
          dominantPollutant: aqiData.dominantPollutant,
          lastUpdated: new Date(),
          source: sourceLabel
        },
        $setOnInsert: {
          city: aqiData.city,
          date: hasPayload && aqiData.timestamp ? new Date(aqiData.timestamp) : new Date()
        }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    // Register city for autofetch (non-blocking)
    try {
      await WatchedCity.findOrCreateFromAQI(aqiData);
      console.log(`📌 City registered in watchlist: ${aqiData.city}`);
    } catch (error) {
      console.error(`⚠️  Failed to register city in watchlist:`, error.message);
      // Don't block the response if watchlist update fails
    }

    console.log(`✅ AQI data upserted for ${aqiData.city} (AQI: ${aqiData.aqi}, Category: ${category}, Source: ${sourceLabel})`);

    res.json({
      success: true,
      message: 'AQI data stored/updated successfully',
      data: updatedRecord,
      updated: true
    });

  } catch (error) {
    console.error('❌ Error in storeAQI:', error.message);
    res.status(500).json({
      error: error.message || 'Failed to store AQI data'
    });
  }
};

/**
 * Get AQI statistics for a city
 * @route GET /api/aqi/statistics/:city
 */
exports.getAQIStatistics = async (req, res) => {
  try {
    const { city } = req.params;
    const { days = 30 } = req.query;

    if (!city) {
      return res.status(400).json({
        error: 'City parameter is required'
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const historicalData = await AQIHistory.find({
      city: { $regex: new RegExp(city, 'i') },
      date: { $gte: cutoffDate }
    })
    .sort({ date: 1 })
    .lean();

    if (historicalData.length === 0) {
      return res.status(404).json({
        error: `No data found for ${city}`
      });
    }

    const aqiValues = historicalData.map(d => d.aqi);
    
    // Calculate detailed statistics
    const statistics = {
      city,
      period: {
        days: parseInt(days),
        from: historicalData[0].date,
        to: historicalData[historicalData.length - 1].date
      },
      aqi: {
        current: aqiValues[aqiValues.length - 1],
        average: Math.round(aqiValues.reduce((sum, val) => sum + val, 0) / aqiValues.length),
        min: Math.min(...aqiValues),
        max: Math.max(...aqiValues),
        median: this.calculateMedian(aqiValues)
      },
      categoryCounts: this.getCategoryCounts(historicalData),
      dominantPollutants: this.getDominantPollutants(historicalData),
      trend: this.calculateTrend(aqiValues)
    };

    res.json({
      success: true,
      statistics
    });

  } catch (error) {
    console.error('❌ Error in getAQIStatistics:', error.message);
    res.status(500).json({
      error: error.message || 'Failed to calculate statistics'
    });
  }
};

// Helper functions
exports.calculateMedian = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

exports.getCategoryCounts = (data) => {
  const counts = {};
  data.forEach(record => {
    counts[record.category] = (counts[record.category] || 0) + 1;
  });
  return counts;
};

exports.getDominantPollutants = (data) => {
  const counts = {};
  data.forEach(record => {
    const pollutant = record.dominantPollutant || 'unknown';
    counts[pollutant] = (counts[pollutant] || 0) + 1;
  });
  return counts;
};

exports.calculateTrend = (values) => {
  if (values.length < 2) return 'Insufficient data';
  
  const recentAvg = values.slice(-7).reduce((sum, val) => sum + val, 0) / Math.min(7, values.length);
  const olderAvg = values.slice(0, 7).reduce((sum, val) => sum + val, 0) / Math.min(7, values.length);
  
  const diff = recentAvg - olderAvg;
  
  if (Math.abs(diff) < 5) return 'Stable';
  return diff > 0 ? 'Increasing' : 'Decreasing';
};

// ============================================
// WATCHED CITIES MANAGEMENT ENDPOINTS
// ============================================

/**
 * Get all watched cities (for autofetch)
 * @route GET /api/aqi/watched-cities/list
 */
exports.getWatchedCities = async (req, res) => {
  try {
    const { activeOnly = true, sort = '-usageCount' } = req.query;

    const query = { isActive: true };
    
    if (activeOnly === 'true') {
      query.autoFetchEnabled = true;
    }

    const watchedCities = await WatchedCity.find(query)
      .sort(sort)
      .select('-__v')
      .lean();

    res.json({
      success: true,
      count: watchedCities.length,
      cities: watchedCities
    });

  } catch (error) {
    console.error('❌ Error in getWatchedCities:', error.message);
    res.status(500).json({
      error: error.message || 'Failed to fetch watched cities'
    });
  }
};

/**
 * Add a city to watched list manually
 * @route POST /api/aqi/watched-cities/add
 */
exports.addWatchedCity = async (req, res) => {
  try {
    const { city, country, latitude, longitude } = req.body;

    if (!city || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: 'City, latitude, and longitude are required'
      });
    }

    // Create watched city entry
    const watchedCity = await WatchedCity.findOneAndUpdate(
      { city: city.toLowerCase().trim() },
      {
        $set: {
          city: city.toLowerCase().trim(),
          country: country || '',
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          isActive: true,
          autoFetchEnabled: true,
          source: 'manual_add'
        },
        $setOnInsert: {
          usageCount: 1,
          dateAdded: new Date()
        }
      },
      {
        new: true,
        upsert: true
      }
    );

    console.log(`✅ City added to watched list: ${watchedCity.city}`);

    res.json({
      success: true,
      message: `${city} added to watched cities for autofetch`,
      data: watchedCity
    });

  } catch (error) {
    console.error('❌ Error in addWatchedCity:', error.message);
    res.status(500).json({
      error: error.message || 'Failed to add watched city'
    });
  }
};

/**
 * Remove a city from watched list
 * @route DELETE /api/aqi/watched-cities/:city
 */
exports.removeWatchedCity = async (req, res) => {
  try {
    const { city } = req.params;

    if (!city) {
      return res.status(400).json({
        error: 'City parameter is required'
      });
    }

    const result = await WatchedCity.findOneAndUpdate(
      { city: city.toLowerCase().trim() },
      { isActive: false, autoFetchEnabled: false },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        error: `City "${city}" not found in watched list`
      });
    }

    console.log(`✅ City removed from watched list: ${city}`);

    res.json({
      success: true,
      message: `${city} removed from watched cities`,
      data: result
    });

  } catch (error) {
    console.error('❌ Error in removeWatchedCity:', error.message);
    res.status(500).json({
      error: error.message || 'Failed to remove watched city'
    });
  }
};

/**
 * Toggle autofetch for a specific city
 * @route PATCH /api/aqi/watched-cities/:city/toggle
 */
exports.toggleWatchedCity = async (req, res) => {
  try {
    const { city } = req.params;

    if (!city) {
      return res.status(400).json({
        error: 'City parameter is required'
      });
    }

    const watchedCity = await WatchedCity.findOne({ city: city.toLowerCase().trim() });

    if (!watchedCity) {
      return res.status(404).json({
        error: `City "${city}" not found in watched list`
      });
    }

    watchedCity.autoFetchEnabled = !watchedCity.autoFetchEnabled;
    await watchedCity.save();

    console.log(`✅ Autofetch toggled for: ${city} (enabled: ${watchedCity.autoFetchEnabled})`);

    res.json({
      success: true,
      message: `Autofetch ${watchedCity.autoFetchEnabled ? 'enabled' : 'disabled'} for ${city}`,
      data: watchedCity
    });

  } catch (error) {
    console.error('❌ Error in toggleWatchedCity:', error.message);
    res.status(500).json({
      error: error.message || 'Failed to toggle watched city'
    });
  }
};

/**
 * Get autofetch statistics
 * @route GET /api/aqi/watched-cities/statistics
 */
exports.getWatchedCitiesStatistics = async (req, res) => {
  try {
    const totalWatchedCities = await WatchedCity.countDocuments();
    const activeWatchedCities = await WatchedCity.countDocuments({ 
      isActive: true, 
      autoFetchEnabled: true 
    });
    
    const topCities = await WatchedCity.find({ isActive: true })
      .sort({ usageCount: -1 })
      .limit(10)
      .select('city usageCount lastAccessed country')
      .lean();

    const statistics = {
      totalWatchedCities,
      activeWatchedCities,
      inactiveCities: totalWatchedCities - activeWatchedCities,
      topSearchedCities: topCities
    };

    res.json({
      success: true,
      statistics
    });

  } catch (error) {
    console.error('❌ Error in getWatchedCitiesStatistics:', error.message);
    res.status(500).json({
      error: error.message || 'Failed to fetch statistics'
    });
  }
};
