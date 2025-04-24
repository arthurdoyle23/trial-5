// --------- File: src/popups.js ---------
import mapboxgl from 'mapbox-gl';

/**
 * Show a popup for a given GeoJSON feature.
 * @param {mapboxgl.Map} map
 * @param {Object} feature
 */
export function showFeaturePopup(map, feature) {
  const props = feature.properties;
  const coords = feature.geometry.coordinates;
  const html = `
    <strong>Category:</strong> ${props.Diplomacy_category}<br/>
    <strong>From:</strong> ${props.Delivering_Country}<br/>
    <strong>To:</strong> ${props.Receiving_Countries}<br/>
    <strong>Year:</strong> ${props.Year}<br/>
    ${props.Comments ? `<p>${props.Comments}</p>` : ''}
  `;
  new mapboxgl.Popup().setLngLat(coords).setHTML(html).addTo(map);
}

/**
 * Register popups and cursor interactions for unclustered points.
 * @param {mapboxgl.Map} map
 */
export function registerPopups(map) {
  map.on('click', 'unclustered-point', e => showFeaturePopup(map, e.features[0]));
  map.on('mouseenter', 'unclustered-point', () => map.getCanvas().style.cursor = 'pointer');
  map.on('mouseleave', 'unclustered-point', () => map.getCanvas().style.cursor = '');
}


// --------- File: src/App.jsx ---------
import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import Spiderfy from '@nazka/map-gl-js-spiderfy';
import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css';
import { registerPopups, showFeaturePopup } from './popups';

// Category → icon mapping (icons in public/icons)
const categoryIcons = {
  'Defence Cooperation':       { id: 'defence-cooperation',   url: '/icons/defence-cooperation.png' },
  'Military Exercises':        { id: 'military-exercises',     url: '/icons/military-exercises.png' },
  'Visit Diplomacy (Defence)': { id: 'visit-diplomacy',        url: '/icons/visit-diplomacy.png' },
  'Training':                  { id: 'training',               url: '/icons/training.png' }
};
const defaultIcon = { id: 'default', url: '/icons/default.png' };

const INITIAL_CENTER = [-74.0242, 40.6941];
const INITIAL_ZOOM   = 10.12;

export default function App() {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [center, setCenter] = useState(INITIAL_CENTER);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);

  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiYXJ0aHVyZG95bGUiLCJhIjoiY2xydjZ5eWtxMHBnZjJsbGVnem45bThkMSJ9.hdDK5cGCjnsrRacePPlabQ';
    const map = mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM
    });

    // Update sidebar on map move
    map.on('move', () => {
      const { lng, lat } = map.getCenter();
      setCenter([lng, lat]);
      setZoom(map.getZoom());
    });

    map.on('load', () => {
      // 1️⃣ Preload category icons + default
      Object.values(categoryIcons).concat(defaultIcon).forEach(({ id, url }) => {
        map.loadImage(url, (err, img) => { if (!err) map.addImage(id, img); });
      });

      // 2️⃣ Add GeoJSON source with clustering
      map.addSource('markers', {
        type: 'geojson',
        data: '/data/mock-nyc-points.geojson',
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      // 3️⃣ Cluster symbol & count layers
      map.loadImage(
        'https://raw.githubusercontent.com/nazka/map-gl-js-spiderfy/dev/demo/img/circle-yellow.png',
        (err, img) => {
          if (err) throw err;
          map.addImage('cluster-icon', img);
          map.addLayer({
            id: 'clusters',
            type: 'symbol',
            source: 'markers',
            filter: ['has', 'point_count'],
            layout: { 'icon-image': 'cluster-icon', 'icon-allow-overlap': true }
          });
          map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'markers',
            filter: ['has', 'point_count'],
            layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }
          });

          // 4️⃣ Unclustered symbol layer using Diplomacy_category match
          map.addLayer({
            id: 'unclustered-point',
            type: 'symbol',
            source: 'markers',
            filter: ['!', ['has', 'point_count']],
            layout: {
              'icon-image': [
                'match', ['get', 'Diplomacy_category'],
                ...Object.entries(categoryIcons).flatMap(([cat, { id }]) => [cat, id]),
                defaultIcon.id
              ],
              'icon-size': 0.6,
              'icon-allow-overlap': true
            }
          });

<<<<<<< Updated upstream
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
=======
          // 5️⃣ Spiderfy clusters with popup on leaf click
          const spiderfy = new Spiderfy(map, {
            onLeafClick: feature => showFeaturePopup(map, feature),
            minZoomLevel: 0,
            zoomIncrement: 2
          });
>>>>>>> Stashed changes
          spiderfy.applyTo('clusters');

          // 6️⃣ Register popups for unclustered points
          registerPopups(map);
        }
      );
    });

    return () => map.remove();
  }, []);

  return (
    <>
      <div className="sidebar">
        Lon: {center[0].toFixed(4)} | Lat: {center[1].toFixed(4)} | Zoom: {zoom.toFixed(2)}
      </div>
      <div id="map-container" ref={containerRef} />
    </>
  );
}
