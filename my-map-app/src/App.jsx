import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import Spiderfy from '@nazka/map-gl-js-spiderfy';
// Add this import at the top of your App.jsx file, after the other imports:
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';
import './SpiderfyOverrides.css'; // Make sure this is added
import { registerPopups } from './popups';

// ========== CONFIGURATION ==========
// Icon configuration for different categories
const categoryIcons = {
  'Arms control':                 { id: 'icon-arms-control',            url: '/icons/icon-arms-control.png' },
  'Cultural Diplomacy (Defence)':  { id: 'icon-cultural-diplomacy',      url: '/icons/icon-cultural.png' },
  'Defence Cooperation':           { id: 'icon-defence-cooperation',     url: '/icons/icon-defencecoop.png' },
  'Defence Infrastructure':        { id: 'icon-defence-infrastructure',  url: '/icons/icon-infrastructure.png' },
  'HADR – Disaster Response':      { id: 'icon-hadr',                    url: '/icons/icon-disaster.png' },
  'Maritime Security':             { id: 'icon-maritime-security',       url: '/icons/icon-maritime.png' },
  'Military Exercises':            { id: 'icon-military-exercises',      url: '/icons/icon-exercises.png' },
  'Military Medical Diplomacy':    { id: 'icon-military-medical',        url: '/icons/icon-medical.png' },
  'MIL-POL Engagement':            { id: 'icon-milpol',                  url: '/icons/icon-milpol.png' },
  'Public Diplomacy':              { id: 'icon-public-diplomacy',        url: '/icons/icon-public.png' },
  'Sports Diplomacy (Defence)':    { id: 'icon-sports-diplomacy',       url: '/icons/icon-sports.png' },
  'Training':                      { id: 'icon-training',                url: '/icons/icon-training.png' },
  'Visit Diplomacy (Defence)':     { id: 'icon-visit-diplomacy',         url: '/icons/icon-visit.png' }
};
const defaultIcon = { id: 'default', url: '/icons/default.png' };

// Map view parameters
const MAP_CONFIG = {
  CENTER: [163.7482, -12.7648],
  INITIAL_ZOOM: 3.5,
  INTERMEDIATE_ZOOM: 7.5,
  MIN_SPIDERFY_ZOOM: 6.99,
  MAX_ZOOM: 13.01,
  MAX_SPIDERFY_POINTS: 40,
  MAPBOX_TOKEN: 'pk.eyJ1IjoiYXJ0aHVyZG95bGUiLCJhIjoiY2xydjZ5eWtxMHBnZjJsbGVnem45bThkMSJ9.hdDK5cGCjnsrRacePPlabQ'
};

export default function App() { 
  // ========== STATE AND REFS ==========
  const mapRef = useRef(null);
  const spiderfyRef = useRef(null);
  const mapContainerRef = useRef(null);
  const [center, setCenter] = useState(MAP_CONFIG.CENTER);
  const [zoom, setZoom] = useState(MAP_CONFIG.INITIAL_ZOOM);

  useEffect(() => {
    // ========== MAP INITIALIZATION ==========
    mapboxgl.accessToken = MAP_CONFIG.MAPBOX_TOKEN;

    const map = mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: MAP_CONFIG.CENTER,
      zoom: MAP_CONFIG.INITIAL_ZOOM,
      maxZoom: MAP_CONFIG.MAX_ZOOM
    });

    // Update state when map moves
    map.on('move', () => {
      const { lng, lat } = map.getCenter();
      setCenter([lng, lat]);
      setZoom(map.getZoom());
    });

    map.on('load', () => {
      // ========== LOADING INDICATOR ==========
      const loadingEl = createLoadingIndicator();
      mapContainerRef.current.appendChild(loadingEl);
      
      // ========== ICON LOADING ==========
      loadAllIcons(map)
        .then(() => {
          // Remove loading indicator
          mapContainerRef.current?.removeChild(loadingEl);
          
          // ========== DATA SOURCE SETUP ==========
          addDataSource(map);
          
          // ========== LAYER SETUP ==========
          addClusterLayers(map);
          addUnclusteredPointLayer(map);
          
          // ========== EVENT HANDLERS ==========
          setupUnclusteredPointHandlers(map);
          setupSpiderfyFunctionality(map);
          
          // ========== FALLBACK POPUPS ==========
          registerPopups(map);
        })
        .catch(err => {
          console.error("Error loading icons:", err);
          mapContainerRef.current?.removeChild(loadingEl);
        });
    });

    return () => map.remove();
  }, []);

  // ========== CUSTOM CSS ==========
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = getCustomCSS();
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <>
      <div className="sidebar">
        Lon: {center[0].toFixed(4)} | Lat: {center[1].toFixed(4)} | Zoom: {zoom.toFixed(2)}
      </div>
      <div id="map-container" ref={mapContainerRef} />
    </>
  );
}

// ========== HELPER FUNCTIONS ==========

// Creates and returns a loading indicator element
function createLoadingIndicator() {
  const loadingEl = document.createElement('div');
  loadingEl.className = 'loading-indicator';
  loadingEl.textContent = 'Loading map icons...';
  loadingEl.style.position = 'absolute';
  loadingEl.style.top = '50%';
  loadingEl.style.left = '50%';
  loadingEl.style.transform = 'translate(-50%, -50%)';
  loadingEl.style.padding = '10px';
  loadingEl.style.borderRadius = '5px';
  loadingEl.style.backgroundColor = 'rgba(255,255,255,0.8)';
  loadingEl.style.zIndex = '1000';
  return loadingEl;
}

// Creates a fallback circle icon when image loading fails
function createFallbackCircleIcon(map, iconId) {
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext('2d');
  
  // Random color based on id to differentiate categories
  const hash = iconId.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
  const color = `hsl(${Math.abs(hash) % 360}, 70%, 50%)`;
  
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(12, 12, 10, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  map.addImage(iconId, { width: 24, height: 24, data: ctx.getImageData(0, 0, 24, 24).data });
}

// Loads all icons (category icons, default icon, cluster icon)
function loadAllIcons(map) {
  console.log("Starting to load icons");
  return new Promise((resolve, reject) => {
    const iconPromises = [];
    
    // Load default icon
    iconPromises.push(loadIcon(map, defaultIcon.url, defaultIcon.id));
    
    // Load category icons
    Object.values(categoryIcons).forEach(icon => {
      iconPromises.push(loadIcon(map, icon.url, icon.id));
    });
    
    // Load cluster icon
    iconPromises.push(
      loadIcon(
        map, 
        'https://raw.githubusercontent.com/nazka/map-gl-js-spiderfy/dev/demo/img/circle-yellow.png',
        'cluster-icon'
      )
    );
    
    // Wait for all icons to load
    Promise.all(iconPromises)
      .then(() => {
        console.log("All icons loaded successfully");
        resolve();
      })
      .catch((err) => {
        console.error("Error loading icons:", err);
        reject(err);
      });
  });
}

// Loads a single icon with fallback
function loadIcon(map, url, id) {
  return new Promise((resolve) => {
    const testImg = new Image();
    testImg.onload = () => {
      console.log(`Icon ${id} is accessible`);
      map.loadImage(url, (err, img) => {
        if (err) {
          console.error(`Failed to load icon ${id}:`, err);
          createFallbackCircleIcon(map, id);
          resolve();
          return;
        }
        map.addImage(id, img);
        resolve();
      });
    };
    testImg.onerror = () => {
      console.error(`Icon ${id} is not accessible - using fallback`);
      createFallbackCircleIcon(map, id);
      resolve();
    };
    testImg.src = url;
  });
}

// Add the data source to the map
function addDataSource(map) {
  map.addSource('markers', {
    type: 'geojson',
    data: '/data/mock-nyc-points.geojson',
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50
  });
}

// Add cluster layers to the map
function addClusterLayers(map) {
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
function addUnclusteredPointLayer(map) {
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
      'icon-size': 0.5,
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

// Set up event handlers for unclustered points
function setupUnclusteredPointHandlers(map) {
  let currentUnclusteredPopup = null;
  
  // Hover handler for unclustered points
  map.on('mouseenter', 'unclustered-point', (e) => {
    map.getCanvas().style.cursor = 'pointer';
    const feature = e.features[0];
    const props = feature.properties;
    const coords = feature.geometry.coordinates.slice();
    const html = createPopupHTML(props);
    
    currentUnclusteredPopup = new mapboxgl.Popup({ 
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
    if (currentUnclusteredPopup) {
      currentUnclusteredPopup.remove();
      currentUnclusteredPopup = null;
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
}

// Create HTML content for popups
function createPopupHTML(props) {
  return `
    <strong>Category:</strong> ${props.Diplomacy_category}<br/>
    <strong>From:</strong> ${props.Delivering_Country}<br/>
    <strong>To:</strong> ${props.Receiving_Countries}<br/>
    <strong>Year:</strong> ${props.Year}<br/>
    ${props.Comments ? `<em>${props.Comments}</em>` : ''}
  `;
}

// Set up spiderfy functionality
function setupSpiderfyFunctionality(map) {
  let currentSpiderPopup = null;
  let largeClusterPopup = null;
  let isSpiderfyingPrevented = false;
  
  // Create spiderfy instance with enhanced size parameters
  const spiderfy = new Spiderfy(map, {
    generateLeaves: true,
    customMarkerCallback: createCustomMarker,
    onLeafClick: handleLeafClick,
    onLeafHover: handleLeafHover,
    onLeafHoverEnd: handleLeafHoverEnd,
    minZoomLevel: MAP_CONFIG.MIN_SPIDERFY_ZOOM,
    maxZoomLevel: MAP_CONFIG.MAX_ZOOM,
    zoomIncrement: 4.5,
    circleSpiralSwitchover: 9,
    // Increased separation for more spacing between markers
    circleFootSeparation: 45,
    // Larger spacing between spiral points
    spiralFootSeparation: 50,
    // Increased length factor for wider, longer spirals
    spiralLengthFactor: 150,
    // Increased starting length of spiral
    spiralLengthStart: 75,
    leafClassName: 'mapboxgl-spiderfy-leaf',
    animate: true,
    animationSpeed: 300,
  });
  
  // Apply spiderfy to cluster layer
  console.log("Applying spiderfy to clusters");
  spiderfy.applyTo('clusters');
  console.log("Spiderfy applied successfully");
  
  // Custom marker creation function for spiderfied points - enlarged for better visibility
  function createCustomMarker(feature) {
    const category = feature.properties.Diplomacy_category;
    const iconInfo = categoryIcons[category] || defaultIcon;
    
    const el = document.createElement('div');
    el.className = 'custom-marker';
    
    const testImg = new Image();
    testImg.onload = () => {
      el.style.backgroundImage = `url(${iconInfo.url})`;
    };
    testImg.onerror = () => {
      const hash = category ? 
        category.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0) : 
        0;
      const color = `hsl(${Math.abs(hash) % 360}, 70%, 50%)`;
      
      el.style.backgroundColor = color;
      el.style.border = '3px solid white';
      el.style.borderRadius = '50%';
    };
    testImg.src = iconInfo.url;
    
    // Increased marker size from 30px to 40px
    el.style.width = '40px';
    el.style.height = '40px';
    el.style.cursor = 'pointer';
    el.title = category || 'Unknown';
    
    return el;

    function createCustomMarker(feature) {
      const category = feature.properties.Diplomacy_category;
      const iconInfo = categoryIcons[category] || defaultIcon;
      
      const el = document.createElement('div');
      el.className = 'custom-marker';
      
      // Try to load the category icon
      const testImg = new Image();
      testImg.onload = () => {
        el.style.backgroundImage = `url(${iconInfo.url})`;
      };
      testImg.onerror = () => {
        // If icon doesn't load, use red color background
        el.style.backgroundColor = '#ff0000';  // Red color
        el.style.border = '3px solid white';
        el.style.borderRadius = '50%';
      };
      testImg.src = iconInfo.url;
      
      // Set default styles
      el.style.width = '36px';
      el.style.height = '36px';
      el.style.cursor = 'pointer';
      el.title = category || 'Unknown';
      
      return el;
    }
  }
  
  // Handle leaf click
  function handleLeafClick(feature) {
    const coords = feature.geometry.coordinates;
    const props = feature.properties;
    const html = createPopupHTML(props);
    
    new mapboxgl.Popup({ offset: [0,-20] })
      .setLngLat(coords)
      .setHTML(html)
      .addTo(map);
  }
  
  // Handle leaf hover
  function handleLeafHover(feature, event) {
    if (currentSpiderPopup) currentSpiderPopup.remove();
    const lngLat = map.unproject(event.point);
    const props = feature.properties;
    const html = createPopupHTML(props);
    
    currentSpiderPopup = new mapboxgl.Popup({ 
      offset: [0,-20], 
      closeButton: false, 
      closeOnClick: false 
    })
      .setLngLat(lngLat)
      .setHTML(html)
      .addTo(map);
  }
  
  // Handle leaf hover end
  function handleLeafHoverEnd() {
    if (currentSpiderPopup) {
      currentSpiderPopup.remove();
      currentSpiderPopup = null;
    }
  }
  
  // Custom click handler for clusters
  map.on('click', 'clusters', (e) => {
    const currentZoom = map.getZoom();
    const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
    const clusterId = features[0].properties.cluster_id;
    const pointCount = features[0].properties.point_count;
    const clusterCoords = features[0].geometry.coordinates;
    
    // Clear any existing large cluster popup
    if (largeClusterPopup) {
      largeClusterPopup.remove();
      largeClusterPopup = null;
    }
    
    // Check if we're at spiderfy zoom level
    if (currentZoom >= MAP_CONFIG.MIN_SPIDERFY_ZOOM && currentZoom <= MAP_CONFIG.MAX_ZOOM) {
      // Only proceed with spiderfy if point count is under threshold
      if (pointCount >= MAP_CONFIG.MAX_SPIDERFY_POINTS) {
        // Too many points - show a message and zoom in further
        largeClusterPopup = new mapboxgl.Popup()
          .setLngLat(clusterCoords)
          .setHTML(`<p>Too many points to display (${pointCount}). Zooming in further.</p>`)
          .addTo(map);
        
        // Set a flag to prevent spiderfying
        isSpiderfyingPrevented = true;
        
        // Zoom in more to break up the cluster
        map.easeTo({
          center: clusterCoords,
          zoom: Math.min(currentZoom + 1.5, MAP_CONFIG.MAX_ZOOM)
        });
        
        // Clear the prevention flag after a short delay
        setTimeout(() => {
          isSpiderfyingPrevented = false;
        }, 1000);
        
        return;
      }
      
      // Allow spiderfying for smaller clusters (let default handler work)
      if (!isSpiderfyingPrevented) {
        return;
      }
    } else if (currentZoom < MAP_CONFIG.INTERMEDIATE_ZOOM) {
      // From initial zoom to intermediate zoom
      map.easeTo({
        center: clusterCoords,
        zoom: MAP_CONFIG.INTERMEDIATE_ZOOM
      });
    } else if (currentZoom < MAP_CONFIG.MIN_SPIDERFY_ZOOM) {
      // From intermediate zoom to spiderfy zoom
      map.easeTo({
        center: clusterCoords,
        zoom: MAP_CONFIG.MIN_SPIDERFY_ZOOM
      });
    }
  });
  
  // Intercept cluster clicks for the Spiderfy library
  const originalSpiderfyClick = spiderfy._handleClusterClick;
  spiderfy._handleClusterClick = function(e) {
    // Get cluster details
    const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
    if (features.length > 0) {
      const pointCount = features[0].properties.point_count;
      
      // Only allow spiderfying if point count is under threshold
      if (pointCount < MAP_CONFIG.MAX_SPIDERFY_POINTS && !isSpiderfyingPrevented) {
        originalSpiderfyClick.call(this, e);
      }
    }
  };
}

// Return CSS string for custom markers with enhanced styling
function getCustomCSS() {
  return `
    .custom-marker {
      cursor: pointer;
      z-index: 2;
      background-size: contain;
      background-position: center;
      background-repeat: no-repeat;
      width: 40px;
      height: 40px;
      position: relative;
      box-shadow: 0 0 5px rgba(0,0,0,0.3);
    }
    
    /* Make sure spiderfied markers are visible */
    .mapboxgl-spiderfy-leaf {
      z-index: 100 !important;
    }
    
    /* Ensure proper positioning of markers */
    .mapboxgl-marker {
      cursor: pointer;
    }
    
    /* Lines to connect spiderfied points to center - thicker and more visible */
    .mapboxgl-spiderfy-line {
      z-index: 90 !important;
      stroke-width: 3 !important;
      stroke: #444 !important;
      opacity: 0.7 !important;
    }
    
    /* Enhanced animation for markers */  
    .mapboxgl-spiderfy-leaf .custom-marker {
      animation: pulse 2s infinite;
      transform-origin: center;
    }
    
    @keyframes pulse {
      0% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(0,0,0,0.4);
      }
      50% {
        transform: scale(1.15);
        box-shadow: 0 0 0 5px rgba(0,0,0,0);
      }
      100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(0,0,0,0);
      }
    }
  `;
}