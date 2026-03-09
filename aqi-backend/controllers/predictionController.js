// Prediction Controller - Handle AQI prediction requests

const predictionService = require('../services/predictionService');

/**
 * Generate AQI predictions for a city
 * @route GET /api/prediction/:city
 */
exports.getPredictions = async (req, res) => {
  try {
    const { city } = req.params;
    const { days = 30 } = req.query;

    if (!city) {
      return res.status(400).json({
        error: 'City parameter is required'
      });
    }

    const predictionDays = Math.min(Math.max(parseInt(days), 1), 90); // Limit between 1-90 days

    console.log(`🔮 Generating ${predictionDays}-day AQI predictions for: ${city}`);

    // Generate predictions using linear regression
    const result = await predictionService.generatePredictions(city, predictionDays);

    if (!result.success) {
      return res.status(404).json({
        error: result.error,
        message: result.message || 'Unable to generate predictions'
      });
    }

    res.json({
      success: true,
      city: result.city,
      predictions: result.predictions,
      model: {
        algorithm: 'Linear Regression',
        slope: result.model.slope,
        intercept: result.model.intercept,
        r2: result.model.r2,
        accuracy: result.model.accuracy,
        historicalDataPoints: result.historicalDays
      },
      metadata: {
        predictionDays: result.predictionDays,
        generatedAt: result.generatedAt,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }
    });

  } catch (error) {
    console.error('❌ Error in getPredictions:', error.message);

    // Treat insufficient history as an expected state, not a server failure.
    if ((error.message || '').toLowerCase().includes('insufficient historical data')) {
      return res.json({
        success: false,
        city: req.params.city,
        predictions: [],
        model: null,
        message: error.message,
        fallbackRecommended: true
      });
    }

    res.status(500).json({
      error: error.message || 'Failed to generate predictions'
    });
  }
};

/**
 * Get prediction statistics for a city
 * @route GET /api/prediction/:city/stats
 */
exports.getPredictionStats = async (req, res) => {
  try {
    const { city } = req.params;
    const { days = 30 } = req.query;

    if (!city) {
      return res.status(400).json({
        error: 'City parameter is required'
      });
    }

    const predictionDays = Math.min(Math.max(parseInt(days), 1), 90);

    console.log(`📊 Generating prediction statistics for: ${city}`);

    const result = await predictionService.generatePredictions(city, predictionDays);

    if (!result.success) {
      return res.status(404).json({
        error: result.error,
        message: result.message
      });
    }

    // Calculate statistics from predictions
    const statistics = predictionService.getPredictionStatistics(result.predictions);
    const dangerousDays = predictionService.getDangerousDays(result.predictions);

    res.json({
      success: true,
      city: result.city,
      statistics: {
        ...statistics,
        dangerousDays: dangerousDays.map(day => ({
          date: day.date,
          aqi: day.aqi,
          category: day.category,
          confidence: day.confidence
        }))
      },
      model: {
        r2: result.model.r2,
        accuracy: result.model.accuracy,
        dataPoints: result.historicalDays
      },
      generatedAt: result.generatedAt
    });

  } catch (error) {
    console.error('❌ Error in getPredictionStats:', error.message);
    res.status(500).json({
      error: error.message || 'Failed to generate prediction statistics'
    });
  }
};

/**
 * Get dangerous days from predictions
 * @route GET /api/prediction/:city/dangerous-days
 */
exports.getDangerousDays = async (req, res) => {
  try {
    const { city } = req.params;
    const { days = 30, threshold = 150 } = req.query;

    if (!city) {
      return res.status(400).json({
        error: 'City parameter is required'
      });
    }

    const predictionDays = Math.min(Math.max(parseInt(days), 1), 90);
    const aqiThreshold = parseInt(threshold);

    console.log(`⚠️ Finding dangerous days for: ${city} (threshold: ${aqiThreshold})`);

    const result = await predictionService.generatePredictions(city, predictionDays);

    if (!result.success) {
      return res.status(404).json({
        error: result.error,
        message: result.message
      });
    }

    const dangerousDays = predictionService.getDangerousDays(result.predictions, aqiThreshold);

    res.json({
      success: true,
      city: result.city,
      threshold: aqiThreshold,
      count: dangerousDays.length,
      dangerousDays: dangerousDays.map(day => ({
        date: day.date,
        aqi: day.aqi,
        category: day.category,
        confidence: day.confidence,
        daysFromNow: Math.ceil((new Date(day.date) - new Date()) / (1000 * 60 * 60 * 24))
      })),
      warning: dangerousDays.length > 0 
        ? `${dangerousDays.length} days with AQI above ${aqiThreshold} expected`
        : `No days with AQI above ${aqiThreshold} expected`,
      generatedAt: result.generatedAt
    });

  } catch (error) {
    console.error('❌ Error in getDangerousDays:', error.message);
    res.status(500).json({
      error: error.message || 'Failed to identify dangerous days'
    });
  }
};

/**
 * Get prediction accuracy metrics
 * @route GET /api/prediction/:city/accuracy
 */
exports.getAccuracyMetrics = async (req, res) => {
  try {
    const { city } = req.params;

    if (!city) {
      return res.status(400).json({
        error: 'City parameter is required'
      });
    }

    console.log(`📈 Calculating prediction accuracy for: ${city}`);

    // Generate predictions with default parameters
    const result = await predictionService.generatePredictions(city, 30);

    if (!result.success) {
      return res.status(404).json({
        error: result.error,
        message: result.message
      });
    }

    const { model, historicalDays } = result;

    // Accuracy assessment
    const accuracyMetrics = {
      algorithm: 'Linear Regression',
      r2Score: model.r2,
      r2Description: this.describeR2(model.r2),
      accuracy: model.accuracy,
      dataPoints: historicalDays,
      modelQuality: this.assessModelQuality(model.r2, historicalDays),
      confidenceLevel: this.getConfidenceLevel(model.r2),
      recommendations: this.getAccuracyRecommendations(model.r2, historicalDays)
    };

    res.json({
      success: true,
      city: result.city,
      accuracyMetrics,
      model: {
        slope: model.slope,
        intercept: model.intercept,
        r2: model.r2
      },
      generatedAt: result.generatedAt
    });

  } catch (error) {
    console.error('❌ Error in getAccuracyMetrics:', error.message);
    res.status(500).json({
      error: error.message || 'Failed to calculate accuracy metrics'
    });
  }
};

/**
 * Compare predictions for multiple cities
 * @route POST /api/prediction/compare
 */
exports.comparePredictions = async (req, res) => {
  try {
    const { cities, days = 30 } = req.body;

    if (!cities || !Array.isArray(cities) || cities.length === 0) {
      return res.status(400).json({
        error: 'Cities array is required',
        example: { cities: ['New York', 'London', 'Beijing'], days: 30 }
      });
    }

    if (cities.length > 5) {
      return res.status(400).json({
        error: 'Maximum 5 cities allowed for comparison'
      });
    }

    const predictionDays = Math.min(Math.max(parseInt(days), 1), 90);

    console.log(`🔄 Comparing predictions for ${cities.length} cities`);

    // Generate predictions for all cities
    const comparisons = [];

    for (const city of cities) {
      try {
        const result = await predictionService.generatePredictions(city, predictionDays);
        
        if (result.success) {
          const stats = predictionService.getPredictionStatistics(result.predictions);
          
          comparisons.push({
            city: result.city,
            statistics: stats,
            model: {
              r2: result.model.r2,
              accuracy: result.model.accuracy
            },
            firstDay: result.predictions[0],
            lastDay: result.predictions[result.predictions.length - 1]
          });
        } else {
          comparisons.push({
            city,
            error: result.error || 'Failed to generate predictions'
          });
        }
      } catch (error) {
        comparisons.push({
          city,
          error: error.message
        });
      }
    }

    // Find best and worst air quality
    const validComparisons = comparisons.filter(c => !c.error);
    
    let bestCity = null;
    let worstCity = null;

    if (validComparisons.length > 0) {
      bestCity = validComparisons.reduce((best, current) => 
        current.statistics.average < best.statistics.average ? current : best
      );

      worstCity = validComparisons.reduce((worst, current) => 
        current.statistics.average > worst.statistics.average ? current : worst
      );
    }

    res.json({
      success: true,
      predictionDays,
      comparisons,
      summary: {
        totalCities: cities.length,
        successfulPredictions: validComparisons.length,
        failedPredictions: cities.length - validComparisons.length,
        bestAirQuality: bestCity ? {
          city: bestCity.city,
          averageAQI: bestCity.statistics.average
        } : null,
        worstAirQuality: worstCity ? {
          city: worstCity.city,
          averageAQI: worstCity.statistics.average
        } : null
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in comparePredictions:', error.message);
    res.status(500).json({
      error: error.message || 'Failed to compare predictions'
    });
  }
};

// Helper functions
exports.describeR2 = (r2) => {
  if (r2 >= 0.9) return 'Excellent fit - model explains 90%+ of variance';
  if (r2 >= 0.7) return 'Good fit - model explains 70-90% of variance';
  if (r2 >= 0.5) return 'Moderate fit - model explains 50-70% of variance';
  if (r2 >= 0.3) return 'Fair fit - model explains 30-50% of variance';
  return 'Poor fit - model explains less than 30% of variance';
};

exports.assessModelQuality = (r2, dataPoints) => {
  if (dataPoints < 15) return 'Limited (insufficient data)';
  if (r2 >= 0.7 && dataPoints >= 30) return 'High';
  if (r2 >= 0.5 && dataPoints >= 20) return 'Good';
  if (r2 >= 0.3) return 'Moderate';
  return 'Low';
};

exports.getConfidenceLevel = (r2) => {
  if (r2 >= 0.7) return 'High';
  if (r2 >= 0.5) return 'Medium';
  if (r2 >= 0.3) return 'Low';
  return 'Very Low';
};

exports.getAccuracyRecommendations = (r2, dataPoints) => {
  const recommendations = [];

  if (dataPoints < 30) {
    recommendations.push('Collect more historical data for improved accuracy');
  }

  if (r2 < 0.5) {
    recommendations.push('Model accuracy is moderate - consider complementary forecasting methods');
  }

  if (r2 >= 0.7) {
    recommendations.push('Model shows good predictive performance');
  }

  recommendations.push('Predictions become less accurate further into the future');
  recommendations.push('Update predictions daily for best results');

  return recommendations;
};
