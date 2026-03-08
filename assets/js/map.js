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
    document.getElementById('geoBtn').addEventListener('click', AQIMap.getCurrentLocation);

    // Get initial location
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
    if (navigator.geolocation) {
      Utils.toggleLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const data = await API.getAQIByCoordinates(latitude, longitude);
          const stationCity = data.city;
          
          // Get location name
          const locationName = await Utils.getLocationName(latitude, longitude);
          data.city = locationName;
          data.stationCity = stationCity;
          
          document.getElementById('locationInput').value = locationName;
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
          
          // Save location with coordinates
          Utils.storage.set('lastLocation', {
            city: locationName,
            stationCity: stationCity,
            aqi: data.aqi,
            latitude: latitude,
            longitude: longitude,
            pollutants: data.pollutants || {},
            timestamp: new Date().toISOString()
          });
          
          // Update heatmap if enabled
          await AQIMap.updateHeatmap(latitude, longitude);
          
          Utils.toggleLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          Utils.showNotification('Unable to get your location', 'error');
          Utils.toggleLoading(false);
        }
      );
    } else {
      Utils.showNotification('Geolocation not supported', 'error');
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
