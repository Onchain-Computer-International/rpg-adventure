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
  const updateMinimap = (world, player, cameraState) => {
    if (!world || !world.heightMap || !player || !player.getPosition) return;
    
    const playerPos = player.getPosition();
    const viewRadius = 12; // Shows 24x24 grid (12 tiles in each direction + player's tile)
    const tileSize = canvas.width / (viewRadius * 2); // Removed Math.floor to avoid rounding gaps
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save the current context state
    ctx.save();
    
    // Center and rotate the entire view
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.rotate(cameraState.angle);
    ctx.translate(-canvas.width/2, -canvas.height/2);
    
    // Calculate view boundaries
    const startX = Math.floor(playerPos.x) - viewRadius;
    const startZ = Math.floor(playerPos.z) - viewRadius;
    const endX = startX + (viewRadius * 2);
    const endZ = startZ + (viewRadius * 2);
    
    // Draw terrain
    for (let z = startZ; z < endZ; z++) {
      for (let x = startX; x < endX; x++) {
        // Check if the coordinates are within world bounds
        if (x >= 0 && x < world.heightMap[0].length && 
            z >= 0 && z < world.heightMap.length) {
          const height = world.heightMap[z][x];
          // Normalize height to 0-1 range
          const normalizedHeight = (height + 2) / 4;
          
          // Create a more muted green color based on height
          const baseGreen = 120; // Reduced from 180
          const greenVariation = 50; // Reduced from 75
          ctx.fillStyle = `rgb(60,${baseGreen + (normalizedHeight * greenVariation)},40)`; // Reduced red and blue
          
          // Calculate position relative to view
          const relX = (x - startX) * tileSize;
          const relZ = (z - startZ) * tileSize;
          
          // Draw slightly larger tiles to prevent gaps
          ctx.fillRect(
            relX - 0.5,
            relZ - 0.5,
            tileSize + 1,
            tileSize + 1
          );
        }
      }
    }

    // Draw objects within view
    if (world.serverObjects) {
      world.serverObjects.forEach(obj => {
        // Check if object is within view
        if (obj.position.x >= startX && obj.position.x < endX &&
            obj.position.z >= startZ && obj.position.z < endZ) {
          
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
          
          const relX = (obj.position.x - startX) * tileSize;
          const relZ = (obj.position.z - startZ) * tileSize;
          
          ctx.beginPath();
          ctx.arc(
            relX + tileSize/2,
            relZ + tileSize/2,
            tileSize/2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      });
    }

    // Draw player (always in center)
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(
      canvas.width/2,
      canvas.height/2,
      tileSize/2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Restore the context state
    ctx.restore();

    // Draw North indicator that rotates with the camera
    const radius = canvas.width / 2 - 10;
    const northAngle = cameraState.angle;
    const northX = canvas.width/2 + Math.sin(northAngle) * radius;
    const northY = canvas.height/2 - Math.cos(northAngle) * radius;

    // Draw north marker
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.moveTo(northX, northY - 8);
    ctx.lineTo(northX - 4, northY);
    ctx.lineTo(northX + 4, northY);
    ctx.closePath();
    ctx.fill();

    // Draw 'N' text
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', northX, northY - 12);
  };
  
  outerContainer.appendChild(minimapContainer);
  minimapContainer.appendChild(canvas);
  
  // Expose update function on the outer container
  outerContainer.updateMinimap = updateMinimap;
  
  return outerContainer;
};