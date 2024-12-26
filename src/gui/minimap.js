export const createMinimap = () => {
  // Create outer container
  const outerContainer = document.createElement('div');
  outerContainer.id = 'minimap-container';
  outerContainer.style.cssText = `
    position: relative;
    width: 100%;
    height: 300px;
  `;

  // Create minimap container
  const minimapContainer = document.createElement('div');
  minimapContainer.id = 'minimap';
  minimapContainer.style.cssText = `
    position: absolute;
    top: 20px;
    right: 20px;
    width: 150px;
    height: 150px;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid #776d51;
    border-radius: 50%;
    overflow: hidden;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  `;

  // Create canvas for the minimap
  const canvas = document.createElement('canvas');
  canvas.width = 150;
  canvas.height = 150;
  
  // Initialize the minimap
  const ctx = canvas.getContext('2d');
  
  // Function to update minimap
  const updateMinimap = (playerX, playerY, worldData) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw player position (white dot in center)
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 2, 0, Math.PI * 2);
    ctx.fill();
  };
  
  outerContainer.appendChild(minimapContainer);
  minimapContainer.appendChild(canvas);
  
  // Expose update function on the outer container
  outerContainer.updateMinimap = updateMinimap;
  
  // Initial draw
  updateMinimap(0, 0, null);
  
  return outerContainer;
};