import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import Spiderfy from '@nazka/map-gl-js-spiderfy'

import 'mapbox-gl/dist/mapbox-gl.css';
import './App.css'

const INITIAL_CENTER = [-74.0242, 40.6941]
const INITIAL_ZOOM   = 10.12

function App() {
  const mapRef          = useRef()
  const mapContainerRef = useRef()
  const [center, setCenter] = useState(INITIAL_CENTER)
  const [zoom,   setZoom]   = useState(INITIAL_ZOOM)

  useEffect(() => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiYXJ0aHVyZG95bGUiLCJhIjoiY2xydjZ5eWtxMHBnZjJsbGVnem45bThkMSJ9.hdDK5cGCjnsrRacePPlabQ'
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style:     'mapbox://styles/mapbox/streets-v12',
      center:    INITIAL_CENTER,
      zoom:      INITIAL_ZOOM
    })

    mapRef.current.on('load', () => {
      // 2️⃣ add a clustered GeoJSON source called "markers"
      mapRef.current.addSource('markers', {
        type:           'geojson',
        data:           '/data/mock-nyc-points.geojson',  // ← your data
        cluster:        true,
        clusterMaxZoom: 14,   // max zoom to cluster points on
        clusterRadius:  50    // cluster radius in pixels
      })

      // 3️⃣ add a layer to display the un-clustered points
      mapRef.current.addLayer({
        id:     'markers',
        type:   'circle',
        source: 'markers',
        filter: ['!', ['has', 'point_count']],  // only single points
        paint:  {
          'circle-color': '#3887be',
          'circle-radius': 6
        }
      })

      // 4️⃣ (optional) add a layer for the clusters themselves
      mapRef.current.addLayer({
        id:     'clusters',
        type:   'circle',
        source: 'markers',
        filter: ['has', 'point_count'],
        paint:  {
          'circle-color': [
            'step', ['get', 'point_count'],
            '#51bbd6', 10,
            '#f1f075', 30,
            '#f28cb1'
          ],
          'circle-radius': [
            'step', ['get', 'point_count'],
            15, 10,
            20, 30,
            25
          ]
        }
      })

      // 5️⃣ now instantiate Spiderfy, pointing it at the same layer ID
      const spiderfy = new Spiderfy(mapRef.current, {
        onLeafClick: feature => console.log('Clicked:', feature),
        minZoomLevel: 12,
        zoomIncrement: 2
      })

      // 6️⃣ enable spiderfy on your un-clustered‐point layer
      spiderfy.applyTo('clusters')
    })

    // update the sidebar on move
    mapRef.current.on('move', () => {
      const c = mapRef.current.getCenter()
      setCenter([c.lng, c.lat])
      setZoom(mapRef.current.getZoom())
    })

    return () => mapRef.current.remove()
  }, [])

  return (
    <>
      <div className="sidebar">
        Longitude: {center[0].toFixed(4)} | Latitude: {center[1].toFixed(4)} | Zoom: {zoom.toFixed(2)}
      </div>
      <div id="map-container" ref={mapContainerRef} />
    </>
  )
}

export default App
