// API Module for AQI Data

const API = {
  // Get AQI data for location
  getAQI: async (city) => {
    let aqiData = null;
    
    try {
      // Use backend API for better reliability
      const response = await fetch(
        `http://localhost:5001/api/aqi/${encodeURIComponent(city)}`
      );
      
      if (!response.ok) {
        console.warn('Backend failed, falling back to direct WAQI API...');
        aqiData = await API.getAQIDirect(city);
      } else {
        const result = await response.json();
        
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to fetch AQI');
        }
        
        aqiData = result.data;
      }
    } catch (error) {
      console.error('Error fetching AQI:', error);
      console.log('Falling back to direct WAQI API...');
      aqiData = await API.getAQIDirect(city);
    }
    
    // Store to database once after we have the data (from any source)
    if (aqiData) {
      try {
        await API.storeAQIToDatabase(aqiData);
      } catch (err) {
        console.warn('Storage failed (non-critical):', err);
      }
    }
    
    return aqiData;
  },

  // Get AQI by coordinates
  getAQIByCoordinates: async (lat, lon) => {
    let aqiData = null;
    
    try {
      // Use backend API for better reliability
      const response = await fetch(
        `http://localhost:5001/api/aqi/coordinates/${lat}/${lon}`
      );
      
      if (!response.ok) {
        console.warn('Backend failed, falling back to direct WAQI API...');
        aqiData = await API.getAQIByCoordinatesDirect(lat, lon);
      } else {
        const result = await response.json();
        
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Cannot get AQI for location');
        }
        
        aqiData = result.data;
      }
    } catch (error) {
      console.error('Error fetching AQI by coordinates:', error);
      console.log('Falling back to direct WAQI API...');
      aqiData = await API.getAQIByCoordinatesDirect(lat, lon);
    }
    
    // Store to database once after we have the data (from any source)
    if (aqiData) {
      try {
        await API.storeAQIToDatabase(aqiData);
      } catch (err) {
        console.warn('Storage failed (non-critical):', err);
      }
    }
    
    return aqiData;
  },

  // Fallback: Direct WAQI API for AQI by city
  getAQIDirect: async (city) => {
    try {
      const token = 'e52b20dc479791e02b4673f662efb54a4c72d08e';
      const response = await fetch(
        `https://api.waqi.info/feed/${encodeURIComponent(city)}/?token=${token}`
      );
      
      if (!response.ok) throw new Error('API Error');
      
      const data = await response.json();
      
      if (data.status !== 'ok' || !data.data) {
        throw new Error('Location not found');
      }
      
      return API.parseAQIData(data.data);
    } catch (error) {
      console.error('Error fetching AQI from WAQI:', error);
      return API.getDemoData();
    }
  },

  // Fallback: Direct WAQI API for AQI by coordinates
  getAQIByCoordinatesDirect: async (lat, lon) => {
    try {
      const token = 'e52b20dc479791e02b4673f662efb54a4c72d08e';
      const response = await fetch(
        `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${token}`
      );
      
      if (!response.ok) throw new Error('API Error');
      
      const data = await response.json();
      
      if (data.status !== 'ok' || !data.data) {
        throw new Error('Cannot get AQI for location');
      }
      
      return API.parseAQIData(data.data);
    } catch (error) {
      console.error('Error fetching AQI by coordinates from WAQI:', error);
      return API.getDemoData();
    }
  },

  // Parse AQI response
  parseAQIData: (data) => {
    const aqi = data.aqi || 0;
    
    return {
      aqi: aqi,
      city: data.city?.name || 'Unknown',
      country: data.city?.country || '',
      timestamp: data.time?.iso || new Date().toISOString(),
      pollutants: {
        pm25: data.iaqi?.pm25?.v || null,
        pm10: data.iaqi?.pm10?.v || null,
        o3: data.iaqi?.o3?.v || null,
        no2: data.iaqi?.no2?.v || null,
        co: data.iaqi?.co?.v || null,
        so2: data.iaqi?.so2?.v || null
      },
      dominantPollutant: data.dominentpol || 'Unknown',
      latitude: data.city?.geo[0] || 0,
      longitude: data.city?.geo[1] || 0
    };
  },

  // Get demo data (for development/offline mode)
  getDemoData: () => {
    const baseAQI = Math.floor(Math.random() * 200);
    
    return {
      aqi: baseAQI,
      city: 'Demo City',
      country: 'Demo Country',
      timestamp: new Date().toISOString(),
      pollutants: {
        pm25: Math.floor(Math.random() * 200),
        pm10: Math.floor(Math.random() * 150),
        o3: Math.floor(Math.random() * 100),
        no2: Math.floor(Math.random() * 120),
        co: Math.floor(Math.random() * 80),
        so2: Math.floor(Math.random() * 100)
      },
      dominantPollutant: 'PM2.5',
      latitude: 40.7128,
      longitude: -74.0060
    };
  },

  // Get nearby cities/stations
  getNearbyStations: async (lat, lon) => {
    try {
      // Backend does not expose /nearby yet, so use WAQI around endpoint directly.
      return await API.getNearbyStationsWAQI(lat, lon);
    } catch (error) {
      console.error('Error fetching nearby stations:', error);
      return [];
    }
  },

  // Fallback: Direct WAQI API for nearby stations
  getNearbyStationsWAQI: async (lat, lon) => {
    try {
      const token = 'e52b20dc479791e02b4673f662efb54a4c72d08e';
      const response = await fetch(
        `https://api.waqi.info/feed/around:${lat},${lon}/?token=${token}`
      );
      
      if (!response.ok) throw new Error('WAQI API Error');
      
      const data = await response.json();
      
      if (data.status !== 'ok' || !data.data) {
        return [];
      }
      
      return data.data.map(station => ({
        id: station.uid,
        city: station.station.name,
        aqi: station.aqi,
        lat: station.lat,
        lon: station.lon,
        url: station.url
      }));
    } catch (error) {
      console.error('Error fetching nearby stations from WAQI:', error);
      return [];
    }
  },

  // Get city suggestions
  getCitySuggestions: async (query) => {
    try {
      // Simple search implementation - could be enhanced with a dedicated API
      const suggestions = [
        'New York, USA',
        'Los Angeles, USA',
        'Chicago, USA',
        'Houston, USA',
        'Phoenix, USA',
        'Philadelphia, USA',
        'San Antonio, USA',
        'San Diego, USA',
        'Dallas, USA',
        'San Jose, USA',
        'London, UK',
        'Paris, France',
        'Berlin, Germany',
        'Tokyo, Japan',
        'Sydney, Australia',
        'Mumbai, India',
        'Beijing, China',
        'São Paulo, Brazil'
      ];
      
      return suggestions.filter(city =>
        city.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  },

  // Calculate AQI from pollutant concentration using EPA breakpoints
  calculateAQIFromPollutant: (pollutant, concentration) => {
    // EPA AQI breakpoints for different pollutants
    const breakpoints = {
      pm25: [
        { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
        { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
        { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
        { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
        { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
        { cLow: 250.5, cHigh: 500.0, iLow: 301, iHigh: 500 }
      ],
      pm10: [
        { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
        { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
        { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
        { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
        { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
        { cLow: 425, cHigh: 604, iLow: 301, iHigh: 500 }
      ],
      o3: [ // 8-hour average in ppb
        { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
        { cLow: 55, cHigh: 70, iLow: 51, iHigh: 100 },
        { cLow: 71, cHigh: 85, iLow: 101, iHigh: 150 },
        { cLow: 86, cHigh: 105, iLow: 151, iHigh: 200 },
        { cLow: 106, cHigh: 200, iLow: 201, iHigh: 300 }
      ],
      no2: [ // ppb
        { cLow: 0, cHigh: 53, iLow: 0, iHigh: 50 },
        { cLow: 54, cHigh: 100, iLow: 51, iHigh: 100 },
        { cLow: 101, cHigh: 360, iLow: 101, iHigh: 150 },
        { cLow: 361, cHigh: 649, iLow: 151, iHigh: 200 },
        { cLow: 650, cHigh: 1249, iLow: 201, iHigh: 300 },
        { cLow: 1250, cHigh: 2049, iLow: 301, iHigh: 500 }
      ],
      so2: [ // ppb
        { cLow: 0, cHigh: 35, iLow: 0, iHigh: 50 },
        { cLow: 36, cHigh: 75, iLow: 51, iHigh: 100 },
        { cLow: 76, cHigh: 185, iLow: 101, iHigh: 150 },
        { cLow: 186, cHigh: 304, iLow: 151, iHigh: 200 },
        { cLow: 305, cHigh: 604, iLow: 201, iHigh: 300 },
        { cLow: 605, cHigh: 1004, iLow: 301, iHigh: 500 }
      ],
      co: [ // ppm
        { cLow: 0.0, cHigh: 4.4, iLow: 0, iHigh: 50 },
        { cLow: 4.5, cHigh: 9.4, iLow: 51, iHigh: 100 },
        { cLow: 9.5, cHigh: 12.4, iLow: 101, iHigh: 150 },
        { cLow: 12.5, cHigh: 15.4, iLow: 151, iHigh: 200 },
        { cLow: 15.5, cHigh: 30.4, iLow: 201, iHigh: 300 },
        { cLow: 30.5, cHigh: 50.4, iLow: 301, iHigh: 500 }
      ]
    };

    const bps = breakpoints[pollutant];
    if (!bps) return 0;

    // Find the appropriate breakpoint
    for (let bp of bps) {
      if (concentration >= bp.cLow && concentration <= bp.cHigh) {
        // EPA AQI formula
        const aqi = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (concentration - bp.cLow) + bp.iLow;
        return Math.round(aqi);
      }
    }

    // If above max breakpoint, return 500
    if (concentration > bps[bps.length - 1].cHigh) return 500;
    
    return 0;
  },

  // Convert PM2.5 to AQI (kept for backward compatibility)
  convertPM25ToAQI: (pm25) => {
    return API.calculateAQIFromPollutant('pm25', pm25);
  },

  // Determine which pollutant is causing the highest AQI
  getDominantPollutant: (pollutantAQIs) => {
    const pollutantNames = {
      pm25: 'PM2.5',
      pm10: 'PM10',
      no2: 'NO₂',
      so2: 'SO₂',
      o3: 'O₃',
      co: 'CO'
    };

    let maxAQI = 0;
    let dominant = 'PM2.5';

    for (const [key, value] of Object.entries(pollutantAQIs)) {
      if (value > maxAQI) {
        maxAQI = value;
        dominant = pollutantNames[key] || key.toUpperCase();
      }
    }

    return dominant;
  },

  // Fetch real historical pollution data from Open-Meteo Air Quality API
  fetchRealHistoricalData: async (lat, lon, days = 30) => {
    try {
      console.log(`Fetching real historical data for lat=${lat}, lon=${lon}, past_days=${days}`);
      
      const response = await fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?` +
        `latitude=${lat}&longitude=${lon}&` +
        `hourly=pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide&` +
        `past_days=${days}&timezone=auto`
      );

      if (!response.ok) {
        throw new Error(`Open-Meteo API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.hourly || !data.hourly.time) {
        throw new Error('No historical data available');
      }

      console.log(`✅ Received ${data.hourly.time.length} hours of real pollution data`);
  console.log('ℹ️ AQI Calculation: Using EPA standard for all pollutants (PM2.5, PM10, NO₂, SO₂, O₃, CO)');
  console.log('ℹ️ Final AQI = Maximum of all individual pollutant AQIs (worst pollutant drives the rating)');


      // Process hourly data into daily averages
      const dailyData = {};

      data.hourly.time.forEach((timestamp, index) => {
        const date = timestamp.split('T')[0]; // Extract date (YYYY-MM-DD)
        const pm25 = data.hourly.pm2_5?.[index] || 0;
        const pm10 = data.hourly.pm10?.[index] || 0;
        const no2 = data.hourly.nitrogen_dioxide?.[index] || 0;
        const so2 = data.hourly.sulphur_dioxide?.[index] || 0;
        const o3 = data.hourly.ozone?.[index] || 0;
        const co = data.hourly.carbon_monoxide?.[index] || 0;

        if (!dailyData[date]) {
          dailyData[date] = {
            pm25: [],
            pm10: [],
            no2: [],
            so2: [],
            o3: [],
            co: []
          };
        }

        dailyData[date].pm25.push(pm25);
        dailyData[date].pm10.push(pm10);
        dailyData[date].no2.push(no2);
        dailyData[date].so2.push(so2);
        dailyData[date].o3.push(o3);
        dailyData[date].co.push(co);
      });

      // Calculate daily averages and convert to AQI
      const historicalDataset = [];

      Object.keys(dailyData).sort().forEach(date => {
        
        const dayData = dailyData[date];
        
        // Calculate daily averages for all pollutants
        const avgPM25 = dayData.pm25.reduce((sum, val) => sum + val, 0) / dayData.pm25.length;
        const avgPM10 = dayData.pm10.reduce((sum, val) => sum + val, 0) / dayData.pm10.length;
        const avgNO2 = dayData.no2.reduce((s, v) => s + v, 0) / dayData.no2.length;
        const avgSO2 = dayData.so2.reduce((s, v) => s + v, 0) / dayData.so2.length;
        const avgO3 = dayData.o3.reduce((s, v) => s + v, 0) / dayData.o3.length;
        const avgCO = dayData.co.reduce((s, v) => s + v, 0) / dayData.co.length;
        
        // Calculate AQI for each pollutant
        const aqiPM25 = API.calculateAQIFromPollutant('pm25', avgPM25);
        const aqiPM10 = API.calculateAQIFromPollutant('pm10', avgPM10);
        const aqiNO2 = API.calculateAQIFromPollutant('no2', avgNO2);
        const aqiSO2 = API.calculateAQIFromPollutant('so2', avgSO2);
        const aqiO3 = API.calculateAQIFromPollutant('o3', avgO3);
        const aqiCO = API.calculateAQIFromPollutant('co', avgCO / 1000); // Convert µg/m³ to ppm
        
        // Take the MAXIMUM AQI (like WAQI does - report the worst pollutant)
        const finalAQI = Math.max(aqiPM25, aqiPM10, aqiNO2, aqiSO2, aqiO3, aqiCO);

        historicalDataset.push({
          date: date,
          aqi: Math.round(finalAQI),
          pm25: Math.round(avgPM25 * 10) / 10,
          pm10: Math.round(avgPM10 * 10) / 10,
          no2: Math.round(avgNO2 * 10) / 10,
          so2: Math.round(avgSO2 * 10) / 10,
          o3: Math.round(avgO3 * 10) / 10,
          co: Math.round(avgCO * 10) / 10,
          dominantPollutant: API.getDominantPollutant({ pm25: aqiPM25, pm10: aqiPM10, no2: aqiNO2, so2: aqiSO2, o3: aqiO3, co: aqiCO })
        });
      });

      console.log(`✅ Processed ${historicalDataset.length} days of historical AQI data`);
      
      // Show detailed sample with dominant pollutants
      const sampleData = historicalDataset.slice(-5);
      console.log('📊 Last 5 days of data (Open-Meteo source):');
      sampleData.forEach(day => {
        console.log(`  ${day.date}: AQI ${day.aqi} (driven by ${day.dominantPollutant})`);
      });

      return historicalDataset;

    } catch (error) {
      console.error('❌ Error fetching real historical data:', error);
      throw error;
    }
  },

  // Get historical data - NOW USES REAL API DATA
  getHistoricalData: async (city, days = 30) => {
    try {
      console.log(`📊 Fetching historical data for ${city}...`);
      
      // Fetch from MongoDB backend (same source as 7-day trend chart for consistency)
      const response = await fetch(
        `http://localhost:5001/api/aqi/history/${encodeURIComponent(city)}?days=${days}`
      );

      if (!response.ok) {
        throw new Error('Backend historical data unavailable');
      }

      const result = await response.json();
      const backendData = Array.isArray(result?.data) ? result.data : [];

      if (backendData.length === 0) {
        throw new Error('No historical data from backend');
      }

      console.log(`✅ Fetched ${backendData.length} days from MongoDB backend`);

      // Format the data for chart display
      const formattedData = backendData.map(item => ({
        date: Utils.formatDate(new Date(item.date)),
        aqi: Math.round(Number(item.aqi) || 0),
        pm25: item.pollutants?.pm25 || null,
        pm10: item.pollutants?.pm10 || null,
        o3: item.pollutants?.o3 || null,
        no2: item.pollutants?.no2 || null,
        so2: item.pollutants?.so2 || null,
        co: item.pollutants?.co || null
      }));

      return formattedData;

    } catch (error) {
      console.error('❌ Error in getHistoricalData:', error);
      console.warn('⚠️ Falling back to Open-Meteo data...');
      
      try {
        // Fallback to Open-Meteo if MongoDB unavailable
        const token = 'e52b20dc479791e02b4673f662efb54a4c72d08e';
        const currentResponse = await fetch(
          `https://api.waqi.info/feed/${encodeURIComponent(city)}/?token=${token}`
        );
        
        if (!currentResponse.ok) throw new Error('WAQI API Error');
        
        const currentData = await currentResponse.json();
        
        if (currentData.status !== 'ok' || !currentData.data) {
          throw new Error('Cannot get location coordinates');
        }

        const lat = currentData.data.city.geo[0];
        const lon = currentData.data.city.geo[1];
        const currentAQI = currentData.data.aqi;

        console.log(`📍 Location: ${city} (${lat}, ${lon}), Current AQI: ${currentAQI}`);

        // Fetch historical pollution data from Open-Meteo
        const realHistoricalData = await API.fetchRealHistoricalData(lat, lon, days);
        
        // Supplement with current WAQI data for today
        const today = new Date().toISOString().split('T')[0];
        const todayIndex = realHistoricalData.findIndex(item => item.date === today);
        
        if (todayIndex !== -1) {
          realHistoricalData[todayIndex].aqi = currentAQI;
          realHistoricalData[todayIndex].source = 'WAQI';
        } else {
          realHistoricalData.push({
            date: today,
            aqi: currentAQI,
            source: 'WAQI'
          });
        }

        return realHistoricalData.map(item => ({
          ...item,
          date: Utils.formatDate(new Date(item.date))
        }));
      } catch (fallbackError) {
        console.error('❌ Fallback failed:', fallbackError);
        return [];
      }
    }
  },

  // Fallback synthetic data generation (only used if APIs fail)
  generateSyntheticHistoricalData: async (city, days = 30) => {
    try {
      const token = 'e52b20dc479791e02b4673f662efb54a4c72d08e';
      const currentResponse = await fetch(
        `https://api.waqi.info/feed/${encodeURIComponent(city)}/?token=${token}`
      );
      
      let currentAQI = 60; // Default
      
      if (currentResponse.ok) {
        const currentData = await currentResponse.json();
        if (currentData.status === 'ok' && currentData.data) {
          currentAQI = currentData.data.aqi || 60;
        }
      }

      const data = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        let aqi;
        
        // For TODAY, use exact current AQI without variations
        if (i === 0) {
          aqi = currentAQI;
          console.log(`📍 Using exact current AQI for today: ${aqi}`);
        } else {
          // For past days, generate variations
          const dayOfWeek = date.getDay();
          const weekendVariation = (dayOfWeek === 0 || dayOfWeek === 6) ? -8 : 5;
          const seasonalTrend = Math.sin(i / 30 * Math.PI) * 20;
          const randomVariation = (Math.random() - 0.5) * 25;
          
          aqi = Math.max(0, Math.round(currentAQI + weekendVariation + seasonalTrend + randomVariation));
        }
        
        data.push({
          date: Utils.formatDate(date),
          aqi: aqi,
          pm25: Math.max(0, aqi * 0.8 + (Math.random() - 0.5) * 15),
          pm10: Math.max(0, aqi * 0.6 + (Math.random() - 0.5) * 10)
        });
      }
      
      console.log(`⚠️ Generated ${data.length} days of synthetic data (today's AQI: ${currentAQI})`);
      return data;
      
    } catch (error) {
      console.error('Error generating synthetic data:', error);
      // Last resort: basic synthetic data
      const data = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const baseValue = 50 + Math.random() * 100;
        const aqi = Math.max(0, Math.round(baseValue + Math.sin(i / 30 * Math.PI) * 30));
        
        data.push({
          date: Utils.formatDate(date),
          aqi: aqi,
          pm25: Math.max(0, aqi * 0.8),
          pm10: Math.max(0, aqi * 0.6)
        });
      }
      return data;
    }
  },

  // Get real hourly data from OpenWeatherMap API
  getHourlyData: async (lat, lon) => {
    try {
      // Using Open-Meteo free API for realistic hourly weather patterns
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5&timezone=auto&forecast_days=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.hourly && data.hourly.time) {
          return data.hourly.time.map((time, index) => {
            const hour = new Date(time).getHours();
            // Convert PM2.5/PM10 to AQI scale (approximate)
            const pm25 = data.hourly.pm2_5?.[index] || 0;
            const aqi = Math.round(Math.max(0, pm25 * 1.5 + (Math.random() - 0.5) * 10));
            
            return {
              hour: `${String(hour).padStart(2, '0')}:00`,
              aqi: aqi,
              pm25: Math.round(pm25),
              pm10: data.hourly.pm10?.[index] || 0
            };
          });
        }
      }
      throw new Error('Real hourly data unavailable');
    } catch (error) {
      console.error('Error fetching real hourly data:', error);
      // Fallback to realistic generated hourly data
      const data = [];
      const baseValue = 60;
      
      for (let i = 0; i < 24; i++) {
        const hour = i;
        let variation = 0;
        if (hour >= 6 && hour <= 9) variation = 20; // Morning peak
        if (hour >= 17 && hour <= 20) variation = 15; // Evening peak
        if (hour >= 11 && hour <= 15) variation = -10; // Afternoon dip
        
        const aqi = Math.max(0, baseValue + variation + (Math.random() - 0.5) * 15);
        
        data.push({
          hour: `${String(hour).padStart(2, '0')}:00`,
          aqi: Math.round(aqi)
        });
      }
      return data;
    }
  },

  // Store AQI data to MongoDB backend
  storeAQIToDatabase: async (aqiData) => {
    try {
      if (!aqiData || !aqiData.city) {
        console.warn('⚠️ Invalid AQI data for storing');
        return false;
      }

      const response = await fetch('http://localhost:5001/api/aqi/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          city: aqiData.city,
          country: aqiData.country || '',
          latitude: aqiData.latitude,
          longitude: aqiData.longitude,
          aqi: aqiData.aqi,
          pollutants: aqiData.pollutants || {},
          dominantPollutant: aqiData.dominantPollutant || 'unknown',
          timestamp: aqiData.timestamp || new Date().toISOString(),
          source: 'Manual'
        })
      });

      if (!response.ok) {
        console.warn(`⚠️ Failed to store AQI for ${aqiData.city}:`, response.status);
        return false;
      }

      const result = await response.json();
      if (result.success) {
        console.log(`💾 Successfully stored AQI data for ${aqiData.city} in MongoDB`);
        return true;
      }
      return false;
    } catch (error) {
      console.warn(`⚠️ Error storing AQI data:`, error.message);
      // Silent fail - don't block user experience
      return false;
    }
  }
};
