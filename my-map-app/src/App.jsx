import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';
import './SpiderifierStyles.css';
import { registerPopups } from './popups';

// Import configuration
import { MAP_CONFIG } from './config';

// Import helper functions
import { createLoadingIndicator, loadAllIcons } from './iconHelpers';
import { addDataSource, addClusterLayers, addUnclusteredPointLayer, setupUnclusteredPointHandlers } from './mapLayers';
import { setupSpiderifier } from './spiderifierSetup';

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