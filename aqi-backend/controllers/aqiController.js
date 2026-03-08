// AQI Controller - Handle AQI-related requests

const waqiService = require('../services/waqiService');
const openMeteoService = require('../services/openMeteoService');
const AQIHistory = require('../models/AQIHistory');

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
      return res.status(404).json({
        error: `No historical data found for ${city}`,
        message: 'Historical data may not be available yet. It will be collected daily.'
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
          aqi: Math.max(0, Math.min(500, Number(aqi))),
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
