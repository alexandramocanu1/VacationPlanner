import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import WebView from 'react-native-webview';
import { Location } from '../types';
import { GOOGLE_MAPS_API_KEY } from '../theme';

// Centre aproximative per țară
const COUNTRY_CENTERS: Record<string, { lat: number; lng: number; zoom: number }> = {
  IT: { lat: 41.9, lng: 12.5, zoom: 6 },
  FR: { lat: 46.2, lng: 2.2, zoom: 6 },
  ES: { lat: 40.4, lng: -3.7, zoom: 6 },
  GR: { lat: 39.0, lng: 22.0, zoom: 6 },
  TR: { lat: 39.9, lng: 32.9, zoom: 6 },
  AT: { lat: 47.5, lng: 14.5, zoom: 7 },
  HR: { lat: 45.1, lng: 15.2, zoom: 7 },
  PT: { lat: 39.4, lng: -8.2, zoom: 7 },
  DE: { lat: 51.2, lng: 10.5, zoom: 6 },
  HU: { lat: 47.2, lng: 19.5, zoom: 7 },
  BG: { lat: 42.7, lng: 25.5, zoom: 7 },
  RO: { lat: 45.9, lng: 24.9, zoom: 7 },
  MT: { lat: 35.9, lng: 14.5, zoom: 11 },
  JP: { lat: 36.2, lng: 138.3, zoom: 5 },
  TH: { lat: 15.9, lng: 100.9, zoom: 6 },
  US: { lat: 39.5, lng: -98.4, zoom: 4 },
  GB: { lat: 55.4, lng: -3.4, zoom: 6 },
  NL: { lat: 52.1, lng: 5.3, zoom: 7 },
  CH: { lat: 46.8, lng: 8.2, zoom: 8 },
  CZ: { lat: 49.8, lng: 15.5, zoom: 7 },
  PL: { lat: 51.9, lng: 19.1, zoom: 6 },
};

interface MapViewProps {
  countryCode?: string;
  countryName?: string;
  locations?: Location[];
  height?: number;
  showRoute?: boolean;
  travelMode?: 'walking' | 'driving' | 'transit';
  accommodationLat?: number;
  accommodationLng?: number;
  accommodationName?: string;
}

export default function MapComponent({
  countryCode,
  locations = [],
  height = 300,
  showRoute = false,
  travelMode = 'driving',
  accommodationLat,
  accommodationLng,
  accommodationName,
}: MapViewProps) {
  const validLocations = locations.filter(l => l.lat !== 0 && l.lng !== 0);

  const mapHtml = useMemo(() => {
    // Determină centrul și zoom-ul
    let centerLat: number;
    let centerLng: number;
    let zoom: number;

    if (validLocations.length > 0) {
      centerLat = validLocations.reduce((s, l) => s + l.lat, 0) / validLocations.length;
      centerLng = validLocations.reduce((s, l) => s + l.lng, 0) / validLocations.length;
      zoom = validLocations.length === 1 ? 14 : 13;
    } else if (countryCode && COUNTRY_CENTERS[countryCode]) {
      const cc = COUNTRY_CENTERS[countryCode];
      centerLat = cc.lat;
      centerLng = cc.lng;
      zoom = cc.zoom;
    } else {
      centerLat = 45;
      centerLng = 25;
      zoom = 6;
    }

    // Pinuri pentru locații — roz numerotat
    const markersJs = validLocations.map((loc, i) => `
      (function() {
        const pinSvg = \`
          <svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z" fill="#E94560" stroke="white" stroke-width="2"/>
            <circle cx="18" cy="18" r="11" fill="white" fill-opacity="0.25"/>
            <text x="18" y="23" text-anchor="middle" font-size="13" font-weight="bold" fill="white" font-family="Arial,sans-serif">${i + 1}</text>
          </svg>
        \`;
        const marker${i} = new google.maps.Marker({
          position: { lat: ${loc.lat}, lng: ${loc.lng} },
          map: map,
          title: ${JSON.stringify(loc.name)},
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(pinSvg),
            scaledSize: new google.maps.Size(36, 44),
            anchor: new google.maps.Point(18, 44),
          },
          zIndex: ${i + 10},
        });
        const iw${i} = new google.maps.InfoWindow({
          content: '<div style="color:#000;font-weight:600;font-size:14px;padding:4px 8px;max-width:200px;">${i + 1}. ${loc.name.replace(/['"\\]/g, '')}</div>'
        });
        marker${i}.addListener('click', () => iw${i}.open(map, marker${i}));
      })();
    `).join('\n');

    // Pin cazare — galben
    const accommodationJs = (accommodationLat && accommodationLng) ? `
      (function() {
        const hotelSvg = \`
          <svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 26 18 26s18-12.5 18-26C36 8.06 27.94 0 18 0z" fill="#F5A623" stroke="white" stroke-width="2"/>
            <text x="18" y="24" text-anchor="middle" font-size="16" fill="white" font-family="Arial,sans-serif">🏨</text>
          </svg>
        \`;
        const hotelMarker = new google.maps.Marker({
          position: { lat: ${accommodationLat}, lng: ${accommodationLng} },
          map: map,
          title: ${JSON.stringify(accommodationName || 'Cazare')},
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(hotelSvg),
            scaledSize: new google.maps.Size(36, 44),
            anchor: new google.maps.Point(18, 44),
          },
          zIndex: 999,
        });
        const hotelIw = new google.maps.InfoWindow({
          content: '<div style="color:#000;font-weight:600;font-size:14px;padding:4px 8px;">🏨 ${(accommodationName || 'Cazare').replace(/['"\\]/g, '')}</div>'
        });
        hotelMarker.addListener('click', () => hotelIw.open(map, hotelMarker));
      })();
    ` : '';

    // Linie fină care conectează locațiile (polyline simplu, fără Directions)
    const polylineJs = validLocations.length >= 2 ? `
      const routePath = new google.maps.Polyline({
        path: [${validLocations.map(l => `{lat: ${l.lat}, lng: ${l.lng}}`).join(',')}],
        geodesic: true,
        strokeColor: '#E94560',
        strokeOpacity: 0.5,
        strokeWeight: 2,
      });
      routePath.setMap(map);
    ` : '';

    // Directions (opțional, doar dacă showRoute=true) — folosit în DayDetail
    const directionsJs = showRoute && validLocations.length >= 2 ? `
      const directionsService = new google.maps.DirectionsService();
      const directionsRenderer = new google.maps.DirectionsRenderer({
        polylineOptions: { strokeColor: '#E94560', strokeWeight: 3, strokeOpacity: 0.7 },
        suppressMarkers: true,
      });
      directionsRenderer.setMap(map);
      const waypoints = ${JSON.stringify(
        validLocations.slice(1, -1).map(l => ({ location: { lat: l.lat, lng: l.lng }, stopover: true }))
      )};
      directionsService.route({
        origin: { lat: ${validLocations[0].lat}, lng: ${validLocations[0].lng} },
        destination: { lat: ${validLocations[validLocations.length - 1].lat}, lng: ${validLocations[validLocations.length - 1].lng} },
        waypoints: waypoints,
        travelMode: google.maps.TravelMode['${travelMode === 'walking' ? 'WALKING' : travelMode === 'transit' ? 'TRANSIT' : 'DRIVING'}'],
      }, (result, status) => {
        if (status === 'OK') {
          directionsRenderer.setDirections(result);
          // Ascunde polyline-ul simplu dacă avem directions
          routePath.setMap(null);
          const legs = result.routes[0].legs;
          const totalDist = legs.reduce((s, l) => s + l.distance.value, 0);
          const totalDur = legs.reduce((s, l) => s + l.duration.value, 0);
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'routeResult', totalDistance: totalDist, totalDuration: totalDur,
            }));
          }
        }
      });
    ` : '';

    // Fit bounds dacă avem mai multe locații
    const fitBoundsJs = validLocations.length >= 2 ? `
      const bounds = new google.maps.LatLngBounds();
      ${validLocations.map(l => `bounds.extend({lat: ${l.lat}, lng: ${l.lng}});`).join('\n')}
      ${accommodationLat && accommodationLng ? `bounds.extend({lat: ${accommodationLat}, lng: ${accommodationLng}});` : ''}
      map.fitBounds(bounds, { top: 60, right: 40, bottom: 60, left: 40 });
    ` : '';

    return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #map { width: 100%; height: 100%; }
</style>
</head>
<body>
<div id="map"></div>
<script>
function initMap() {
  const map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: ${centerLat}, lng: ${centerLng} },
    zoom: ${zoom},
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: true,
    gestureHandling: 'greedy',
    styles: [
      { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#a0a0c0' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#16213e' }] },
      { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0f3460' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8888aa' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f3460' }] },
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    ]
  });
  ${polylineJs}
  ${markersJs}
  ${accommodationJs}
  ${directionsJs}
  ${fitBoundsJs}
}
</script>
<script async defer src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap"></script>
</body>
</html>`;
  }, [validLocations, showRoute, travelMode, countryCode, accommodationLat, accommodationLng]);

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        source={{ html: mapHtml }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        mixedContentMode="always"
        onMessage={event => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('Map message:', data);
          } catch {}
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', borderRadius: 12, overflow: 'hidden' },
  webview: { flex: 1 },
});