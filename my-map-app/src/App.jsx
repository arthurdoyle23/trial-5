import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';
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
  MIN_ZOOM: 6.99,
  MAX_ZOOM: 13.01,
  MAX_CLUSTER_POINTS: 40,
  MAPBOX_TOKEN: 'pk.eyJ1IjoiYXJ0aHVyZG95bGUiLCJhIjoiY2xydjZ5eWtxMHBnZjJsbGVnem45bThkMSJ9.hdDK5cGCjnsrRacePPlabQ'
};

export default function App() { 
  // ========== STATE AND REFS ==========
  const mapRef = useRef(null);
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
          setupClusterClickHandler(map);
          
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

// Basic handler for cluster clicks - just zooms in
function setupClusterClickHandler(map) {
  let largeClusterPopup = null;
  
  map.on('click', 'clusters', (e) => {
    const currentZoom = map.getZoom();
    const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
    const pointCount = features[0].properties.point_count;
    const clusterCoords = features[0].geometry.coordinates.slice();
    
    // Clear any existing popup
    if (largeClusterPopup) {
      largeClusterPopup.remove();
      largeClusterPopup = null;
    }
    
    // Staged zoom based on current level
    if (currentZoom < MAP_CONFIG.INTERMEDIATE_ZOOM) {
      // From initial zoom to intermediate zoom
      map.easeTo({
        center: clusterCoords,
        zoom: MAP_CONFIG.INTERMEDIATE_ZOOM
      });
    } else {
      // From intermediate zoom or higher, zoom in further
      map.easeTo({
        center: clusterCoords,
        zoom: Math.min(currentZoom + 1.5, MAP_CONFIG.MAX_ZOOM)
      });
    }
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