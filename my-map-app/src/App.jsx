import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxglSpiderifier from 'mapboxgl-spiderifier';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';
import './SpiderifierStyles.css';
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
  MIN_SPIDERIFY_ZOOM: 6.99,
  MAX_ZOOM: 13.01,
  MAX_SPIDERIFY_POINTS: 35,
  MAPBOX_TOKEN: 'pk.eyJ1IjoiYXJ0aHVyZG95bGUiLCJhIjoiY2xydjZ5eWtxMHBnZjJsbGVnem45bThkMSJ9.hdDK5cGCjnsrRacePPlabQ'
};

export default function App() { 
  // ========== STATE AND REFS ==========
  const mapRef = useRef(null);
  const spiderifierRef = useRef(null);
  const mapContainerRef = useRef(null);
  const [center, setCenter] = useState(MAP_CONFIG.CENTER);
  const [zoom, setZoom] = useState(MAP_CONFIG.INITIAL_ZOOM);

  // Function to manually unspiderfy - useful for debugging
  const unspiderfyManually = () => {
    if (spiderifierRef.current) {
      console.log("Manually unspiderfying");
      spiderifierRef.current.unspiderfy();
    }
  };

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
          
          // ========== SPIDERIFIER SETUP ==========
          const spiderifier = setupSpiderifier(map);
          spiderifierRef.current = spiderifier;
          
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

  return (
    <>
      <div className="sidebar">
        Lon: {center[0].toFixed(4)} | Lat: {center[1].toFixed(4)} | Zoom: {zoom.toFixed(2)}
        <button
          onClick={unspiderfyManually}
          style={{
            marginLeft: '10px',
            padding: '5px 10px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Unspiderfy
        </button>
      </div>
      <div id="map-container" ref={mapContainerRef} />
    </>
  );
}

// ========== HELPER FUNCTIONS ==========

// Creates a loading indicator element
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

// Creates a fallback circle icon
function createFallbackCircleIcon(map, iconId) {
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext('2d');
  
  // Random color based on id
  const hash = iconId.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
  const color = `hsl(${Math.abs(hash) % 360}, 70%, 50%)`;
  
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(12, 12, 10, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  map.addImage(iconId, { 
    width: 24, 
    height: 24, 
    data: ctx.getImageData(0, 0, 24, 24).data 
  });
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

// Setup event handlers for unclustered points
function setupUnclusteredPointHandlers(map) {
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

// Setup the spiderifier for clusters using the custom pin approach
function setupSpiderifier(map) {
  let largeClusterPopup = null;
  let isSpiderifyingPrevented = false;
  
  // Define category colors for consistency
  const categoryColors = {
    'Arms control': '#ff0000',                  // Red
    'Cultural Diplomacy (Defence)': '#ff9900',  // Orange
    'Defence Cooperation': '#ffcc00',           // Yellow
    'Defence Infrastructure': '#33cc33',        // Green
    'HADR – Disaster Response': '#00ccff',      // Light Blue
    'Maritime Security': '#0066ff',             // Blue
    'Military Exercises': '#9900cc',            // Purple
    'Military Medical Diplomacy': '#ff66cc',    // Pink
    'MIL-POL Engagement': '#cc6600',            // Brown
    'Public Diplomacy': '#009933',              // Dark Green
    'Sports Diplomacy (Defence)': '#ff3399',    // Hot Pink
    'Training': '#3333ff',                      // Indigo
    'Visit Diplomacy (Defence)': '#993366'      // Burgundy
  };
  
  // Initialize the spiderifier with custom pin options
  const spiderifier = new MapboxglSpiderifier(map, {
    animate: true,
    animationSpeed: 200,
    customPin: true,
    
    // Spacing configuration - increased values for wider spread
    circleSpiralSwitchover: 9,
    circleFootSeparation: 80,    // Increased from default 25
    spiralFootSeparation: 80,    // Increased from default 28
    spiralLengthStart: 30,       // Increased from default 15  
    spiralLengthFactor: 10,      // Increased from default 4
    
    // This function is called for each leg when it's created
    initializeLeg: function(spiderLeg) {
      // Get category for this point
      const category = spiderLeg.feature.properties.Diplomacy_category || 'Unknown';
      
      // Get the icon ID based on category
      const iconId = categoryIcons[category]?.id || defaultIcon.id;
      
      // First, clean up any existing elements to ensure proper hitbox
      while (spiderLeg.elements.pin.firstChild) {
        spiderLeg.elements.pin.removeChild(spiderLeg.elements.pin.firstChild);
      }
      
      // Reset the pin element styles to control the hitbox exactly
      spiderLeg.elements.pin.style.width = '24px';
      spiderLeg.elements.pin.style.height = '24px';
      spiderLeg.elements.pin.style.margin = '0';
      spiderLeg.elements.pin.style.padding = '0';
      spiderLeg.elements.pin.style.overflow = 'hidden';
      spiderLeg.elements.pin.style.position = 'absolute';
      spiderLeg.elements.pin.style.transform = 'translate(-12px, -12px)'; // Center the pin
      spiderLeg.elements.pin.style.pointerEvents = 'auto'; // Ensure clicks are captured
      
      // Set the icon as the background of the pin element itself
      // This ensures the hitbox exactly matches the visible element
      const iconUrl = categoryIcons[category]?.url || defaultIcon.url;
      spiderLeg.elements.pin.style.backgroundImage = `url(${iconUrl})`;
      spiderLeg.elements.pin.style.backgroundSize = 'contain';
      spiderLeg.elements.pin.style.backgroundRepeat = 'no-repeat';
      spiderLeg.elements.pin.style.backgroundPosition = 'center';
      
      // Create content for the popup
      const from = spiderLeg.feature.properties.Delivering_Country || 'Unknown';
      const to = spiderLeg.feature.properties.Receiving_Countries || 'Unknown';
      const year = spiderLeg.feature.properties.Year || 'Unknown';
      const comments = spiderLeg.feature.properties.Comments || '';
      
      const popupContent = `
        <strong>Category:</strong> ${category}<br/>
        <strong>From:</strong> ${from}<br/>
        <strong>To:</strong> ${to}<br/>
        <strong>Year:</strong> ${year}<br/>
        ${comments ? `<em>${comments}</em>` : ''}
      `;
      
      // Create a custom popup that follows the mouse - this avoids positioning issues
      const customPopup = document.createElement('div');
      customPopup.className = 'custom-spider-popup';
      customPopup.style.display = 'none';
      customPopup.style.position = 'absolute';
      customPopup.style.backgroundColor = 'white';
      customPopup.style.border = '1px solid #ccc';
      customPopup.style.borderRadius = '4px';
      customPopup.style.padding = '10px';
      customPopup.style.boxShadow = '0 2px 7px 1px rgba(0,0,0,0.3)';
      customPopup.style.maxWidth = '300px';
      customPopup.style.zIndex = '10000';
      customPopup.style.pointerEvents = 'none'; // Let events pass through to the map
      customPopup.innerHTML = popupContent;
      
      // Add close button
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '×';
      closeButton.style.position = 'absolute';
      closeButton.style.top = '5px';
      closeButton.style.right = '5px';
      closeButton.style.border = 'none';
      closeButton.style.background = 'none';
      closeButton.style.fontSize = '16px';
      closeButton.style.cursor = 'pointer';
      closeButton.style.pointerEvents = 'auto'; // Allow clicks on the close button
      closeButton.onclick = function() {
        customPopup.style.display = 'none';
      };
      
      customPopup.appendChild(closeButton);
      
      // Add the popup to the map container
      map.getContainer().appendChild(customPopup);
      
      // Add arrow at the bottom of the popup (will point to the pin)
      const arrow = document.createElement('div');
      arrow.style.position = 'absolute';
      arrow.style.bottom = '-8px';
      arrow.style.left = '50%';
      arrow.style.marginLeft = '-8px';
      arrow.style.borderLeft = '8px solid transparent';
      arrow.style.borderRight = '8px solid transparent';
      arrow.style.borderTop = '8px solid white';
      arrow.style.zIndex = '1'; // Ensure arrow appears in front
      arrow.style.width = '0';
      arrow.style.height = '0';
      
      customPopup.appendChild(arrow);
      
      // Add event listeners for hover
      spiderLeg.elements.pin.addEventListener('mouseenter', function(e) {
        // Make the icon slightly larger on hover
        spiderLeg.elements.pin.style.width = '30px';
        spiderLeg.elements.pin.style.height = '30px';
        spiderLeg.elements.pin.style.transform = 'translate(-15px, -15px)'; // Adjust center for larger size
        spiderLeg.elements.pin.style.zIndex = '1000';
        
        // Get dimensions and positions
        const rect = spiderLeg.elements.pin.getBoundingClientRect();
        const mapRect = map.getContainer().getBoundingClientRect();
        
        // Calculate popup width and height (needs to be visible to get dimensions)
        customPopup.style.visibility = 'hidden';
        customPopup.style.display = 'block';
        const popupWidth = customPopup.offsetWidth;
        const popupHeight = customPopup.offsetHeight;
        
        // Position the popup directly above the pin
        customPopup.style.left = `${rect.left + (rect.width / 2) - (popupWidth / 2)}px`;
        customPopup.style.top = `${rect.top - popupHeight - 15}px`; // 15px offset from pin
        customPopup.style.visibility = 'visible';
        
        // Make sure arrow points to the center of the pin
        arrow.style.left = '50%';
        arrow.style.transform = 'translateX(-50%)';
      });
      
      spiderLeg.elements.pin.addEventListener('mouseleave', function() {
        // Return to normal size
        spiderLeg.elements.pin.style.width = '24px';
        spiderLeg.elements.pin.style.height = '24px';
        spiderLeg.elements.pin.style.transform = 'translate(-12px, -12px)';
        spiderLeg.elements.pin.style.zIndex = 'auto';
        
        // Hide the popup with a small delay to allow moving to popup
        setTimeout(() => {
          // Only hide if mouse is not over the popup
          if (!customPopup.matches(':hover')) {
            customPopup.style.display = 'none';
          }
        }, 100);
      });
      
      // Close popup when clicking elsewhere
      map.getCanvas().addEventListener('click', function() {
        customPopup.style.display = 'none';
      });
      
      // Style the line connecting to the center
      if (spiderLeg.elements.line) {
        spiderLeg.elements.line.setAttribute('stroke', '#666666');
        spiderLeg.elements.line.setAttribute('stroke-width', '2');
        spiderLeg.elements.line.setAttribute('stroke-opacity', '0.7');
      }
    }
  });
  
  // Set up click handler for clusters
  map.on('click', 'clusters', (e) => {
    const currentZoom = map.getZoom();
    const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
    if (!features.length) return;
    
    const clusterId = features[0].properties.cluster_id;
    const pointCount = features[0].properties.point_count;
    const clusterCoords = features[0].geometry.coordinates.slice();
    
    // Clear any existing popup
    if (largeClusterPopup) {
      largeClusterPopup.remove();
      largeClusterPopup = null;
    }
    
    // Check if we're at spiderify zoom level
    if (currentZoom >= MAP_CONFIG.MIN_SPIDERIFY_ZOOM && currentZoom <= MAP_CONFIG.MAX_ZOOM) {
      // Only proceed with spiderify if point count is under threshold
      if (pointCount >= MAP_CONFIG.MAX_SPIDERIFY_POINTS) {
        // Too many points - show a message and zoom in further
        largeClusterPopup = new mapboxgl.Popup()
          .setLngLat(clusterCoords)
          .setHTML(`<p>Too many points to display (${pointCount}). Zooming in further.</p>`)
          .addTo(map);
        
        // Set a flag to prevent spiderfying
        isSpiderifyingPrevented = true;
        
        // Zoom in more to break up the cluster
        map.easeTo({
          center: clusterCoords,
          zoom: Math.min(currentZoom + 1.5, MAP_CONFIG.MAX_ZOOM)
        });
        
        // Clear the prevention flag after a short delay
        setTimeout(() => {
          isSpiderifyingPrevented = false;
        }, 1000);
        
        return;
      }
      
      // Get all points in the cluster
      map.getSource('markers').getClusterLeaves(
        clusterId,
        pointCount,
        0,
        (err, leafFeatures) => {
          if (err) {
            console.error('Error getting cluster leaves:', err);
            return;
          }
          
          // Clear existing spiderifier if any
          spiderifier.unspiderfy();
          
          // Sort the features before spiderfying
          // Sort by category first, then by year if available
          const sortedFeatures = [...leafFeatures].sort((a, b) => {
            // First sort by category
            const categoryA = a.properties.Diplomacy_category || '';
            const categoryB = b.properties.Diplomacy_category || '';
            
            if (categoryA !== categoryB) {
              return categoryA.localeCompare(categoryB);
            }
            
            // If same category, sort by year
            const yearA = a.properties.Year || 0;
            const yearB = b.properties.Year || 0;
            
            // Convert to numbers for comparison if they're strings
            const numYearA = typeof yearA === 'string' ? parseInt(yearA, 10) : yearA;
            const numYearB = typeof yearB === 'string' ? parseInt(yearB, 10) : yearB;
            
            return numYearA - numYearB;
          });
          
          // Spiderify with the sorted cluster features
          spiderifier.spiderfy(clusterCoords, sortedFeatures);
        }
      );
    } else if (currentZoom < MAP_CONFIG.INTERMEDIATE_ZOOM) {
      // From initial zoom to intermediate zoom
      spiderifier.unspiderfy();
      map.easeTo({
        center: clusterCoords,
        zoom: MAP_CONFIG.INTERMEDIATE_ZOOM
      });
    } else if (currentZoom < MAP_CONFIG.MIN_SPIDERIFY_ZOOM) {
      // From intermediate zoom to spiderfy zoom
      spiderifier.unspiderfy();
      map.easeTo({
        center: clusterCoords,
        zoom: MAP_CONFIG.MIN_SPIDERIFY_ZOOM
      });
    }
  });
  
  // Unspiderfy when clicking elsewhere on the map
  map.on('click', (e) => {
    // Only unspiderfy if the click wasn't on a cluster
    const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
    if (features.length === 0) {
      console.log("Unspiderfying due to click elsewhere on map");
      spiderifier.unspiderfy();
    }
  });
  
  // Unspiderfy when zooming
  map.on('zoomstart', () => {
    console.log("Unspiderfying due to zoom change");
    spiderifier.unspiderfy();
  });
  
  // Unspiderfy when dragging/panning the map
  map.on('dragstart', () => {
    console.log("Unspiderfying due to map drag");
    spiderifier.unspiderfy(); 
  });
  
  // Add a global event listener for the ESC key to unspiderfy
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      console.log("Unspiderfying due to ESC key");
      spiderifier.unspiderfy();
    }
  });
  
  return spiderifier;
}