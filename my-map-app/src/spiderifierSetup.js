import mapboxgl from 'mapbox-gl';
import MapboxglSpiderifier from 'mapboxgl-spiderifier';
import { categoryIcons, defaultIcon, MAP_CONFIG, categoryColors } from './config';

// Setup the spiderifier for clusters using the custom pin approach
export function setupSpiderifier(map) {
  let largeClusterPopup = null;
  let isSpiderifyingPrevented = false;
  
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
      spiderLeg.elements.pin.style.width = '24px'; // Same size as static icons
      spiderLeg.elements.pin.style.height = '24px'; // Same size as static icons
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
        // Do not change size on hover to match static icons
        // Just increase the z-index to ensure it appears on top
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
        // Return to normal size - which is the same size as we're not changing on hover
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