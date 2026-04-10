// Cron Job - Daily AQI Data Collection
// Runs daily at midnight UTC to collect and store AQI data for monitored cities

// Load environment variables if this module is run directly
require('dotenv').config();

const waqiService = require('../services/waqiService');
const AQIHistory = require('../models/AQIHistory');

/**
 * Collect AQI data for default cities and user-watched cities and store in database
 */
async function collectAQI() {
  console.log('\n🔄 Starting daily AQI collection...');
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

  try {
    // Get cities from environment or use defaults
    const citiesString = process.env.DEFAULT_CITIES || 
      'New York,London,Beijing,Delhi,Tokyo,Mumbai,Los Angeles,Paris,Sydney,São Paulo';
    
    const defaultCities = citiesString.split(',').map(city => city.trim());
    
    // Get watched cities from database (autofetch enabled)
    const watchedCities = await AQIHistory.getWatchedCities(true);
    const watchedCityNames = watchedCities.map(w => w.city);

    // Combine cities, removing duplicates (watched cities take precedence)
    const allCities = [
      ...new Set([...watchedCityNames, ...defaultCities])
    ];

    console.log(`📍 Default cities: ${defaultCities.length}`);
    console.log(`📍 Watched cities (auto-fetch): ${watchedCityNames.length}`);
    console.log(`📍 Total unique cities: ${allCities.length}`);
    console.log(`\nCollecting data for: ${allCities.join(', ')}`);

    let successCount = 0;
    let failureCount = 0;
    const results = [];

    // Process each city
    for (const city of allCities) {
      try {
        console.log(`\n📡 Fetching AQI for: ${city}`);

        // Fetch current AQI from WAQI API
        const aqiData = await waqiService.fetchCurrentAQI(city);

        // Check if we already have data for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingRecord = await AQIHistory.findOne({
          city: { $regex: new RegExp(`^${aqiData.city}$`, 'i') },
          date: { $gte: today }
        });

        if (existingRecord) {
          console.log(`ℹ️  Data already exists for ${aqiData.city} today - updating...`);
          
          // Update existing record
          existingRecord.aqi = aqiData.aqi;
          existingRecord.pollutants = aqiData.pollutants;
          existingRecord.dominantPollutant = aqiData.dominantPollutant;
          existingRecord.category = waqiService.getAQICategory(aqiData.aqi);
          existingRecord.latitude = aqiData.latitude;
          existingRecord.longitude = aqiData.longitude;
          existingRecord.country = aqiData.country;
          existingRecord.lastUpdated = new Date();
          
          await existingRecord.save();
          
          console.log(`✅ Updated AQI data for ${aqiData.city}: ${aqiData.aqi}`);
        } else {
          // Create new record
          const aqiRecord = new AQIHistory({
            city: aqiData.city,
            country: aqiData.country,
            latitude: aqiData.latitude,
            longitude: aqiData.longitude,
            aqi: aqiData.aqi,
            pollutants: aqiData.pollutants,
            dominantPollutant: aqiData.dominantPollutant,
            category: waqiService.getAQICategory(aqiData.aqi),
            date: new Date(),
            source: 'WAQI',
            isWatched: watchedCityNames.includes(city.toLowerCase()),
            autoFetchEnabled: true
          });

          await aqiRecord.save();
          
          console.log(`✅ Stored new AQI data for ${aqiData.city}: ${aqiData.aqi}`);
        }

        // Update fetch status for monitored cities
        await AQIHistory.recordFetchAttempt(aqiData.city, true);

        successCount++;
        results.push({
          city: aqiData.city,
          status: 'success',
          aqi: aqiData.aqi,
          category: waqiService.getAQICategory(aqiData.aqi)
        });

        // Rate limiting - wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error collecting data for ${city}:`, error.message);
        
        // Record failed fetch attempt
        await AQIHistory.recordFetchAttempt(city, false);

        failureCount++;
        results.push({
          city,
          status: 'failed',
          error: error.message
        });
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Daily AQI Collection Summary');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📅 Date: ${new Date().toLocaleDateString()}`);
    console.log(`⏰ Completed at: ${new Date().toLocaleTimeString()}`);
    console.log('='.repeat(60) + '\n');

    // Log successful collections
    if (successCount > 0) {
      console.log('Successfully collected data for:');
      results
        .filter(r => r.status === 'success')
        .forEach(r => {
          console.log(`  • ${r.city}: AQI ${r.aqi} (${r.category})`);
        });
    }

    // Log failures
    if (failureCount > 0) {
      console.log('\n⚠️  Failed collections:');
      results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`  • ${r.city}: ${r.error}`);
        });
    }

    return {
      timestamp: new Date(),
      totalCities: allCities.length,
      defaultCities: defaultCities.length,
      watchedCities: watchedCityNames.length,
      successCount,
      failureCount,
      results
    };
  } catch (error) {
    console.error('❌ Fatal error in collectAQI:', error.message);
    throw error;
  }
}

/**
 * Clean up old AQI data (optional maintenance)
 * Removes records older than specified days
 */
async function cleanupOldData(daysToKeep = 365) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await AQIHistory.deleteMany({
      date: { $lt: cutoffDate }
    });

    console.log(`🗑️  Cleaned up ${result.deletedCount} old AQI records (older than ${daysToKeep} days)`);
    
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    return 0;
  }
}

/**
 * Get collection statistics
 */
async function getCollectionStats() {
  try {
    const totalRecords = await AQIHistory.countDocuments();
    const cities = await AQIHistory.distinct('city');
    const latestDate = await AQIHistory.findOne().sort({ date: -1 }).select('date');
    const oldestDate = await AQIHistory.findOne().sort({ date: 1 }).select('date');

    const stats = {
      totalRecords,
      uniqueCities: cities.length,
      cities: cities.sort(),
      latestCollection: latestDate ? latestDate.date : null,
      oldestRecord: oldestDate ? oldestDate.date : null
    };

    console.log('\n📊 AQI Collection Statistics:');
    console.log(`   Total Records: ${stats.totalRecords}`);
    console.log(`   Unique Cities: ${stats.uniqueCities}`);
    console.log(`   Cities: ${stats.cities.join(', ')}`);
    console.log(`   Latest Collection: ${stats.latestCollection}`);
    console.log(`   Oldest Record: ${stats.oldestRecord}\n`);

    return stats;
  } catch (error) {
    console.error('❌ Error getting collection stats:', error.message);
    return null;
  }
}

module.exports = {
  collectAQI,
  cleanupOldData,
  getCollectionStats
};
