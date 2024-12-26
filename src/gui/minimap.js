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
  const updateMinimap = (world, player) => {
    if (!world || !world.heightMap) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const terrainSize = world.heightMap.length;
    const pixelSize = canvas.width / terrainSize;
    
    // Draw terrain
    for (let z = 0; z < terrainSize; z++) {
      for (let x = 0; x < terrainSize; x++) {
        const height = world.heightMap[z][x];
        // Normalize height to 0-1 range
        const normalizedHeight = (height + 2) / 4; // Adjust these values based on your height range
        
        // Create a grayscale color based on height
        const color = Math.floor(normalizedHeight * 255);
        ctx.fillStyle = `rgb(${color},${color},${color})`;
        ctx.fillRect(
          x * pixelSize,
          z * pixelSize,
          pixelSize,
          pixelSize
        );
      }
    }

    // Draw objects
    if (world.serverObjects) {
      world.serverObjects.forEach(obj => {
        switch(obj.type) {
          case 'tree':
            ctx.fillStyle = '#2d5a27';
            break;
          case 'rock':
            ctx.fillStyle = '#808080';
            break;
          case 'bush':
            ctx.fillStyle = '#3d7a37';
            break;
          default:
            ctx.fillStyle = '#ffffff';
        }
        
        ctx.beginPath();
        ctx.arc(
          obj.position.x * pixelSize,
          obj.position.z * pixelSize,
          pixelSize,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
    }

    // Draw player position (white dot)
    if (player) {
      const playerPos = player.getPosition();
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(
        playerPos.x * pixelSize,
        playerPos.z * pixelSize,
        pixelSize * 1.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  };
  
  outerContainer.appendChild(minimapContainer);
  minimapContainer.appendChild(canvas);
  
  // Expose update function on the outer container
  outerContainer.updateMinimap = updateMinimap;
  
  return outerContainer;
};