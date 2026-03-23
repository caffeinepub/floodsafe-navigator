# FloodSafe Navigator

## Current State
- Map centered on NYC with hardcoded NYC road segments
- Location search via Nominatim (OpenStreetMap) worldwide
- Route planner panel with From/To inputs and Find Safe Route button
- Color-coded road segments (red/yellow/green) and static route calculation
- No geolocation, no weather, no India-specific focus

## Requested Changes (Diff)

### Add
- Geolocation button: "Use My Location" on the From field to auto-fill current GPS coordinates
- Weather report panel on the map screen showing: temperature, condition (rain/sunny/cloudy), humidity, wind speed — fetched from Open-Meteo API using the user's current or searched location coordinates
- ETA display: show "X mins away" prominently on the route result card
- India-focused map: default center on India (lat 20.5937, lng 78.9629), zoom 5
- India country bias on Nominatim search (add `countrycodes=in` param but also support worldwide)
- Sample Indian road segments (Delhi, Mumbai, Chennai, Kolkata, Bangalore) for demo flood overlay

### Modify
- Map default center and zoom from NYC → India
- Nominatim search query: add `countrycodes=in` to bias results toward India
- Route result card: make ETA (X mins away) the most prominent stat
- Alert banner: change from NYC-specific to India flood advisory
- Stats/locations: update from NYC to Indian cities

### Remove
- NYC-specific hardcoded locations, road segments, and alert text
- NYC_LOCATIONS array and NYC-specific HIGH_RISK_ZONES

## Implementation Plan
1. Replace NYC map data with India-focused sample flood segments across major Indian highways/roads
2. Change map default center to India (20.5937, 78.9629), zoom 5
3. Add geolocation button next to From input — calls `navigator.geolocation.getCurrentPosition`, reverse geocodes with Nominatim, sets fromLoc
4. Add weather widget: after fromLoc or userLocation is set, fetch `https://api.open-meteo.com/v1/forecast?latitude=X&longitude=Y&current_weather=true&hourly=relativehumidity_2m,windspeed_10m` and display temp, weather code description, humidity, wind in a small card on the map or below the route planner
5. Update route result to prominently show ETA as "X mins away" with large text
6. Update Nominatim search to include `countrycodes=in` for India-biased results
7. Update flood alert banner to India context
