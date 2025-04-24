import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import Spiderfy from '@nazka/map-gl-js-spiderfy';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';
import { registerPopups } from './popups';


// === Section 1: Define category → icon mapping ===
// Make sure these icons are placed in public/icons/
const categoryIcons = {
  'Defence Cooperation':       { id: 'defence-cooperation',   url: '/icons/defence-cooperation.png' },
  'Military Exercises':        { id: 'military-exercises',     url: '/icons/military-exercises.png'   },
  'Visit Diplomacy (Defence)': { id: 'visit-diplomacy',        url: '/icons/visit-diplomacy.png'      },
  'Training':                  { id: 'training',               url: '/icons/training.png'             }
};
const defaultIcon = { id: 'default', url: '/icons/default.png' };

const INITIAL_CENTER = [-74.0242, 40.6941];
const INITIAL_ZOOM = 10.12;

function App() {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const [center, setCenter] = useState(INITIAL_CENTER);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);

  useEffect(() => {
    // Set your Mapbox access token
    mapboxgl.accessToken = 'pk.eyJ1IjoiYXJ0aHVyZG95bGUiLCJhIjoiY2xydjZ5eWtxMHBnZjJsbGVnem45bThkMSJ9.hdDK5cGCjnsrRacePPlabQ';

    // Initialize the map
    const map = mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM
    });

    // Update React state on map move
    map.on('move', () => {
      const { lng, lat } = map.getCenter();
      setCenter([lng, lat]);
      setZoom(map.getZoom());
    });

    map.on('load', () => {
      // Add clustered GeoJSON source
      map.addSource('markers', {
        type: 'geojson',
        data: '/data/mock-nyc-points.geojson',
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      // Load cluster icon image
      map.loadImage(
        'https://raw.githubusercontent.com/nazka/map-gl-js-spiderfy/dev/demo/img/circle-yellow.png',
        (error, image) => {
          if (error) throw error;
          map.addImage('cluster-icon', image);

          // Symbol layer for clusters
          map.addLayer({
            id: 'clusters',
            type: 'symbol',
            source: 'markers',
            filter: ['has', 'point_count'],
            layout: {
              'icon-image': 'cluster-icon',
              'icon-allow-overlap': true
            }
          });

          // Symbol layer for cluster counts
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

          // Circle layer for individual (unclustered) points
          map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'markers',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': '#11b4da',
              'circle-radius': 6,
              'circle-stroke-width': 1,
              'circle-stroke-color': '#fff'
            }
          });

// In App.jsx, modify the Spiderfy instantiation:

// Instantiate Spiderfy for symbol-based clusters
const spiderfy = new Spiderfy(map, {
  onLeafClick: feature => {
    // Show popup when a spidered point is clicked
    const props = feature.properties;
    const coords = feature.geometry.coordinates.slice();

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
    
    console.log('Leaf clicked →', feature);
  },
  minZoomLevel: 0,
  zoomIncrement: 2
});
          spiderfy.applyTo('clusters');
          // inside your map.load callback, after spiderfy.applyTo('clusters'):
registerPopups(map);
        }
      );
    });

    // Clean up on unmount
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

export default App;