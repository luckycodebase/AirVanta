# Airlytics - Environmental Monitoring Dashboard

A modern, professional environmental monitoring platform that provides real-time air quality index (AQI) data, interactive maps, predictions, and plant recommendations.

## Features

### 🌍 Real-Time AQI Monitoring
- Real-time air quality data from multiple sources
- Automatic location detection via GPS
- Manual city search with autocomplete
- Detailed pollutant breakdown (PM2.5, PM10, O₃, NO₂, CO, SO₂)

### 🗺️ Interactive Map
- Leaflet.js-powered interactive map
- Color-coded AQI markers
- Nearby station detection
- Click for detailed information

### 📊 Data Visualization
- 7-day AQI trend chart
- Hourly variation charts
- 30-day historical trends
- Pollutant breakdown pie charts

### 🔮 30-Day AQI Prediction
- Time-series forecasting using exponential smoothing
- Weekly pattern analysis
- Seasonal adjustments
- Dangerous day prediction alerts

### 🌿 Smart Plant Recommendations
- 15+ air-purifying plants
- Efficiency-based ranking
- Pollutant-specific matching
- Care instructions and compatibility notes

### 💡 Health & Environmental Tips
- AQI-based health recommendations
- Environmental awareness content
- Best practices for air quality management

### 🌙 Dark Mode
- Toggle between light and dark themes
- Persistent user preference
- Optimized for eye comfort

## Project Structure

```
Website/
├── index.html
├── assets/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── utils.js             # Utility functions
│   │   ├── api.js               # API integration
│   │   ├── dashboard.js         # Dashboard UI updates
│   │   ├── map.js               # Leaflet map integration
│   │   ├── charts.js            # Chart.js visualizations
│   │   ├── prediction.js        # AQI forecasting
│   │   ├── plantRecommendation.js # Plant system
│   │   └── main.js              # Main application logic
│   ├── data/
│   │   └── plants.json          # Plant database
│   └── images/
└── README.md
```

## Technologies Used

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Maps**: Leaflet.js
- **Charts**: Chart.js
- **API**: WAQI (World Air Quality Index)
- **Data**: JSON-based plant database
- **Styling**: CSS Grid, Flexbox, CSS Variables

## Getting Started

### Prerequisites
- Modern web browser with JavaScript enabled
- Internet connection for API calls

### Installation

1. Clone/download the project
2. Open `index.html` in your web browser
3. Grant location permissions for automatic location detection
4. Or enter a city name to search

## How to Use

### 1. Get AQI Data
- Click "Use Location" button for automatic detection
- Or type a city name and click "Search"
- View real-time AQI and pollutant levels

### 2. View Interactive Map
- Scroll to the "Interactive AQI Map" section
- Click on markers to see detailed information
- Map shows nearby monitoring stations

### 3. Check Forecast
- Go to "30-Day Air Quality Forecast" section
- Switch between AQI, PM2.5, and PM10 predictions
- View predicted dangerous days

### 4. Get Plant Recommendations
- Scroll to "Plants That Can Improve Your Air"
- See AI-recommended plants for your air quality
- Filter by efficiency level
- Check plant care instructions

### 5. Toggle Dark Mode
- Click the moon icon in the top navigation
- Preference is saved automatically

## API Integration

### WAQI API
- Provides real-time AQI data
- Free tier available
- Token: Integrated in api.js
- Supports 30,000+ monitoring stations worldwide

### Geolocation & Reverse Geocoding
- Browser Geolocation API for GPS
- OpenStreetMap Nominatim for reverse geocoding

## Data Files

### plants.json
Contains 15 plant types with:
- Pollutants reduced
- Efficiency percentage
- Side effects and safety info
- Best placement recommendations
- Difficulty level
- Watering schedule

## Scripts Overview

### utils.js
- AQI category calculations
- Health warning messages
- Date formatting
- Local storage management
- Notification system

### api.js
- WAQI API integration
- Historical data generation
- Nearby stations retrieval
- City suggestions

### dashboard.js
- Dashboard UI updates
- AQI display management
- Pollutant card updates

### map.js
- Leaflet map initialization
- Marker management
- Geolocation handling
- Station loading

### charts.js
- Chart.js initialization
- Multiple chart types
- Real-time chart updates

### prediction.js
- Exponential smoothing forecasting
- Moving average calculations
- Dangerous day detection

### plantRecommendation.js
- Plant recommendation algorithm
- Filtering and ranking
- UI rendering

### main.js
- Application initialization
- Dark mode management
- Navigation handling

## AQI Scale & Colors

| AQI Range | Category | Color | Recommendation |
|-----------|----------|-------|-----------------|
| 0-50 | Good | 🟢 Green | Enjoy the air! |
| 51-100 | Moderate | 🟡 Yellow | Sensitive groups limit exposure |
| 101-150 | Unhealthy for Sensitive Groups | 🟠 Orange | Reduce outdoor exposure |
| 151-200 | Unhealthy | 🔴 Red | Everyone limit outdoor exposure |
| 201-300 | Very Unhealthy | 🟣 Purple | Avoid outdoor activities |
| 300+ | Hazardous | 🟤 Maroon | Stay indoors |

## Prediction Algorithm

The 30-day forecast uses:
1. **Exponential Smoothing**: Weighted average of past values
2. **Seasonal Patterns**: Weekly and daily cycles
3. **Trend Analysis**: Short-term direction
4. **Random Variation**: Natural fluctuations

## Plant Recommendation Logic

### For Good AQI (0-50)
- Recommend maintenance plants
- Focus on efficiency >= 60%

### For Moderate AQI (51-100)
- Recommend CO and NO₂ reducers
- Focus on efficiency >= 70%

### For Unhealthy AQI (101-150)
- Recommend efficient plants
- Focus on efficiency >= 75%

### For Very Unhealthy/Hazardous (151+)
- Recommend most efficient plants
- Focus on efficiency >= 80%

## Browser Compatibility

- Chrome/Chromium (Latest)
- Firefox (Latest)
- Safari (Latest)
- Edge (Latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Optimizations

- Lazy loading of charts and maps
- CSS animations with hardware acceleration
- Debounced search functionality
- Local storage for user preferences
- Efficient DOM manipulation

## Known Limitations

- WAQI free API has rate limits
- Predictions are based on historical patterns
- Plant data is simplified for UX
- Some features depend on JavaScript enabled

## Future Enhancements

- [ ] Real-time notifications for air quality alerts
- [ ] Multi-language support
- [ ] Advanced meteorological data
- [ ] Custom user watchlists
- [ ] Export data as PDF/CSV
- [ ] Offline functionality with Service Workers
- [ ] Integration with more APIs (EPA, Sentinel-5P)
- [ ] Machine learning predictions
- [ ] Community contributions system

## Troubleshooting

### Map not loading?
- Check internet connection
- Clear browser cache
- Allow location permissions
- Check browser console for errors

### Charts not displaying?
- Ensure JavaScript is enabled
- Check that canvas elements exist
- Verify Chart.js library is loaded

### AQI data not updating?
- Check API rate limits
- Verify location spelling
- Try refreshing the page
- Check browser console

### Dark mode not persisting?
- Check if localStorage is enabled
- Clear site data and try again
- Check browser privacy settings

## Contributing

This is a demonstration project. Feel free to fork, modify, and improve!

## License

This project is open source and available under the MIT License.

## Author

Created as a professional environmental monitoring dashboard.

## Support & Contact

For issues, questions, or suggestions, please check the browser console for error messages or contact the development team.

---

**Last Updated**: March 2024
**Version**: 1.0
**Status**: Production Ready
