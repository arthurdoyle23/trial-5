import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import Spiderfy from '@nazka/map-gl-js-spiderfy';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';
import { registerPopups } from './popups';

// === Section 1: Define category → icon mapping ===//
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

// Updated initial view parameters
const INITIAL_CENTER = [163.7482, -12.7648]; // New coordinates
const INITIAL_ZOOM = 3.5;                    // New starting zoom
const INTERMEDIATE_ZOOM = 7.5;               // Intermediate zoom level
const MIN_SPIDERFY_ZOOM = 9.99;              // Minimum zoom level for spiderfy to work
const MAX_ZOOM = 13.01;                      // Maximum zoom level allowed
const MAX_SPIDERFY_POINTS = 40;              // Maximum number of points to allow spiderfying

export default function App() { 
  const mapRef = useRef(null);
  const spiderfyRef = useRef(null);
  const mapContainerRef = useRef(null);
  const [center, setCenter] = useState(INITIAL_CENTER);
  const [zoom,   setZoom]   = useState(INITIAL_ZOOM);

  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiYXJ0aHVyZG95bGUiLCJhIjoiY2xydjZ5eWtxMHBnZjJsbGVnem45bThkMSJ9.hdDK5cGCjnsrRacePPlabQ';

    const map = mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      maxZoom: MAX_ZOOM // Set maximum zoom level
    });

    // Update view state
    map.on('move', () => {
      const { lng, lat } = map.getCenter();
      setCenter([lng, lat]);
      setZoom(map.getZoom());
    });

    map.on('load', () => {
      console.log("Map loaded, setting up icon loading");
      
      // Add a loading indicator to the map
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
      mapContainerRef.current.appendChild(loadingEl);
      
      // Load all category icons first
      const loadIcons = () => {
        console.log("Starting to load icons");
        return new Promise((resolve, reject) => {
          // Add all category icons
          const iconPromises = [];
          
          // Load the default icon first
          const defaultIconPromise = new Promise((resolveIcon, rejectIcon) => {
            console.log("Loading default icon from:", defaultIcon.url);
            
            // Test if we can directly access the icon
            const testImg = new Image();
            testImg.onload = () => {
              console.log("Default icon is accessible");
              map.loadImage(defaultIcon.url, (err, img) => {
                if (err) {
                  console.error('Failed to load default icon:', err);
                  // Fallback to a basic circle icon
                  createFallbackCircleIcon(map, defaultIcon.id);
                  resolveIcon();
                  return;
                }
                map.addImage(defaultIcon.id, img);
                resolveIcon();
              });
            };
            testImg.onerror = () => {
              console.error("Default icon is not accessible - using fallback");
              createFallbackCircleIcon(map, defaultIcon.id);
              resolveIcon();
            };
            testImg.src = defaultIcon.url;
          });
          iconPromises.push(defaultIconPromise);
          
          // Load each category icon
          Object.values(categoryIcons).forEach(icon => {
            const iconPromise = new Promise((resolveIcon, rejectIcon) => {
              console.log(`Loading category icon: ${icon.id}`);
              
              // Test if we can directly access the icon
              const testImg = new Image();
              testImg.onload = () => {
                console.log(`Icon ${icon.id} is accessible`);
                map.loadImage(icon.url, (err, img) => {
                  if (err) {
                    console.error(`Failed to load icon ${icon.id}:`, err);
                    // Fallback to a basic circle icon
                    createFallbackCircleIcon(map, icon.id);
                    resolveIcon();
                    return;
                  }
                  map.addImage(icon.id, img);
                  resolveIcon();
                });
              };
              testImg.onerror = () => {
                console.error(`Icon ${icon.id} is not accessible - using fallback`);
                createFallbackCircleIcon(map, icon.id);
                resolveIcon();
              };
              testImg.src = icon.url;
            });
            iconPromises.push(iconPromise);
          });
          
          // Also load the cluster icon
          const clusterIconPromise = new Promise((resolveIcon, rejectIcon) => {
            map.loadImage(
              'https://raw.githubusercontent.com/nazka/map-gl-js-spiderfy/dev/demo/img/circle-yellow.png',
              (err, img) => {
                if (err) {
                  console.error('Failed to load cluster icon:', err);
                  // Create a yellow circle as fallback
                  const canvas = document.createElement('canvas');
                  canvas.width = 30;
                  canvas.height = 30;
                  const ctx = canvas.getContext('2d');
                  ctx.fillStyle = '#ffe600';
                  ctx.beginPath();
                  ctx.arc(15, 15, 12, 0, 2 * Math.PI);
                  ctx.fill();
                  ctx.strokeStyle = '#000';
                  ctx.lineWidth = 1;
                  ctx.stroke();
                  map.addImage('cluster-icon', { width: 30, height: 30, data: ctx.getImageData(0, 0, 30, 30).data });
                  resolveIcon();
                  return;
                }
                map.addImage('cluster-icon', img);
                resolveIcon();
              }
            );
          });
          iconPromises.push(clusterIconPromise);
          
          // Wait for all icons to load
          Promise.all(iconPromises)
            .then(() => {
              console.log("All icons loaded successfully");
              // Remove loading indicator
              mapContainerRef.current.removeChild(loadingEl);
              resolve();
            })
            .catch((err) => {
              console.error("Error loading icons:", err);
              // Remove loading indicator
              mapContainerRef.current.removeChild(loadingEl);
              reject(err);
            });
        });
      };
      
      // Create a fallback circle icon if the image doesn't load
      const createFallbackCircleIcon = (map, iconId) => {
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
      };

      // Start loading icons
      loadIcons().then(() => {
        map.addSource('markers', {
          type: 'geojson',
          data: '/data/mock-nyc-points.geojson',
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50
        });

        // Cluster layers
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

        // Unclustered points now use symbols instead of circles
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
            'icon-size': 0.5, // Adjust size as needed
            'icon-allow-overlap': true,
            'icon-anchor': 'bottom', // Anchor at bottom so icon "points" to location
            'icon-offset': [0, 0]  // Adjust offset if needed
          },
          paint: {
            // Add a halo effect to make icons more visible
            'icon-halo-color': '#ffffff',
            'icon-halo-width': 1,
            'icon-halo-blur': 1
          }
        });

        // Unclustered hover popup
        let currentUnclusteredPopup = null;
        map.on('mouseenter', 'unclustered-point', (e) => {
          map.getCanvas().style.cursor = 'pointer';
          const feature = e.features[0];
          const props = feature.properties;
          const coords = feature.geometry.coordinates.slice();
          const html = `
            <strong>Category:</strong> ${props.Diplomacy_category}<br/>
            <strong>From:</strong> ${props.Delivering_Country}<br/>
            <strong>To:</strong> ${props.Receiving_Countries}<br/>
            <strong>Year:</strong> ${props.Year}<br/>
            ${props.Comments ? `<em>${props.Comments}</em>` : ''}
          `;
          currentUnclusteredPopup = new mapboxgl.Popup({ offset: [0,-20], closeButton: false, closeOnClick: false })
            .setLngLat(coords)
            .setHTML(html)
            .addTo(map);
        });
        
        map.on('mouseleave', 'unclustered-point', () => {
          map.getCanvas().style.cursor = '';
          if (currentUnclusteredPopup) {
            currentUnclusteredPopup.remove();
            currentUnclusteredPopup = null;
          }
        });

        // Unclustered click popup
        map.on('click', 'unclustered-point', (e) => {
          const feature = e.features[0];
          const props = feature.properties;
          const coords = feature.geometry.coordinates.slice();
          const html = `
            <strong>Category:</strong> ${props.Diplomacy_category}<br/>
            <strong>From:</strong> ${props.Delivering_Country}<br/>
            <strong>To:</strong> ${props.Receiving_Countries}<br/>
            <strong>Year:</strong> ${props.Year}<br/>
            ${props.Comments ? `<em>${props.Comments}</em>` : ''}
          `;
          new mapboxgl.Popup({ offset: [0,-20] })
            .setLngLat(coords)
            .setHTML(html)
            .addTo(map);
        });

        // Spiderfy clusters with custom icons
        let currentSpiderPopup = null;
        const spiderfy = spiderfyRef.current = new Spiderfy(map, {
          // Use HTML elements for markers instead of the default symbols
          generateLeaves: true,
          // Custom marker creation function for spiderfied points
          customMarkerCallback: feature => {
            // Get the category and corresponding icon
            const category = feature.properties.Diplomacy_category;
            const iconInfo = categoryIcons[category] || defaultIcon;
            
            // Create a custom HTML element for the marker
            const el = document.createElement('div');
            el.className = 'custom-marker';
            
            // Create a DOM element for testing image availability
            const testImg = new Image();
            testImg.onload = () => {
              // Image exists, use it
              el.style.backgroundImage = `url(${iconInfo.url})`;
            };
            testImg.onerror = () => {
              // Image doesn't exist, use a fallback color based on category
              const hash = category ? 
                category.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0) : 
                0;
              const color = `hsl(${Math.abs(hash) % 360}, 70%, 50%)`;
              
              el.style.backgroundColor = color;
              el.style.border = '2px solid white';
              el.style.borderRadius = '50%';
            };
            testImg.src = iconInfo.url;
            
            // Set default styles that apply regardless of image loading
            el.style.width = '30px';
            el.style.height = '30px';
            el.style.cursor = 'pointer';
            
            // Add a tooltip with category name
            el.title = category || 'Unknown';
            
            return el;
          },
          onLeafClick: feature => {
            const coords = feature.geometry.coordinates;
            const props = feature.properties;
            const html = `
              <strong>Category:</strong> ${props.Diplomacy_category}<br/>
              <strong>From:</strong> ${props.Delivering_Country}<br/>
              <strong>To:</strong> ${props.Receiving_Countries}<br/>
              <strong>Year:</strong> ${props.Year}<br/>
              ${props.Comments ? `<em>${props.Comments}</em>` : ''}
            `;
            new mapboxgl.Popup({ offset: [0,-20] })
              .setLngLat(coords)
              .setHTML(html)
              .addTo(map);
          },
          onLeafHover: (feature, event) => {
            if (currentSpiderPopup) currentSpiderPopup.remove();
            const lngLat = map.unproject(event.point);
            const props = feature.properties;
            const html = `
              <strong>Category:</strong> ${props.Diplomacy_category}<br/>
              <strong>From:</strong> ${props.Delivering_Country}<br/>
              <strong>To:</strong> ${props.Receiving_Countries}<br/>
              <strong>Year:</strong> ${props.Year}<br/>
              ${props.Comments ? `<em>${props.Comments}</em>` : ''}
            `;
            currentSpiderPopup = new mapboxgl.Popup({ offset: [0,-20], closeButton: false, closeOnClick: false })
              .setLngLat(lngLat)
              .setHTML(html)
              .addTo(map);
          },
          onLeafHoverEnd: () => {
            if (currentSpiderPopup) {
              currentSpiderPopup.remove();
              currentSpiderPopup = null;
            }
          },
          minZoomLevel: MIN_SPIDERFY_ZOOM, // Set minimum zoom level for spiderfy
          maxZoomLevel: MAX_ZOOM, // Set maximum zoom level for spiderfy
          zoomIncrement: 4.5,
          // Marker styling
          circleSpiralSwitchover: 9, // Show spiral instead of circle from this marker count
          circleFootSeparation: 28, // related to distance between circle points (increased)
          spiralFootSeparation: 30, // related to distance between spiral points (increased)
          spiralLengthFactor: 4.5, // makes spiral tighter or looser
          spiralLengthStart: 12, // inner start length of spiral
          leafClassName: 'mapboxgl-spiderfy-leaf', // Class name for leaf markers
          animate: true,
          animationSpeed: 300
        });
        
        // Apply spiderfy to cluster layer and log success
        console.log("Applying spiderfy to clusters");
        spiderfy.applyTo('clusters');
        console.log("Spiderfy applied successfully");

        // Flag to track if we're preventing spiderfying due to point count
        let isSpiderfyingPrevented = false;

        // Keep track of any open large cluster popup
        let largeClusterPopup = null;

        // Custom click handler for clusters with staged zoom levels and point count limit
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
          if (currentZoom >= MIN_SPIDERFY_ZOOM && currentZoom <= MAX_ZOOM) {
            // Only proceed with spiderfy if point count is under threshold
            if (pointCount >= MAX_SPIDERFY_POINTS) {
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
                zoom: Math.min(currentZoom + 1.5, MAX_ZOOM)
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
          } else if (currentZoom < INTERMEDIATE_ZOOM) {
            // From initial zoom to intermediate zoom
            map.easeTo({
              center: clusterCoords,
              zoom: INTERMEDIATE_ZOOM
            });
          } else if (currentZoom < MIN_SPIDERFY_ZOOM) {
            // From intermediate zoom to spiderfy zoom
            map.easeTo({
              center: clusterCoords,
              zoom: MIN_SPIDERFY_ZOOM
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
            if (pointCount < MAX_SPIDERFY_POINTS && !isSpiderfyingPrevented) {
              originalSpiderfyClick.call(this, e);
            }
          }
        };

        // Fallback popups
        registerPopups(map);
      }).catch(err => {
        console.error("Error loading icons:", err);
      });
    });

    return () => map.remove();
  }, []);

  // Add CSS for custom markers
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .custom-marker {
        cursor: pointer;
        z-index: 2;
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
        width: 30px;
        height: 30px;
        position: relative;
      }
      
      /* Make sure spiderfied markers are visible */
      .mapboxgl-spiderfy-leaf {
        z-index: 100 !important;
      }
      
      /* Ensure proper positioning of markers */
      .mapboxgl-marker {
        cursor: pointer;
      }
      
      /* Lines to connect spiderfied points to center */
      .mapboxgl-spiderfy-line {
        z-index: 90 !important;
        stroke-width: 2;
      }
      
      /* Add subtle animation for markers */  
      .mapboxgl-spiderfy-leaf .custom-marker {
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
        100% {
          transform: scale(1);
        }
      }
    `;
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