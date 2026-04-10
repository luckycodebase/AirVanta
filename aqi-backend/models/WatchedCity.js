// Watched Cities Model - Tracks cities users search for autofetch

const mongoose = require('mongoose');

const WatchedCitySchema = new mongoose.Schema({
  // Location information
  city: {
    type: String,
    required: [true, 'City name is required'],
    trim: true,
    index: true,
    unique: true,
    lowercase: true
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
  
  // Tracking information
  dateAdded: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // User activity metrics
  usageCount: {
    type: Number,
    default: 1,
    min: 0
  },
  
  lastAccessed: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Autofetch control
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  autoFetchEnabled: {
    type: Boolean,
    default: true,
    description: 'Whether this city should be included in daily autofetch'
  },
  
  fetchFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'custom'],
    default: 'daily'
  },
  
  // Metadata
  source: {
    type: String,
    enum: ['user_search', 'coordinates', 'manual_add', 'default'],
    default: 'user_search'
  },
  
  lastFetchedAt: {
    type: Date,
    default: null
  },
  
  fetchFailureCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
WatchedCitySchema.index({ city: 1, isActive: 1 });
WatchedCitySchema.index({ autoFetchEnabled: 1, isActive: 1 });
WatchedCitySchema.index({ lastAccessed: -1 });

// Method to increment usage count and update last accessed
WatchedCitySchema.methods.recordAccess = function() {
  this.usageCount += 1;
  this.lastAccessed = new Date();
  return this.save();
};

// Method to update fetch status
WatchedCitySchema.methods.recordFetch = function(success = true) {
  this.lastFetchedAt = new Date();
  if (!success) {
    this.fetchFailureCount += 1;
  } else {
    this.fetchFailureCount = 0; // Reset on success
  }
  return this.save();
};

// Static method to find or create a watched city
WatchedCitySchema.statics.findOrCreateFromAQI = async function(aqiData) {
  try {
    const cityNormalized = aqiData.city.toLowerCase().trim();
    
    let watchedCity = await this.findOne({ city: cityNormalized });
    
    if (watchedCity) {
      // Update existing record
      watchedCity.usageCount += 1;
      watchedCity.lastAccessed = new Date();
      await watchedCity.save();
    } else {
      // Create new watched city
      watchedCity = await this.create({
        city: cityNormalized,
        country: aqiData.country,
        latitude: aqiData.latitude,
        longitude: aqiData.longitude,
        usageCount: 1,
        lastAccessed: new Date(),
        source: 'user_search',
        autoFetchEnabled: true
      });
    }
    
    return watchedCity;
  } catch (error) {
    console.error('Error in findOrCreateFromAQI:', error.message);
    throw error;
  }
};

module.exports = mongoose.model('WatchedCity', WatchedCitySchema);
