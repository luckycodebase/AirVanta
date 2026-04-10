// AQI History Model - Stores historical air quality data

const mongoose = require('mongoose');

const AQIHistorySchema = new mongoose.Schema({
  // Location information
  city: {
    type: String,
    required: [true, 'City name is required'],
    trim: true,
    index: true
  },
  country: {
    type: String,
    trim: true
  },
  latitude: {
    type: Number,
    required: [true, 'Latitude is required']
  },
  longitude: {
    type: Number,
    required: [true, 'Longitude is required']
  },
  
  // Air Quality Index
  aqi: {
    type: Number,
    required: [true, 'AQI value is required'],
    min: 0
  },
  
  // Pollutant measurements (μg/m³)
  pollutants: {
    pm25: {
      type: Number,
      default: null
    },
    pm10: {
      type: Number,
      default: null
    },
    o3: {
      type: Number,
      default: null
    },
    no2: {
      type: Number,
      default: null
    },
    so2: {
      type: Number,
      default: null
    },
    co: {
      type: Number,
      default: null
    }
  },
  
  // Dominant pollutant
  dominantPollutant: {
    type: String,
    enum: ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co', 'unknown'],
    default: 'unknown'
  },
  
  // AQI category
  category: {
    type: String,
    enum: ['Good', 'Moderate', 'Unhealthy for Sensitive Groups', 'Unhealthy', 'Very Unhealthy', 'Hazardous'],
    required: true
  },
  
  // Date of measurement
  date: {
    type: Date,
    required: [true, 'Date is required'],
    index: true
  },
  
  // Metadata
  source: {
    type: String,
    default: 'WAQI',
    enum: ['WAQI', 'Open-Meteo', 'Manual']
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // AutoFetch Tracking (stored on latest record per city)
  isWatched: {
    type: Boolean,
    default: false,
    description: 'Whether this city has been accessed by users'
  },
  
  usageCount: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Number of times this city was accessed'
  },
  
  lastAccessed: {
    type: Date,
    default: null,
    description: 'When this city was last searched by a user'
  },
  
  autoFetchEnabled: {
    type: Boolean,
    default: true,
    description: 'Whether this city should be included in daily autofetch'
  },
  
  fetchFailureCount: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Consecutive fetch failures for monitoring'
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
AQIHistorySchema.index({ city: 1, date: -1 });
AQIHistorySchema.index({ latitude: 1, longitude: 1, date: -1 });
AQIHistorySchema.index({ isWatched: 1, autoFetchEnabled: 1 });

// Static method to get AQI category from AQI value
AQIHistorySchema.statics.getAQICategory = function(aqi) {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};

// Instance method to calculate health impact score
AQIHistorySchema.methods.getHealthImpactScore = function() {
  const weights = {
    pm25: 0.8,
    pm10: 0.7,
    o3: 0.6,
    no2: 0.65,
    so2: 0.7,
    co: 0.5
  };
  
  let totalImpact = 0;
  let count = 0;
  
  for (const [pollutant, value] of Object.entries(this.pollutants)) {
    if (value !== null && value > 0) {
      totalImpact += value * (weights[pollutant] || 0.5);
      count++;
    }
  }
  
  return count > 0 ? Math.round(totalImpact / count) : 0;
};

// Pre-save middleware to set category
AQIHistorySchema.pre('save', function() {
  if (this.isModified('aqi')) {
    this.category = this.constructor.getAQICategory(this.aqi);
  }
  this.lastUpdated = Date.now();
});

// Virtual for formatted date
AQIHistorySchema.virtual('formattedDate').get(function() {
  return this.date.toISOString().split('T')[0];
});

// Ensure virtuals are included in JSON
AQIHistorySchema.set('toJSON', { virtuals: true });
AQIHistorySchema.set('toObject', { virtuals: true });

// ============================================
// AutoFetch Management Methods
// ============================================

/**
 * Update autofetch tracking for a city (on latest record)
 * Called when user searches for a city
 */
AQIHistorySchema.statics.recordCityAccess = async function(city) {
  try {
    const cityNormalized = city.toLowerCase().trim();
    
    // Find the latest record for this city
    const latestRecord = await this.findOne({ city: cityNormalized })
      .sort({ date: -1 })
      .exec();
    
    if (latestRecord) {
      // Update autofetch tracking on latest record
      latestRecord.isWatched = true;
      latestRecord.usageCount = (latestRecord.usageCount || 0) + 1;
      latestRecord.lastAccessed = new Date();
      latestRecord.autoFetchEnabled = true;
      latestRecord.fetchFailureCount = 0;
      
      await latestRecord.save();
    }
    
    return latestRecord;
  } catch (error) {
    console.error('Error in recordCityAccess:', error.message);
    throw error;
  }
};

/**
 * Get all watched cities for autofetch
 */
AQIHistorySchema.statics.getWatchedCities = async function(activeOnly = true) {
  try {
    const query = { isWatched: true };
    
    if (activeOnly) {
      query.autoFetchEnabled = true;
    }
    
    // Get latest record per city
    const watchedCities = await this.aggregate([
      { $match: query },
      { $sort: { city: 1, date: -1 } },
      { $group: {
          _id: '$city',
          city: { $first: '$city' },
          country: { $first: '$country' },
          latitude: { $first: '$latitude' },
          longitude: { $first: '$longitude' },
          usageCount: { $first: '$usageCount' },
          lastAccessed: { $first: '$lastAccessed' },
          autoFetchEnabled: { $first: '$autoFetchEnabled' }
        }
      },
      { $sort: { usageCount: -1 } }
    ]);
    
    return watchedCities;
  } catch (error) {
    console.error('Error in getWatchedCities:', error.message);
    throw error;
  }
};

/**
 * Toggle autofetch for a specific city
 */
AQIHistorySchema.statics.toggleAutoFetch = async function(city, enabled) {
  try {
    const cityNormalized = city.toLowerCase().trim();
    
    const latestRecord = await this.findOne({ city: cityNormalized })
      .sort({ date: -1 })
      .exec();
    
    if (latestRecord) {
      latestRecord.autoFetchEnabled = enabled;
      await latestRecord.save();
    }
    
    return latestRecord;
  } catch (error) {
    console.error('Error in toggleAutoFetch:', error.message);
    throw error;
  }
};

/**
 * Record fetch attempt for a city
 */
AQIHistorySchema.statics.recordFetchAttempt = async function(city, success = true) {
  try {
    const cityNormalized = city.toLowerCase().trim();
    
    const latestRecord = await this.findOne({ city: cityNormalized })
      .sort({ date: -1 })
      .exec();
    
    if (latestRecord) {
      if (success) {
        latestRecord.fetchFailureCount = 0;
      } else {
        latestRecord.fetchFailureCount = (latestRecord.fetchFailureCount || 0) + 1;
      }
      await latestRecord.save();
    }
    
    return latestRecord;
  } catch (error) {
    console.error('Error in recordFetchAttempt:', error.message);
    throw error;
  }
};

module.exports = mongoose.model('AQIHistory', AQIHistorySchema);
