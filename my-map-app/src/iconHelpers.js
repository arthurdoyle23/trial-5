import { categoryIcons, defaultIcon } from './config';

// Creates a loading indicator element
export function createLoadingIndicator() {
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

// Creates a fallback circle icon
export function createFallbackCircleIcon(map, iconId) {
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext('2d');
  
  // Random color based on id
  const hash = iconId.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
  const color = `hsl(${Math.abs(hash) % 360}, 70%, 50%)`;
  
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(12, 12, 10, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  map.addImage(iconId, { 
    width: 24, 
    height: 24, 
    data: ctx.getImageData(0, 0, 24, 24).data 
  });
}

// Loads a single icon with fallback
export function loadIcon(map, url, id) {
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

// Loads all icons (category icons, default icon, cluster icon)
export function loadAllIcons(map) {
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

// Create HTML content for popups
export function createPopupHTML(props) {
  return `
    <strong>Category:</strong> ${props.Diplomacy_category}<br/>
    <strong>From:</strong> ${props.Delivering_Country}<br/>
    <strong>To:</strong> ${props.Receiving_Countries}<br/>
    <strong>Year:</strong> ${props.Year}<br/>
    ${props.Comments ? `<em>${props.Comments}</em>` : ''}
  `;
}