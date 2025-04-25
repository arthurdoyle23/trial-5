// --------- File: src/popups.js ---------
import mapboxgl from 'mapbox-gl';

/**
 * Show a popup for a given GeoJSON feature.
 * @param {mapboxgl.Map} map
 * @param {Object} feature
 */
export function showFeaturePopup(map, feature) {
  const props = feature.properties;
  const coords = feature.geometry.coordinates;
  const html = `
    <strong>Category:</strong> ${props.Diplomacy_category}<br/>
    <strong>From:</strong> ${props.Delivering_Country}<br/>
    <strong>To:</strong> ${props.Receiving_Countries}<br/>
    <strong>Year:</strong> ${props.Year}<br/>
    ${props.Comments ? `<p>${props.Comments}</p>` : ''}
  `;
  
  new mapboxgl.Popup({
    offset: [0, -40], // Offset only upward
    anchor: 'bottom' // Always position popup above the marker
  })
  .setLngLat(coords)
  .setHTML(html)
  .addTo(map);
}

/**
 * Register popups and cursor.
 * @param {mapboxgl.Map} map
 */
export function registerPopups(map) {
  map.on('click', 'unclustered-point', (e) => showFeaturePopup(map, e.features[0]));
  map.on('mouseenter', 'unclustered-point', () => map.getCanvas().style.cursor = 'pointer');
  map.on('mouseleave', 'unclustered-point', () => map.getCanvas().style.cursor = '');
}