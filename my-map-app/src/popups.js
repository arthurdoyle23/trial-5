// --------- File: src/popups.js ---------
import mapboxgl from 'mapbox-gl';

/**
 * Create HTML content for popups with improved styling and source link
 * @param {Object} props Feature properties
 * @returns {string} HTML content
 */
export function createPopupHTML(props) {
  // Prepare source URL if available
  const sourceLink = props.Source ? 
    `<a href="${props.Source}" target="_blank" class="popup-source-link">
      <i class="fas fa-external-link-alt"></i> View Source
     </a>` : '';

  return `
    <div class="popup-container">
      <h3 class="popup-title">${props.Diplomacy_category || 'Unknown Category'}</h3>
      ${props.Comments ? `<p class="popup-description">${props.Comments}</p>` : ''}
      <div class="popup-metadata">
        <p><strong>From:</strong> ${props.Delivering_Country || 'Unknown'}</p>
        <p><strong>To:</strong> ${props.Receiving_Countries || 'Unknown'}</p>
        ${props.Year ? `<p><strong>Year:</strong> ${props.Year}</p>` : ''}
        ${props.Source ? `<p><strong>Source:</strong> ${formatSourceName(props.Source)}</p>` : ''}
      </div>
      ${sourceLink}
    </div>
  `;
}

/**
 * Format the source URL to display a cleaner name
 * @param {string} source Source URL
 * @returns {string} Formatted source name
 */
function formatSourceName(source) {
  if (!source) return '';
  
  try {
    // If it's a URL, extract domain name
    if (source.startsWith('http')) {
      const url = new URL(source);
      return url.hostname.replace('www.', '');
    }
    
    // Otherwise just return the source as is
    return source;
  } catch (e) {
    return source; // If URL parsing fails, return original
  }
}

/**
 * Show a popup for a given GeoJSON feature.
 * @param {mapboxgl.Map} map
 * @param {Object} feature
 */
export function showFeaturePopup(map, feature) {
  const coords = feature.geometry.coordinates;
  const html = createPopupHTML(feature.properties);
  
  new mapboxgl.Popup({
    offset: [0, -40], // Offset to position popup above the marker
    anchor: 'bottom',
    className: 'feature-popup' // Add class for custom styling
  })
  .setLngLat(coords)
  .setHTML(html)
  .addTo(map);
}

/**
 * Register popups and cursor interactions
 * @param {mapboxgl.Map} map
 */
export function registerPopups(map) {
  // Handle clicks on unclustered points
  map.on('click', 'unclustered-point', (e) => {
    showFeaturePopup(map, e.features[0]);
  });
  
  // Change cursor to pointer when hovering over points
  map.on('mouseenter', 'unclustered-point', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  
  // Reset cursor when leaving points
  map.on('mouseleave', 'unclustered-point', () => {
    map.getCanvas().style.cursor = '';
  });
}