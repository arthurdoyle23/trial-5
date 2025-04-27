import React, { useRef, useEffect, useState, useCallback } from 'react';
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

// Primary theme color
const PRIMARY_COLOR = '#e51f30';

export default function App() { 
// ========== STATE AND REFS ==========
const mapRef = useRef(null);
const spiderifierRef = useRef(null);
const mapContainerRef = useRef(null);
const originalDataRef = useRef(null);
const [center, setCenter] = useState(MAP_CONFIG.CENTER);
const [zoom, setZoom] = useState(MAP_CONFIG.INITIAL_ZOOM);
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

// Filter states
const [allData, setAllData] = useState([]);
const [filteredData, setFilteredData] = useState([]);
const [selectedCategories, setSelectedCategories] = useState({});
const [selectedCountries, setSelectedCountries] = useState({});
const [categoryList, setCategoryList] = useState([]);
const [countryList, setCountryList] = useState([]);
const [searchQuery, setSearchQuery] = useState('');
const [activeFilterCount, setActiveFilterCount] = useState(0);
const [showFilterPopup, setShowFilterPopup] = useState(false);
const [showStats, setShowStats] = useState(false);

// Year filter specific states
const [yearRange, setYearRange] = useState([0, 3000]); // Default for filter popup
const [availableYearRange, setAvailableYearRange] = useState([0, 3000]);
const [selectedYear, setSelectedYear] = useState(null); // For year slider at map bottom
const [showAllYears, setShowAllYears] = useState(true);
const [availableYears, setAvailableYears] = useState([]);
const [isDataLoaded, setIsDataLoaded] = useState(false);
const [activeYear, setActiveYear] = useState(null);

// Function to toggle sidebar
const toggleSidebar = () => {
  setSidebarCollapsed(!sidebarCollapsed);
};

// Function to manually unspiderfy
const unspiderfyManually = () => {
  if (spiderifierRef.current) {
    console.log("Manually unspiderfying");
    spiderifierRef.current.unspiderfy();
  }
};

// Function to fetch and process the data
const fetchData = useCallback(async () => {
  try {
    const response = await fetch('/data/mock-nyc-points.geojson');
    const data = await response.json();
    
    // Store the original data
    originalDataRef.current = data;
    
    // Extract features for list view
    const features = data.features || [];
    setAllData(features);
    setFilteredData(features);
    
    // Extract unique categories, countries, and years
    const categories = new Set();
    const countries = new Set();
    const years = [];
    const uniqueYears = new Set();
    
    features.forEach(feature => {
      const category = feature.properties.Diplomacy_category;
      const country = feature.properties.Delivering_Country;
      const year = feature.properties.Year;
      
      if (category) categories.add(category);
      if (country) countries.add(country);
      if (year && !isNaN(parseInt(year))) {
        const numYear = parseInt(year);
        years.push(numYear);
        uniqueYears.add(numYear);
      }
    });
    
    // Determine year range
    const minYear = years.length ? Math.min(...years) : 0;
    const maxYear = years.length ? Math.max(...years) : 3000;
    setAvailableYearRange([minYear, maxYear]);
    setYearRange([minYear, maxYear]);
    
    // Set available years for the bottom slider (sorted)
    const sortedYears = Array.from(uniqueYears).sort((a, b) => a - b);
    setAvailableYears(sortedYears);
    setActiveYear(sortedYears[0] || null);
    
    // Convert sets to sorted arrays
    const categoriesArray = Array.from(categories).sort();
    const countriesArray = Array.from(countries).sort();
    
    // Initialize all checkboxes as selected
    const initialCategoryState = {};
    const initialCountryState = {};
    
    categoriesArray.forEach(cat => {
      initialCategoryState[cat] = true;
    });
    
    countriesArray.forEach(country => {
      initialCountryState[country] = true;
    });
    
    setCategoryList(categoriesArray);
    setCountryList(countriesArray);
    setSelectedCategories(initialCategoryState);
    setSelectedCountries(initialCountryState);
    setIsDataLoaded(true);
    
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}, []);

// Apply filters to the data
const applyFilters = useCallback(() => {
  if (!originalDataRef.current) return;
  
  // Copy original data
  const newData = {
    type: 'FeatureCollection',
    features: []
  };
  
  // Filter features based on selected categories, countries, and searchQuery
  let filteredFeatures = originalDataRef.current.features.filter(feature => {
    const category = feature.properties.Diplomacy_category;
    const country = feature.properties.Delivering_Country;
    
    const categoryMatch = !category || selectedCategories[category];
    const countryMatch = !country || selectedCountries[country];
    
    // Search query filter
    let searchMatch = true;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const props = feature.properties;
      searchMatch = 
        (props.Diplomacy_category && props.Diplomacy_category.toLowerCase().includes(query)) ||
        (props.Delivering_Country && props.Delivering_Country.toLowerCase().includes(query)) ||
        (props.Receiving_Countries && props.Receiving_Countries.toLowerCase().includes(query)) ||
        (props.Comments && props.Comments.toLowerCase().includes(query)) ||
        (props.Year && props.Year.toString().includes(query));
    }
    
    return categoryMatch && countryMatch && searchMatch;
  });
  
  // Apply year filtering (from the bottom slider) if not showing all years
  if (!showAllYears && selectedYear !== null) {
    filteredFeatures = filteredFeatures.filter(feature => {
      const featureYear = feature.properties.Year ? parseInt(feature.properties.Year) : null;
      return featureYear === selectedYear;
    });
  }
  
  // Update the filtered list for the sidebar
  setFilteredData(filteredFeatures);
  
  // Add filtered features to new data object
  newData.features = filteredFeatures;
  
  // Update the map source if map exists
  if (mapRef.current) {
    const source = mapRef.current.getSource('markers');
    if (source) {
      source.setData(newData);
    }
    
    // Unspiderfy when filters change
    if (spiderifierRef.current) {
      spiderifierRef.current.unspiderfy();
    }
  }
}, [selectedCategories, selectedCountries, searchQuery, selectedYear, showAllYears]);

// Handle category filter change
const handleCategoryChange = (category, checked) => {
  setSelectedCategories(prev => ({
    ...prev,
    [category]: checked
  }));
};

// Handle country filter change
const handleCountryChange = (country, checked) => {
  setSelectedCountries(prev => ({
    ...prev,
    [country]: checked
  }));
};

// Handle search query change
const handleSearchChange = (e) => {
  setSearchQuery(e.target.value);
};

// Select/Deselect all categories
const handleSelectAllCategories = (select) => {
  const newState = {};
  categoryList.forEach(cat => {
    newState[cat] = select;
  });
  setSelectedCategories(newState);
};

// Select/Deselect all countries
const handleSelectAllCountries = (select) => {
  const newState = {};
  countryList.forEach(country => {
    newState[country] = select;
  });
  setSelectedCountries(newState);
};

// Toggle filter popup
const toggleFilterPopup = () => {
  setShowFilterPopup(!showFilterPopup);
};

// Toggle statistics panel
const toggleStats = () => {
  setShowStats(!showStats);
};

// Toggle showing all years vs specific year
const toggleAllYears = () => {
  setShowAllYears(!showAllYears);
  if (showAllYears) {
    // If switching from all years to specific year, select the first available
    setSelectedYear(availableYears.length > 0 ? activeYear || availableYears[0] : null);
  } else {
    // If switching to all years, clear the selection
    setSelectedYear(null);
  }
};

// Set the selected year and ensure all years mode is off
const handleYearChange = (e) => {
  const year = parseInt(e.target.value);
  setSelectedYear(year);
  setActiveYear(year);
  setShowAllYears(false); // Automatically uncheck the box when slider is moved
};

// Handle click on a list item to fly to its location
const handleListItemClick = (feature) => {
  if (mapRef.current) {
    const coordinates = feature.geometry.coordinates.slice();
    
    // Unspiderfy first
    if (spiderifierRef.current) {
      spiderifierRef.current.unspiderfy();
    }
    
    // Fly to the location
    mapRef.current.flyTo({
      center: coordinates,
      zoom: 10,
      speed: 1.2
    });
    
    // Show popup after a short delay to ensure map has moved
    setTimeout(() => {
      createPopup(feature).addTo(mapRef.current);
    }, 1000);
  }
};

// Apply filters whenever selected filters change
useEffect(() => {
  if (isDataLoaded) {
    applyFilters();
    
    // Count active filters (excluding year filter which is now at bottom)
    let count = 0;
    
    // Count unchecked categories
    Object.values(selectedCategories).forEach(isSelected => {
      if (!isSelected) count++;
    });
    
    // Count unchecked countries
    Object.values(selectedCountries).forEach(isSelected => {
      if (!isSelected) count++;
    });
    
    // Check search query
    if (searchQuery) count++;
    
    setActiveFilterCount(count);
  }
}, [applyFilters, isDataLoaded, selectedCategories, selectedCountries, searchQuery, selectedYear, showAllYears]);

useEffect(() => {
  // Fetch data when component mounts
  fetchData();
  
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
      })
      .catch(err => {
        console.error("Error loading icons:", err);
        mapContainerRef.current?.removeChild(loadingEl);
      });
  });

  return () => map.remove();
}, [fetchData]);

return (
  <>
    <div className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        <h2>Defence Diplomacy Tracker</h2>
        <div className="sidebar-actions">
          <button 
            className={`action-button ${activeFilterCount > 0 ? 'has-active-filters' : ''}`}
            onClick={toggleFilterPopup}
          >
            <span className="button-icon">🔍</span>
            Filters {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
          </button>
          <button 
            className="action-button"
            onClick={toggleStats}
          >
            <span className="button-icon">📊</span>
            Stats
          </button>
        </div>
      </div>
      
      <div className="entries-list">
        <h3>Events ({filteredData.length})</h3>
        {filteredData.length === 0 ? (
          <p>No events match your filters.</p>
        ) : (
          filteredData.map((feature, index) => (
            <div 
              key={index} 
              className="entry-item" 
              onClick={() => handleListItemClick(feature)}
            >
              <div className="entry-title">
                {feature.properties.Diplomacy_category || 'Unknown Category'}
              </div>
              <div className="entry-subtitle">
                {feature.properties.Delivering_Country || 'Unknown'} → {feature.properties.Receiving_Countries || 'Unknown'}
                {feature.properties.Year ? ` (${feature.properties.Year})` : ''}
              </div>
              {feature.properties.Comments && (
                <div className="entry-description">
                  {feature.properties.Comments.length > 100 
                    ? `${feature.properties.Comments.substring(0, 100)}...` 
                    : feature.properties.Comments}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Filter Popup */}
      {showFilterPopup && (
        <div className="filter-popup">
          <div className="filter-popup-header">
            <h3>Filter Options</h3>
            <button className="close-button" onClick={toggleFilterPopup}>×</button>
          </div>
          
          <div className="filter-popup-content">
            {/* Search input removed as requested */}
            
            <div className="filter-group">
              <h3>
                Diplomacy Categories
                <div className="filter-buttons">
                  <button onClick={() => handleSelectAllCategories(true)}>All</button>
                  <button onClick={() => handleSelectAllCategories(false)}>None</button>
                </div>
              </h3>
              <div className="checkbox-container">
                {categoryList.map(category => (
                  <div key={category} className="checkbox-item">
                    <input
                      type="checkbox"
                      id={`category-${category}`}
                      checked={selectedCategories[category] || false}
                      onChange={(e) => handleCategoryChange(category, e.target.checked)}
                    />
                    <label htmlFor={`category-${category}`}>{category}</label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="filter-group">
              <h3>
                Delivering Countries
                <div className="filter-buttons">
                  <button onClick={() => handleSelectAllCountries(true)}>All</button>
                  <button onClick={() => handleSelectAllCountries(false)}>None</button>
                </div>
              </h3>
              <div className="checkbox-container">
                {countryList.map(country => (
                  <div key={country} className="checkbox-item">
                    <input
                      type="checkbox"
                      id={`country-${country}`}
                      checked={selectedCountries[country] || false}
                      onChange={(e) => handleCountryChange(country, e.target.checked)}
                    />
                    <label htmlFor={`country-${country}`}>{country}</label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="filter-actions">
              <button 
                className="filter-reset-button" 
                onClick={() => {
                  handleSelectAllCategories(true);
                  handleSelectAllCountries(true);
                  setYearRange([availableYearRange[0], availableYearRange[1]]);
                  setSearchQuery('');
                  toggleFilterPopup();
                }}
              >
                Reset All Filters
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Statistics Panel */}
      {showStats && (
        <div className="stats-panel">
          <div className="stats-panel-header">
            <h3>Event Statistics</h3>
            <button className="close-button" onClick={toggleStats}>×</button>
          </div>
          
          <div className="stats-panel-content">
            <div className="stats-summary">
              <div className="stat-box">
                <span className="stat-value">{allData.length}</span>
                <span className="stat-label">Total Events</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">{countryList.length}</span>
                <span className="stat-label">Countries</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">{categoryList.length}</span>
                <span className="stat-label">Categories</span>
              </div>
            </div>
            
            <div className="stats-chart">
              <h4>Events by Category</h4>
              <div className="chart-container category-chart">
                {categoryList.map(category => {
                  const count = allData.filter(f => 
                    f.properties.Diplomacy_category === category
                  ).length;
                  const percentage = allData.length > 0 
                    ? Math.round((count / allData.length) * 100) 
                    : 0;
                  
                  return (
                    <div key={category} className="chart-bar-item">
                      <div className="chart-bar-label">{category}</div>
                      <div className="chart-bar-container">
                        <div 
                          className="chart-bar" 
                          style={{width: `${percentage}%`}}
                        ></div>
                        <span className="chart-bar-value">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="stats-chart">
              <h4>Top Delivering Countries</h4>
              <div className="chart-container country-chart">
                {countryList
                  .map(country => ({
                    name: country,
                    count: allData.filter(f => 
                      f.properties.Delivering_Country === country
                    ).length
                  }))
                  .sort((a, b) => b.count - a.count) // Sort by count in descending order
                  .slice(0, 5) // Take top 5
                  .map(({name: country, count}) => {
                    const percentage = allData.length > 0 
                      ? Math.round((count / allData.length) * 100) 
                      : 0;
                    
                    return (
                      <div key={country} className="chart-bar-item">
                        <div className="chart-bar-label">{country}</div>
                        <div className="chart-bar-container">
                          <div 
                            className="chart-bar" 
                            style={{width: `${percentage}%`}}
                          ></div>
                          <span className="chart-bar-value">{count}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            
            <div className="stats-chart">
              <h4>Events Timeline</h4>
              <div className="chart-container timeline-chart">
                <div className="timeline-years">
                  {Array.from(new Set(allData
                    .map(f => f.properties.Year)
                    .filter(year => year !== undefined && year !== null)
                    .sort((a, b) => parseInt(a) - parseInt(b)))).map(year => {
                      const yearCount = allData.filter(f => f.properties.Year == year).length;
                      const maxCount = Math.max(1, ...Array.from(new Set(allData
                        .map(f => f.properties.Year)
                        .filter(y => y !== undefined && y !== null)))
                        .map(y => allData.filter(f => f.properties.Year == y).length));
                      
                      // Ensure height is at least 10% and at most 90% of available space
                      const heightPercentage = Math.max(10, Math.min(90, (yearCount / maxCount) * 100));
                      
                      return (
                        <div key={year} className="timeline-year">
                          <div 
                            className="timeline-bar" 
                            style={{height: `${heightPercentage}px`}}
                            title={`${yearCount} events in ${year}`}
                          >
                            {/* Add the count number on top of the bar */}
                            <span className="timeline-count">{yearCount}</span>
                          </div>
                          <div className="timeline-year-label">{year}</div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    
    <button 
      className={`sidebar-toggle ${sidebarCollapsed ? 'toggle-expanded' : ''}`}
      onClick={toggleSidebar}
    >
      {sidebarCollapsed ? '»' : '«'}
    </button>
    
    <div 
      id="map-container" 
      ref={mapContainerRef} 
      className={sidebarCollapsed ? 'map-expanded' : ''}
    />
    
    {/* New compact year slider based on sliderbar */}
    {availableYears.length > 0 && (
      <div className="sliderbar" id="sliderbar">
        <h2>Year: <span id="active-year">{showAllYears ? 'All Years' : activeYear}</span></h2>
        <input 
          id="slider" 
          className="rounded" 
          type="range" 
          min={availableYearRange[0]} 
          max={availableYearRange[1]} 
          step="1" 
          value={activeYear || availableYearRange[0]} 
          onChange={handleYearChange}
        />
        <label htmlFor="show-all-years">
          <input 
            type="checkbox" 
            id="show-all-years" 
            checked={showAllYears}
            onChange={toggleAllYears}
          />
          Show All Years
        </label>
      </div>
    )}
  </>
);
}

// ========== HELPER FUNCTIONS ==========

// Creates a loading indicator element
function createLoadingIndicator() {
const loadingEl = document.createElement('div');
loadingEl.className = 'loading-indicator';
loadingEl.innerHTML = `
  <div class="loading-spinner"></div>
  <span>Loading map data...</span>
`;
loadingEl.style.position = 'absolute';
loadingEl.style.top = '50%';
loadingEl.style.left = '50%';
loadingEl.style.transform = 'translate(-50%, -50%)';
loadingEl.style.padding = '15px 20px';
loadingEl.style.borderRadius = '10px';
loadingEl.style.backgroundColor = 'rgba(255,255,255,0.9)';
loadingEl.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
loadingEl.style.zIndex = '1000';
loadingEl.style.display = 'flex';
loadingEl.style.alignItems = 'center';
loadingEl.style.gap = '10px';

// Add CSS for spinner
const style = document.createElement('style');
style.textContent = `
  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #e51f30;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

return loadingEl;
}

// Creates a fallback circle icon
function createFallbackCircleIcon(map, iconId) {
const canvas = document.createElement('canvas');
canvas.width = 24;
canvas.height = 24;
const ctx = canvas.getContext('2d');

// Use primary theme color for fallback icons
const color = '#e51f30';

ctx.fillStyle = color;
ctx.beginPath();
ctx.arc(12, 12, 10, 0, 2 * Math.PI);
ctx.fill();
ctx.strokeStyle = '#fff';
ctx.lineWidth = 2;
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
    
    // Also load the hover version of each icon (larger version)
    iconPromises.push(loadLargerIcon(map, icon.url, `${icon.id}-hover`));
  });
  
  // Load hover version of default icon
  iconPromises.push(loadLargerIcon(map, defaultIcon.url, `${defaultIcon.id}-hover`));
  
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

// Loads a larger version of an icon for hover states
function loadLargerIcon(map, url, id) {
return new Promise((resolve) => {
  const testImg = new Image();
  testImg.onload = () => {
    console.log(`Loading hover icon ${id}`);
    // Create a canvas to resize the icon
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Load the original image to get its dimensions
    const img = new Image();
    img.onload = () => {
      // Same size, but with extra padding at top for upward shift
      canvas.width = img.width;
      canvas.height = img.height + 3; // 3px padding at top
      
      // Draw the image shifted up by 3px
      ctx.drawImage(img, 0, 0, img.width, img.height);
      
      // Add the modified image as a map icon
      map.addImage(id, { 
        width: canvas.width, 
        height: canvas.height, 
        data: ctx.getImageData(0, 0, canvas.width, canvas.height).data 
      });
      resolve();
    };
    img.onerror = () => {
      console.error(`Failed to load image for larger icon ${id}`);
      createFallbackLargerCircleIcon(map, id);
      resolve();
    };
    img.src = url;
  };
  testImg.onerror = () => {
    console.error(`Icon ${id} is not accessible - using fallback`);
    createFallbackLargerCircleIcon(map, id);
    resolve();
  };
  testImg.src = url;
});
}

// Creates a fallback hover icon (shifted up) for hover states
function createFallbackLargerCircleIcon(map, iconId) {
const canvas = document.createElement('canvas');
canvas.width = 24;
canvas.height = 27; // Extra height for the shift
const ctx = canvas.getContext('2d');

// Use primary theme color for fallback hover icons
const color = '#e51f30';

// Draw the circle shifted up
ctx.fillStyle = color;
ctx.beginPath();
ctx.arc(12, 12, 10, 0, 2 * Math.PI);
ctx.fill();
ctx.strokeStyle = 'white';
ctx.lineWidth = 2;
ctx.stroke();

map.addImage(iconId, { 
  width: 24, 
  height: 27, 
  data: ctx.getImageData(0, 0, 24, 27).data 
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
    'icon-size': 0.8,
    'icon-allow-overlap': true 
  }
});

// Cluster count layer - TEXT COLOR CHANGED TO BLACK
map.addLayer({
  id: 'cluster-count', 
  type: 'symbol', 
  source: 'markers',
  filter: ['has', 'point_count'],
  layout: { 
    'text-field': ['get', 'point_count_abbreviated'], 
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'], 
    'text-size': 12
  },
  paint: {
    'text-color': '#000000' // Changed to black as requested
  }
});
}

// Add unclustered point layer to the map
function addUnclusteredPointLayer(map) {
// Create a source with a unique id to store only the hovered feature
map.addSource('hover-point', {
  type: 'geojson',
  data: {
    type: 'FeatureCollection',
    features: []
  }
});

// Regular unclustered points layer
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
    'icon-size': 0.42,
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

// Hover layer using the special hover icons
map.addLayer({
  id: 'unclustered-point-hover',
  type: 'symbol',
  source: 'hover-point', // Use our dedicated hover source
  layout: {
    'icon-image': [
      'match',
      ['get', 'Diplomacy_category'],
      // Match each category to its hover icon
      'Arms control', 'icon-arms-control-hover',
      'Cultural Diplomacy (Defence)', 'icon-cultural-diplomacy-hover',
      'Defence Cooperation', 'icon-defence-cooperation-hover',
      'Defence Infrastructure', 'icon-defence-infrastructure-hover',
      'HADR – Disaster Response', 'icon-hadr-hover',
      'Maritime Security', 'icon-maritime-security-hover',
      'Military Exercises', 'icon-military-exercises-hover',
      'Military Medical Diplomacy', 'icon-military-medical-hover',
      'MIL-POL Engagement', 'icon-milpol-hover',
      'Public Diplomacy', 'icon-public-diplomacy-hover',
      'Sports Diplomacy (Defence)', 'icon-sports-diplomacy-hover',
      'Training', 'icon-training-hover',
      'Visit Diplomacy (Defence)', 'icon-visit-diplomacy-hover',
      // Default hover icon
      'default-hover'
    ],
    'icon-size': 0.42, // Match the size of regular icons
    'icon-allow-overlap': true,
    'icon-anchor': 'bottom',
    'icon-offset': [0, 0]
  },
  paint: {
    'icon-halo-color': '#ffffff',
    'icon-halo-width': 2,
    'icon-halo-blur': 1
  }
});
}

// Create HTML content for popups with improved styling (based on app.js popup structure)
function createPopupHTML(props) {
const popupContent = document.createElement('div');
popupContent.className = 'popup-container';

// Heading line
const headingBox = document.createElement('div');
const popupHeading = props.Diplomacy_category;
headingBox.innerHTML = '<h2 style="font-weight: bold; text-align: center;">' + (popupHeading || 'Default Heading') + '</h2>';
headingBox.style.borderBottom = '1px solid #ccc';
headingBox.style.paddingBottom = '10px';
headingBox.style.textAlign = 'center';
popupContent.appendChild(headingBox);

// Description line
if (props.Comments) {
  const descriptionBox = document.createElement('div');
  descriptionBox.innerHTML = '<p style="text-align: center;">' + props.Comments + '</p>';
  descriptionBox.style.borderBottom = '1px solid #ccc';
  descriptionBox.style.paddingBottom = '10px';
  descriptionBox.style.textAlign = 'center';
  popupContent.appendChild(descriptionBox);
}

// Delivering Country
const categoryBox1 = document.createElement('div');
const category1 = props.Delivering_Country;
categoryBox1.innerHTML = '<p style="text-align: center;"><strong>Delivering Country</strong> ' + (category1 || 'Unknown') + '</p>';
categoryBox1.style.borderBottom = '1px solid #ccc';
categoryBox1.style.textAlign = 'center';
popupContent.appendChild(categoryBox1);

// Receiving Country
const categoryBox2 = document.createElement('div');
const category2 = props.Receiving_Countries;
categoryBox2.innerHTML = '<p style="text-align: center;"><strong>Receiving Country</strong> ' + (category2 || 'Unknown') + '</p>';
categoryBox2.style.borderBottom = '1px solid #ccc';
categoryBox2.style.textAlign = 'center';
popupContent.appendChild(categoryBox2);

// Year (Added)
if (props.Year) {
  const yearBox = document.createElement('div');
  yearBox.innerHTML = '<p style="text-align: center;"><strong>Year</strong> ' + props.Year + '</p>';
  yearBox.style.borderBottom = '1px solid #ccc';
  yearBox.style.textAlign = 'center';
  popupContent.appendChild(yearBox);
}

// Source link as button
if (props.Source) {
  const finalDescriptionBox = document.createElement('div');
  finalDescriptionBox.style.textAlign = 'center';
  
  // Create a button for the source link
  const sourceButton = document.createElement('button');
  sourceButton.innerText = 'Source';
  sourceButton.onclick = function() {
    window.open(props.Source, '_blank');
  };
  sourceButton.style.textDecoration = 'none';
  sourceButton.style.color = 'white';
  sourceButton.style.backgroundColor = '#e51f30';
  sourceButton.style.border = 'none';
  sourceButton.style.borderRadius = '4px';
  sourceButton.style.padding = '8px 16px';
  sourceButton.style.margin = '10px 0 0 0';
  sourceButton.style.cursor = 'pointer';
  sourceButton.style.fontWeight = 'bold';
  sourceButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
  
  finalDescriptionBox.appendChild(sourceButton);
  popupContent.appendChild(finalDescriptionBox);
}

// Styling for the popup content
popupContent.style.border = '1px solid #ccc';
popupContent.style.padding = '15px';
popupContent.style.width = 'auto';
popupContent.style.height = 'auto';
popupContent.style.borderRadius = '8px';
popupContent.style.backgroundColor = 'rgba(255, 255, 255, 0.85)'; // Semi-transparent background
popupContent.style.backdropFilter = 'blur(5px)';
popupContent.style.fontFamily = '"Segoe UI", Roboto, -apple-system, BlinkMacSystemFont, Arial, sans-serif'; // Modern font stack

return popupContent;
}

// Create a popup for a feature
function createPopup(feature) {
const coords = feature.geometry.coordinates.slice();
const popupContent = createPopupHTML(feature.properties);

return new mapboxgl.Popup({
  offset: [0, -40],
  anchor: 'bottom',
  closeButton: true,
  closeOnClick: true,
  className: 'feature-popup'
})
.setLngLat(coords)
.setDOMContent(popupContent);
}

// Setup event handlers for unclustered points
function setupUnclusteredPointHandlers(map) {
let activePopup = null;
let hoverPopup = null;

// Hover handler for unclustered points
map.on('mouseenter', 'unclustered-point', (e) => {
  map.getCanvas().style.cursor = 'pointer';
  const feature = e.features[0];
  
  // Update the hover point source with this feature
  map.getSource('hover-point').setData({
    type: 'FeatureCollection',
    features: [feature]
  });
  
  // If there's no active popup (from click), show a hover popup
  if (!activePopup) {
    const coords = feature.geometry.coordinates.slice();
    const popupContent = createPopupHTML(feature.properties);
    
    // Create hover popup
    hoverPopup = new mapboxgl.Popup({
      offset: [0, -40],
      anchor: 'bottom',
      closeButton: false,
      closeOnClick: false,
      className: 'hover-popup'
    })
    .setLngLat(coords)
    .setDOMContent(popupContent)
    .addTo(map);
  }
});

// Mouse leave handler for unclustered points
map.on('mouseleave', 'unclustered-point', () => {
  map.getCanvas().style.cursor = '';
  
  // Clear the hover state by emptying the source
  map.getSource('hover-point').setData({
    type: 'FeatureCollection',
    features: []
  });
  
  // Remove hover popup if it exists
  if (hoverPopup && !activePopup) {
    hoverPopup.remove();
    hoverPopup = null;
  }
});

// Click handler for unclustered points
map.on('click', 'unclustered-point', (e) => {
  const feature = e.features[0];
  
  // Remove previous popups
  if (hoverPopup) {
    hoverPopup.remove();
    hoverPopup = null;
  }
  
  if (activePopup) {
    activePopup.remove();
  }
  
  // Create and show the popup
  activePopup = createPopup(feature).addTo(map);
  
  // Remove active popup when it's closed
  activePopup.on('close', () => {
    activePopup = null;
  });
});

// Handle click anywhere on the map to close active popup
map.on('click', (e) => {
  const features = map.queryRenderedFeatures(e.point, { 
    layers: ['unclustered-point', 'clusters'] 
  });
  
  // If click is not on a feature and there's an active popup, remove it
  if (features.length === 0 && activePopup) {
    activePopup.remove();
    activePopup = null;
  }
});
}

// Setup the spiderifier for clusters using the custom pin approach
function setupSpiderifier(map) {
let largeClusterPopup = null;
let isSpiderifyingPrevented = false;

// Store references to all active popups and pins
let activePopups = new Map();
let hoverTimeout = null;

// Define category colors - using the primary theme color as base
const categoryColors = {
  'Arms control':                  '#e51f30',  // Primary red
  'Cultural Diplomacy (Defence)':  '#e5571f',  // Orange-red
  'Defence Cooperation':           '#e5851f',  // Orange
  'Defence Infrastructure':        '#e5c01f',  // Yellow
  'HADR – Disaster Response':      '#c3e51f',  // Yellow-green
  'Maritime Security':             '#85e51f',  // Green
  'Military Exercises':            '#1fe51f',  // Green
  'Military Medical Diplomacy':    '#1fe585',  // Teal
  'MIL-POL Engagement':            '#1fc0e5',  // Light blue
  'Public Diplomacy':              '#1f85e5',  // Blue
  'Sports Diplomacy (Defence)':    '#1f57e5',  // Deep blue
  'Training':                      '#571fe5',  // Purple
  'Visit Diplomacy (Defence)':     '#c01fe5'   // Magenta
};

// Initialize the spiderifier with custom pin options
const spiderifier = new MapboxglSpiderifier(map, {
  animate: true,
  animationSpeed: 200,
  customPin: true,
  
  // Spacing configuration - increased values for larger icons
  circleSpiralSwitchover: 9,
  circleFootSeparation: 120,    // Increased for larger icons
  spiralFootSeparation: 120,    // Increased for larger icons
  spiralLengthStart: 50,       // Increased for better spacing
  spiralLengthFactor: 15,      // Increased for better spacing
  
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
    
    // Make spiderfied icons larger
    spiderLeg.elements.pin.style.width = '60px';
    spiderLeg.elements.pin.style.height = '60px';
    spiderLeg.elements.pin.style.margin = '0';
    spiderLeg.elements.pin.style.padding = '0';
    spiderLeg.elements.pin.style.overflow = 'hidden';
    spiderLeg.elements.pin.style.position = 'absolute';
    spiderLeg.elements.pin.style.transform = 'translate(-30px, -30px)'; // Center the pin
    spiderLeg.elements.pin.style.pointerEvents = 'auto'; // Ensure clicks are captured
    spiderLeg.elements.pin.style.transition = 'transform 0.2s ease'; // Add transform transition for enlarge effect
    
    // Set the icon as the background of the pin element itself
    const iconUrl = categoryIcons[category]?.url || defaultIcon.url;
    spiderLeg.elements.pin.style.backgroundImage = `url(${iconUrl})`;
    spiderLeg.elements.pin.style.backgroundSize = 'contain';
    spiderLeg.elements.pin.style.backgroundRepeat = 'no-repeat';
    spiderLeg.elements.pin.style.backgroundPosition = 'center';
    
    // Store a reference to the feature
    const feature = spiderLeg.feature;
    
    // Add event listeners for hover
    spiderLeg.elements.pin.addEventListener('mouseenter', function() {
      // Add enlarge effect on hover
      spiderLeg.elements.pin.style.transform = 'translate(-30px, -30px) scale(1.1)';
      spiderLeg.elements.pin.style.zIndex = '10';
      
      const popupContent = createPopupHTML(feature.properties);
      
      // Calculate popup position based on pin's screen coordinates
      const pinRect = spiderLeg.elements.pin.getBoundingClientRect();
      const mapContainer = map.getContainer();
      const mapRect = mapContainer.getBoundingClientRect();
      const point = new mapboxgl.Point(
        pinRect.left + (pinRect.width / 2) - mapRect.left,
        pinRect.top - mapRect.top
      );
      
      const lngLat = map.unproject(point);
      
      // Create and show a popup
      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        anchor: 'bottom',
        offset: [0, -20], // Reduced offset to make popup appear closer to icon
        className: 'hover-popup'
      })
      .setLngLat(lngLat)
      .setDOMContent(popupContent)
      .addTo(map);
      
      // Store the popup reference
      spiderLeg.elements.pin.popup = popup;
    });
    
    // Remove popup on mouse leave
    spiderLeg.elements.pin.addEventListener('mouseleave', function() {
      // Reset transform on mouseleave
      spiderLeg.elements.pin.style.transform = 'translate(-30px, -30px)';
      spiderLeg.elements.pin.style.zIndex = '';
      
      if (spiderLeg.elements.pin.popup) {
        spiderLeg.elements.pin.popup.remove();
        spiderLeg.elements.pin.popup = null;
      }
    });
    
    // Handle clicks on spider leg
    spiderLeg.elements.pin.addEventListener('click', function() {
      // Remove any existing popup
      if (spiderLeg.elements.pin.popup) {
        spiderLeg.elements.pin.popup.remove();
        spiderLeg.elements.pin.popup = null;
      }
      
      // Calculate popup position based on pin's screen coordinates
      const pinRect = spiderLeg.elements.pin.getBoundingClientRect();
      const mapContainer = map.getContainer();
      const mapRect = mapContainer.getBoundingClientRect();
      const point = new mapboxgl.Point(
        pinRect.left + (pinRect.width / 2) - mapRect.left,
        pinRect.top - mapRect.top
      );
      
      const lngLat = map.unproject(point);
      
      // Create a new popup with close button
      const popupContent = createPopupHTML(feature.properties);
      const popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
        anchor: 'bottom',
        offset: [0, -20], // Reduced offset to make popup appear closer to icon
        className: 'feature-popup'
      })
      .setLngLat(lngLat)
      .setDOMContent(popupContent)
      .addTo(map);
    });
    
    // Style the line connecting to the center
    if (spiderLeg.elements.line) {
      spiderLeg.elements.line.setAttribute('stroke', '#e51f30');
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