import mapboxgl from 'mapbox-gl';

/**
 * Registers popup and cursor interactions on your map for unclustered points.
 * @param {mapboxgl.Map} map - The initialized Mapbox GL map instance.
 */
export function registerPopups(map) {
  // Click to show popup
  map.on('click', 'unclustered-point', (e) => {
    const props = e.features[0].properties;
    const coords = e.features[0].geometry.coordinates.slice();

    const html = `
      <strong>Category:</strong> ${props.Diplomacy_category}<br/>
      <strong>From:</strong> ${props.Delivering_Country}<br/>
      <strong>To:</strong> ${props.Receiving_Countries}<br/>
      <strong>Year:</strong> ${props.Year}<br/>
      ${props.Comments ? `<em>${props.Comments}</em>` : ''}
    `;

    new mapboxgl.Popup()
      .setLngLat(coords)
      .setHTML(html)
      .addTo(map);
  });

  // Change cursor on hover
  map.on('mouseenter', 'unclustered-point', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'unclustered-point', () => {
    map.getCanvas().style.cursor = '';
  });
}
