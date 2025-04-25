import mapboxgl from 'mapbox-gl';
import { categoryIcons, defaultIcon } from './config';
import { createPopupHTML } from './iconHelpers';

// Add the data source to the map
export function addDataSource(map) {
  map.addSource('markers', {
    type: 'geojson',
    data: '/data/mock-nyc-points.geojson',
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50
  });
}

// Add cluster layers to the map
export function addClusterLayers(map) {
  // Cluster symbol layer
  map.addLayer({
    id: 'clusters', 
    type: 'symbol', 
    source: 'markers', 
    filter: ['has', 'point_count'],
    layout: { 
      'icon-image': 'cluster-icon', 
      'icon-size': 0.6,
      'icon-allow-overlap': true 
    }
  });
  
  // Cluster count layer
  map.addLayer({
    id: 'cluster-count', 
    type: 'symbol', 
    source: 'markers',
    filter: ['has', 'point_count'],
    layout: { 
      'text-field': ['get', 'point_count_abbreviated'], 
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'], 
      'text-size': 12
    }
  });
}

// Add unclustered point layer to the map
export function addUnclusteredPointLayer(map) {
  map.addLayer({
    id: 'unclustered-point', 
    type: 'symbol', 
    source: 'markers', 
    filter: ['!', ['has', 'point_count']],
    layout: {
      'icon-image': [
        'match',
        ['get', 'Diplomacy_category'],
        // Match each category to its icon
        'Arms control', 'icon-arms-control',
        'Cultural Diplomacy (Defence)', 'icon-cultural-diplomacy',
        'Defence Cooperation', 'icon-defence-cooperation',
        'Defence Infrastructure', 'icon-defence-infrastructure',
        'HADR – Disaster Response', 'icon-hadr',
        'Maritime Security', 'icon-maritime-security',
        'Military Exercises', 'icon-military-exercises',
        'Military Medical Diplomacy', 'icon-military-medical',
        'MIL-POL Engagement', 'icon-milpol',
        'Public Diplomacy', 'icon-public-diplomacy',
        'Sports Diplomacy (Defence)', 'icon-sports-diplomacy',
        'Training', 'icon-training',
        'Visit Diplomacy (Defence)', 'icon-visit-diplomacy',
        // Default icon for any other category
        'default'
      ],
      'icon-size': 0.3, // This controls the size of static icons (0.5 works with these icons to make them about 24px)
      'icon-allow-overlap': true,
      'icon-anchor': 'bottom',
      'icon-offset': [0, 0]
    },
    paint: {
      'icon-halo-color': '#ffffff',
      'icon-halo-width': 1,
      'icon-halo-blur': 1
    }
  });
}

// Setup event handlers for unclustered points
export function setupUnclusteredPointHandlers(map) {
  let currentPopup = null;
  
  // Hover handler for unclustered points
  map.on('mouseenter', 'unclustered-point', (e) => {
    map.getCanvas().style.cursor = 'pointer';
    const feature = e.features[0];
    const props = feature.properties;
    const coords = feature.geometry.coordinates.slice();
    const html = createPopupHTML(props);
    
    currentPopup = new mapboxgl.Popup({ 
      offset: [0,-20], 
      closeButton: false, 
      closeOnClick: false 
    })
      .setLngLat(coords)
      .setHTML(html)
      .addTo(map);
  });
  
  // Mouse leave handler for unclustered points
  map.on('mouseleave', 'unclustered-point', () => {
    map.getCanvas().style.cursor = '';
    if (currentPopup) {
      currentPopup.remove();
      currentPopup = null;
    }
  });

  // Click handler for unclustered points
  map.on('click', 'unclustered-point', (e) => {
    const feature = e.features[0];
    const props = feature.properties;
    const coords = feature.geometry.coordinates.slice();
    const html = createPopupHTML(props);
    
    new mapboxgl.Popup({ offset: [0,-20] })
      .setLngLat(coords)
      .setHTML(html)
      .addTo(map);
  });
}w