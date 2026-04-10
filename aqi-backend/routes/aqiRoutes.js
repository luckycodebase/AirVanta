// AQI Routes

const express = require('express');
const router = express.Router();
const aqiController = require('../controllers/aqiController');

/**
 * @route   POST /api/aqi/store
 * @desc    Store current AQI data in database
 * @access  Public
 * @body    { city: string }
 */
router.post('/store', aqiController.storeAQI);

/**
 * @route   GET /api/aqi/watched-cities/list
 * @desc    Get all watched cities for autofetch
 * @access  Public
 */
router.get('/watched-cities/list', aqiController.getWatchedCities);

/**
 * @route   GET /api/aqi/watched-cities/statistics
 * @desc    Get watched cities statistics
 * @access  Public
 */
router.get('/watched-cities/statistics', aqiController.getWatchedCitiesStatistics);

/**
 * @route   POST /api/aqi/watched-cities/add
 * @desc    Add a city to watched list manually
 * @access  Public
 * @body    { city: string, country?: string, latitude: number, longitude: number }
 */
router.post('/watched-cities/add', aqiController.addWatchedCity);

/**
 * @route   DELETE /api/aqi/watched-cities/:city
 * @desc    Remove a city from watched list
 * @access  Public
 */
router.delete('/watched-cities/:city', aqiController.removeWatchedCity);

/**
 * @route   PATCH /api/aqi/watched-cities/:city/toggle
 * @desc    Toggle autofetch for a specific city
 * @access  Public
 */
router.patch('/watched-cities/:city/toggle', aqiController.toggleWatchedCity);

/**
 * @route   GET /api/aqi/coordinates/:lat/:lon
 * @desc    Get AQI by coordinates
 * @access  Public
 */
router.get('/coordinates/:lat/:lon', aqiController.getAQIByCoordinates);

/**
 * @route   GET /api/aqi/pollution-history/:lat/:lon
 * @desc    Get historical pollution data from Open-Meteo
 * @access  Public
 * @query   days - Number of days of history (default: 30)
 */
router.get('/pollution-history/:lat/:lon', aqiController.getPollutionHistory);

/**
 * @route   GET /api/aqi/history/:city
 * @desc    Get historical AQI data from database
 * @access  Public
 * @query   days - Number of days of history (default: 30)
 */
router.get('/history/:city', aqiController.getHistoricalAQI);

/**
 * @route   GET /api/aqi/statistics/:city
 * @desc    Get AQI statistics for a city
 * @access  Public
 * @query   days - Number of days to analyze (default: 30)
 */
router.get('/statistics/:city', aqiController.getAQIStatistics);

/**
 * @route   GET /api/aqi/:city
 * @desc    Get current AQI data for a city
 * @access  Public
 */
router.get('/:city', aqiController.getCurrentAQI);

module.exports = router;
