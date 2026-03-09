// Map Module using Leaflet.js

const AQIMap = {
  map: null,
  markers: [],
  currentMarker: null,
  heatmapLayer: null,
  heatmapEnabled: false,

  getLocationMode: () => Utils.storage.get('locationMode', 'auto'),
  setLocationMode: (mode) => Utils.storage.set('locationMode', mode),
  getPreferredManualCity: () => Utils.storage.get('preferredLocationCity', ''),
  setPreferredManualCity: (city) => Utils.storage.set('preferredLocationCity', city),

  // Initialize the map
  init: () => {
    const mapContainer = document.getElementById('aqiMap');
    if (!mapContainer) return;

    // Create map centered on a default location
    AQIMap.map = L.map('aqiMap').setView([20, 0], 3);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      tileSize: 256
    }).addTo(AQIMap.map);

    // Add geolocation button
    document.getElementById('geoBtn')?.addEventListener('click', () => {
      AQIMap.setLocationMode('auto');
      AQIMap.getCurrentLocation({ forceGps: true });
    });

    const locationInput = document.getElementById('locationInput');
    if (locationInput) {
      locationInput.value = 'Detecting your location...';
    }

    // Use preferred manual city when selected by user; otherwise auto-detect.
    const preferredCity = AQIMap.getPreferredManualCity();
    if (AQIMap.getLocationMode() === 'manual' && preferredCity) {
      AQIMap.searchLocation(preferredCity, 'manual');
    } else {
      AQIMap.getCurrentLocation();
    }
  },

  // Search location
  searchLocation: async (city, source = 'manual') => {
    try {
      const requestedCity = String(city || '').trim();
      if (!requestedCity) return;

      Utils.toggleLoading(true);
      const data = await API.getAQI(requestedCity);

      if (data?.isDemo) {
        Utils.showNotification('Live AQI unavailable for this location right now. Please try nearby city or current location.', 'warning');
        Utils.toggleLoading(false);
        return;
      }

      if (source === 'manual') {
        AQIMap.setLocationMode('manual');
        AQIMap.setPreferredManualCity(requestedCity);
      }
      
      AQIMap.updateMap(data);
      await Dashboard.updateDashboard(data);
      await Charts.updateAll(data);
      PlantRecommendation.updateRecommendations(data);
      
      // Update new modules
      if (typeof Advisor !== 'undefined') {
        Advisor.updateAdvisor(data);
      }
      if (typeof Chatbot !== 'undefined') {
        Chatbot.updateContext(data);
      }
      if (typeof GlobalRanking !== 'undefined') {
        GlobalRanking.displayUserComparison(data.city, data.aqi);
      }
      
      // Save to history
      Utils.storage.set('lastLocation', {
        city: data.city,
        stationCity: data.city,
        aqi: data.aqi,
        latitude: data.latitude,
        longitude: data.longitude,
          pollutants: data.pollutants || {},
          timestamp: new Date().toISOString()
      });
      
      // Update heatmap if enabled
      await AQIMap.updateHeatmap(data.latitude, data.longitude);
      
      Utils.toggleLoading(false);
    } catch (error) {
      console.error('Error searching location:', error);
      Utils.showNotification('Failed to fetch AQI data', 'error');
      Utils.toggleLoading(false);
    }
  },

  // Get current location
  getCurrentLocation: (options = {}) => {
    const forceGps = Boolean(options?.forceGps);
    console.log('🔍 getCurrentLocation() called');
    
    if (!navigator.geolocation) {
      console.log('❌ Geolocation NOT supported by browser');
      Utils.showNotification('Geolocation not supported. Loading saved/default location.', 'info');
      AQIMap.loadFallbackLocation();
      return;
    }

    console.log('✅ Browser supports geolocation, requesting permission...');
    Utils.toggleLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          console.log(`✅ GPS SUCCESS: ${latitude}, ${longitude}`);

          AQIMap.setLocationMode('auto');

          // Validate GPS against IP-based coarse location and auto-correct if mismatch is very large.
          let selectedLat = latitude;
          let selectedLon = longitude;
          let selectedSource = 'gps';

          const ipLocation = await AQIMap.getIPBasedLocation();
          if (
            ipLocation?.latitude !== null &&
            ipLocation?.longitude !== null
          ) {
            const driftKm = AQIMap.calculateDistanceKm(
              latitude,
              longitude,
              ipLocation.latitude,
              ipLocation.longitude
            );

            console.log(`📏 GPS vs IP drift: ${driftKm.toFixed(1)} km`);

            if (driftKm > 250 && !forceGps) {
              selectedLat = ipLocation.latitude;
              selectedLon = ipLocation.longitude;
              selectedSource = 'ip';
              console.warn('⚠️ Large GPS/IP mismatch detected. Using IP location for this session.');
            } else if (driftKm > 250 && forceGps) {
              console.warn('⚠️ Large GPS/IP mismatch detected, but keeping GPS because location button was used.');
            }
          }

          const data = await API.getAQIByCoordinates(selectedLat, selectedLon);
          if (data?.isDemo) {
            throw new Error('Live AQI unavailable for GPS coordinates');
          }
          console.log('📡 WAQI API returned station:', data.city);
          const stationCity = data.city;

          // Get location name (fallback to station city if reverse-geocode fails)
          const locationName = await Utils.getLocationName(selectedLat, selectedLon);
          console.log('🏙️ Reverse geocode returned:', locationName);
          const resolvedCity = locationName || stationCity || 'Current Location';
          console.log(`✅ FINAL CITY: ${resolvedCity} (station: ${stationCity}, source: ${selectedSource})`);

          data.city = resolvedCity;
          data.stationCity = stationCity;

          const locationInput = document.getElementById('locationInput');
          if (locationInput) {
            locationInput.value = resolvedCity;
            console.log(`📝 Set input field to: ${resolvedCity}`);
          }

          AQIMap.updateMap(data);
          await Dashboard.updateDashboard(data);
          await Charts.updateAll(data);
          PlantRecommendation.updateRecommendations(data);

          if (typeof Advisor !== 'undefined') {
            Advisor.updateAdvisor(data);
          }
          if (typeof Chatbot !== 'undefined') {
            Chatbot.updateContext(data);
          }
          if (typeof GlobalRanking !== 'undefined') {
            GlobalRanking.displayUserComparison(data.city, data.aqi);
          }

          Utils.storage.set('lastLocation', {
            city: resolvedCity,
            stationCity: stationCity,
            aqi: data.aqi,
            latitude: selectedLat,
            longitude: selectedLon,
            pollutants: data.pollutants || {},
            timestamp: new Date().toISOString()
          });

          await AQIMap.updateHeatmap(selectedLat, selectedLon);
          Utils.toggleLoading(false);
        } catch (error) {
          console.error('Error resolving current location AQI:', error);
          Utils.showNotification('Could not fetch AQI for current location. Loading fallback.', 'error');
          Utils.toggleLoading(false);
          AQIMap.loadFallbackLocation();
        }
      },
      (error) => {
        console.error('❌ Geolocation FAILED:', error.code, error.message);
        if (error.code === 1) {
          console.log('🚫 User DENIED location permission');
          Utils.showNotification('Location access denied. Using IP-based location.', 'warning');
        } else if (error.code === 2) {
          console.log('📍 Position unavailable');
        } else if (error.code === 3) {
          console.log('⏱️ Geolocation timeout');
        }
        Utils.toggleLoading(false);
        AQIMap.loadFallbackLocation();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0  // No GPS cache - always get fresh location
      }
    );
  },

  // Fallback when auto geolocation fails: prefer IP city, then a neutral default
  loadFallbackLocation: async () => {
    try {
      console.log('🔄 loadFallbackLocation() - GPS failed, trying alternatives...');
      const locationInput = document.getElementById('locationInput');

      // 1) Prefer approximate current location from network IP
      const ipLocation = await AQIMap.getIPBasedLocation();
      if (ipLocation?.latitude !== null && ipLocation?.longitude !== null) {
        const ipCity = ipLocation.city || 'Current Location';
        console.log(`🌐 IP-based location: ${ipCity} (${ipLocation.latitude}, ${ipLocation.longitude})`);
        if (locationInput) {
          locationInput.value = ipCity;
        }

        const data = await API.getAQIByCoordinates(ipLocation.latitude, ipLocation.longitude);
        if (data?.isDemo) {
          throw new Error('Live AQI unavailable for IP coordinates');
        }
        data.city = ipCity;
        data.stationCity = data.stationCity || data.city;

        AQIMap.updateMap(data);
        await Dashboard.updateDashboard(data);
        await Charts.updateAll(data);
        PlantRecommendation.updateRecommendations(data);

        if (typeof Advisor !== 'undefined') {
          Advisor.updateAdvisor(data);
        }
        if (typeof Chatbot !== 'undefined') {
          Chatbot.updateContext(data);
        }
        if (typeof GlobalRanking !== 'undefined') {
          GlobalRanking.displayUserComparison(data.city, data.aqi);
        }

        Utils.storage.set('lastLocation', {
          city: data.city,
          stationCity: data.stationCity || data.city,
          aqi: data.aqi,
          latitude: data.latitude,
          longitude: data.longitude,
          pollutants: data.pollutants || {},
          timestamp: new Date().toISOString()
        });

        await AQIMap.updateHeatmap(data.latitude, data.longitude);
        return;
      }

      // 2) Final fallback: neutral default city (avoid stale last searched city)
      const fallbackCity = 'New York';
      console.log(`🏙️ Using default fallback: ${fallbackCity}`);
      if (locationInput) {
        locationInput.value = fallbackCity;
      }
      await AQIMap.searchLocation(fallbackCity, 'auto');
    } catch (error) {
      console.error('Fallback location load failed:', error);
      Utils.showNotification('Failed to load fallback location data', 'error');
    }
  },

  // Approximate location fallback (no browser geolocation permission needed)
  getIPBasedLocation: async () => {
    try {
      console.log('🌐 Fetching IP-based location from ipapi.co...');
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) {
        console.log('❌ IP lookup API returned error');
        return { city: null, latitude: null, longitude: null };
      }
      const data = await response.json();
      console.log('📡 IP lookup result:', data);
      const city = data?.city || null;
      const latitude = Number(data?.latitude);
      const longitude = Number(data?.longitude);
      console.log(`✅ IP Location: ${city || 'null'} (${latitude}, ${longitude})`);

      return {
        city,
        latitude: Number.isFinite(latitude) ? latitude : null,
        longitude: Number.isFinite(longitude) ? longitude : null
      };
    } catch (error) {
      console.warn('❌ IP-based location lookup failed:', error);
      return { city: null, latitude: null, longitude: null };
    }
  },

  // Haversine distance in kilometers between two coordinates
  calculateDistanceKm: (lat1, lon1, lat2, lon2) => {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const earthRadiusKm = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  },

  // Update map with AQI data
  updateMap: (data) => {
    // Remove current marker
    if (AQIMap.currentMarker) {
      AQIMap.map.removeLayer(AQIMap.currentMarker);
    }

    // Add new marker
    const { color } = Utils.getAQICategory(data.aqi);
    const markerColor = AQIMap.getMarkerColor(data.aqi);
    
    const icon = L.divIcon({
      html: `<div style="
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: ${markerColor};
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      ">${data.aqi}</div>`,
      className: 'aqi-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });

    AQIMap.currentMarker = L.marker([data.latitude, data.longitude], { icon })
      .addTo(AQIMap.map)
      .bindPopup(`
        <div style="font-family: Arial; padding: 10px;">
          <h3 style="margin: 0 0 10px 0; color: #10b981;">${data.city}</h3>
          <p style="margin: 5px 0;"><strong>AQI:</strong> ${data.aqi}</p>
          <p style="margin: 5px 0;"><strong>Category:</strong> ${Utils.getAQICategory(data.aqi).category}</p>
          <p style="margin: 5px 0;"><strong>Dominant Pollutant:</strong> ${data.dominantPollutant}</p>
          <p style="margin: 10px 0 0 0; color: #64748b; font-size: 0.85rem;">Click for details</p>
        </div>
      `)
      .openPopup();

    // Center map on location
    AQIMap.map.setView([data.latitude, data.longitude], 10);

    // Load nearby stations
    AQIMap.loadNearbyStations(data.latitude, data.longitude);
  },

  // Load nearby AQI stations
  loadNearbyStations: async (lat, lon) => {
    try {
      const stations = await API.getNearbyStations(lat, lon);
      
      // Clear old markers
      AQIMap.markers.forEach(marker => AQIMap.map.removeLayer(marker));
      AQIMap.markers = [];

      // Add station markers
      stations.slice(0, 10).forEach(station => {
        const markerColor = AQIMap.getMarkerColor(station.aqi);
        const icon = L.divIcon({
          html: `<div style="
            width: 35px;
            height: 35px;
            border-radius: 50%;
            background: ${markerColor};
            border: 2px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            opacity: 0.7;
          ">${station.aqi}</div>`,
          className: 'station-marker',
          iconSize: [35, 35],
          iconAnchor: [17.5, 17.5],
          popupAnchor: [0, -17.5]
        });

        const marker = L.marker([station.lat, station.lon], { icon })
          .addTo(AQIMap.map)
          .bindPopup(`
            <div style="font-family: Arial; padding: 8px;">
              <p style="margin: 0; font-weight: bold;">${station.city}</p>
              <p style="margin: 5px 0;">AQI: ${station.aqi}</p>
            </div>
          `);

        AQIMap.markers.push(marker);
      });
    } catch (error) {
      console.error('Error loading nearby stations:', error);
    }
  },

  // Get marker color based on AQI value
  getMarkerColor: (aqi) => {
    const { color } = Utils.getAQICategory(aqi);
    return color;
  },

  // Create pollution heatmap overlay

  // Heatmap placeholder to avoid runtime errors until heatmap feature is implemented
  updateHeatmap: async (lat, lon) => {
    return;
  }

};

// Initialize map when DOM is ready
document.addEventListener('DOMContentLoaded', AQIMap.init);
