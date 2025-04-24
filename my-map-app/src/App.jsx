import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import Spiderfy from '@nazka/map-gl-js-spiderfy';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';

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

          // Instantiate Spiderfy for symbol-based clusters
          const spiderfy = new Spiderfy(map, {
            onLeafClick: feature => console.log('Leaf clicked →', feature),
            minZoomLevel: 0,
            zoomIncrement: 2
          });
          spiderfy.applyTo('clusters');
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