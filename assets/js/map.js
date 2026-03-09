// Map Module using Leaflet.js

const AQIMap = {
  map: null,
  markers: [],
  currentMarker: null,
  heatmapLayer: null,
  heatmapEnabled: false,

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
    document.getElementById('geoBtn')?.addEventListener('click', AQIMap.getCurrentLocation);

    const locationInput = document.getElementById('locationInput');
    if (locationInput) {
      locationInput.value = 'Detecting your location...';
    }

    // Get initial location using browser geolocation.
    AQIMap.getCurrentLocation();
  },

  // Search location
  searchLocation: async (city) => {
    try {
      Utils.toggleLoading(true);
      const data = await API.getAQI(city);
      
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
  getCurrentLocation: () => {
    Utils.toggleLoading(true);
    Utils.getDeviceCoordinates({ timeout: 10000, maximumAge: 0 })
      .then(async ({ latitude, longitude }) => {
        try {
          const data = await API.getAQIByCoordinates(latitude, longitude);
          const stationCity = data.city;

          // Get location name (fallback to station city if reverse-geocode fails)
          const locationName = await Utils.getLocationName(latitude, longitude);
          const resolvedCity = locationName || stationCity || 'Current Location';

          data.city = resolvedCity;
          data.stationCity = stationCity;

          const locationInput = document.getElementById('locationInput');
          if (locationInput) {
            locationInput.value = resolvedCity;
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
            latitude: latitude,
            longitude: longitude,
            pollutants: data.pollutants || {},
            timestamp: new Date().toISOString()
          });

          await AQIMap.updateHeatmap(latitude, longitude);
          Utils.toggleLoading(false);
        } catch (error) {
          console.error('Error resolving current location AQI:', error);
          Utils.showNotification('Could not fetch AQI for current location. Loading fallback.', 'error');
          Utils.toggleLoading(false);
          AQIMap.loadFallbackLocation();
        }
      })
      .catch((error) => {
        const code = error?.code;
        console.error('❌ Geolocation FAILED:', code, error?.message || error);
        if (code === 1) {
          // Permission denied: drop saved location so stale coordinates are not repeatedly forced.
          Utils.storage.remove('lastLocation');
          Utils.showNotification('Location access denied. Loading default location.', 'warning');
        } else {
          Utils.showNotification('Unable to detect current location. Loading saved/default location.', 'info');
        }
        Utils.toggleLoading(false);
        AQIMap.loadFallbackLocation();
      });
  },

  // Fallback when geolocation fails: use last saved location if available, else default city.
  loadFallbackLocation: async () => {
    try {
      const locationInput = document.getElementById('locationInput');
      const lastLocation = Utils.storage.get('lastLocation', null);
      const lastTimestamp = lastLocation?.timestamp ? new Date(lastLocation.timestamp).getTime() : 0;
      const maxFallbackAgeMs = 24 * 60 * 60 * 1000; // 24 hours
      const isRecentSavedLocation = Number.isFinite(lastTimestamp) && (Date.now() - lastTimestamp) <= maxFallbackAgeMs;

      if (
        lastLocation &&
        isRecentSavedLocation &&
        Number.isFinite(lastLocation.latitude) &&
        Number.isFinite(lastLocation.longitude)
      ) {
        if (locationInput) {
          locationInput.value = lastLocation.city || 'Last Known Location';
        }

        const data = await API.getAQIByCoordinates(lastLocation.latitude, lastLocation.longitude);
        data.city = lastLocation.city || data.city || 'Last Known Location';
        data.stationCity = lastLocation.stationCity || data.stationCity || data.city;

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

        await AQIMap.updateHeatmap(data.latitude, data.longitude);
        return;
      }

      // Final fallback: neutral default city
      const fallbackCity = 'New York';
      if (locationInput) {
        locationInput.value = fallbackCity;
      }
      await AQIMap.searchLocation(fallbackCity);
    } catch (error) {
      console.error('Fallback location load failed:', error);
      Utils.showNotification('Failed to load fallback location data', 'error');
    }
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
