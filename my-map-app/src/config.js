// Map configuration constants

// Icon configuration for different categories
export const categoryIcons = {
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
  
  export const defaultIcon = { id: 'default', url: '/icons/default.png' };
  
  // Map view parameters
  export const MAP_CONFIG = {
    CENTER: [163.7482, -12.7648],
    INITIAL_ZOOM: 3.5,
    INTERMEDIATE_ZOOM: 7.5,
    MIN_SPIDERIFY_ZOOM: 6.99,
    MAX_ZOOM: 13.01,
    MAX_SPIDERIFY_POINTS: 35,
    MAPBOX_TOKEN: 'pk.eyJ1IjoiYXJ0aHVyZG95bGUiLCJhIjoiY2xydjZ5eWtxMHBnZjJsbGVnem45bThkMSJ9.hdDK5cGCjnsrRacePPlabQ'
  };
  
  // Define category colors for consistency
  export const categoryColors = {
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