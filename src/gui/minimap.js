export const createMinimap = ({ chunkManager }) => {
  // Create container and canvas
  const minimapContainer = document.createElement('div');
  minimapContainer.id = 'minimap';
  
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  minimapContainer.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Create player marker
  const playerMarker = document.createElement('div');
  Object.assign(playerMarker.style, {
    position: 'absolute',
    width: '6px',
    height: '6px',
    backgroundColor: '#e74c3c',
    borderRadius: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    left: '50%',
    top: '50%'
  });
  minimapContainer.appendChild(playerMarker);

  // Add click handler for movement
  canvas.addEventListener('click', (event) => {
    if (!minimapContainer.onMinimapClick) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert minimap coordinates to world coordinates
    const worldX = Math.floor(x - canvas.width/2);
    const worldZ = Math.floor(y - canvas.height/2);
    
    // Call the movement handler provided by the game
    minimapContainer.onMinimapClick(worldX, worldZ);
  });

  // Function to update the minimap
  const updateMinimap = async (world, player) => {
    if (!world || !player) return;

    const playerPos = player.getPosition();
    const playerChunkX = Math.floor(playerPos.x / chunkManager.CHUNK_SIZE);
    const playerChunkZ = Math.floor(playerPos.z / chunkManager.CHUNK_SIZE);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate visible area
    const visibleArea = {
      minX: playerPos.x - (canvas.width / 2),
      maxX: playerPos.x + (canvas.width / 2),
      minZ: playerPos.z - (canvas.height / 2),
      maxZ: playerPos.z + (canvas.height / 2)
    };

    // Draw visible chunks
    for (let dz = -chunkManager.VISIBLE_CHUNKS; dz <= chunkManager.VISIBLE_CHUNKS; dz++) {
      for (let dx = -chunkManager.VISIBLE_CHUNKS; dx <= chunkManager.VISIBLE_CHUNKS; dx++) {
        const chunk = await chunkManager.fetchChunk(playerChunkX + dx, playerChunkZ + dz);
        if (!chunk) continue;

        drawChunk(chunk, playerPos, visibleArea);
      }
    }
  };

  // Helper function to draw a chunk
  const drawChunk = (chunk, playerPos, visibleArea) => {
    // Draw terrain
    chunk.terrain.forEach((row, z) => {
      row.forEach((terrain, x) => {
        const worldX = x + chunk.x * chunkManager.CHUNK_SIZE;
        const worldZ = z + chunk.z * chunkManager.CHUNK_SIZE;

        if (isInVisibleArea(worldX, worldZ, visibleArea)) {
          const pixelX = canvas.width/2 + (worldX - playerPos.x);
          const pixelZ = canvas.height/2 + (worldZ - playerPos.z);
          
          ctx.fillStyle = chunkManager.getTerrainColor(terrain);
          ctx.fillRect(pixelX, pixelZ, 1, 1);
        }
      });
    });

    // Draw objects
    chunk.objects?.forEach(object => {
      if (isInVisibleArea(object.position.x, object.position.z, visibleArea)) {
        drawObject(object, playerPos);
      }
    });

    // Draw other players
    chunk.players?.forEach(otherPlayer => {
      if (isInVisibleArea(otherPlayer.position.x, otherPlayer.position.z, visibleArea)) {
        drawPlayer(otherPlayer, playerPos);
      }
    });
  };

  const isInVisibleArea = (x, z, area) => {
    return x >= area.minX && x <= area.maxX && z >= area.minZ && z <= area.maxZ;
  };

  const drawObject = (object, playerPos) => {
    const pixelX = canvas.width/2 + (object.position.x - playerPos.x);
    const pixelZ = canvas.height/2 + (object.position.z - playerPos.z);

    ctx.fillStyle = chunkManager.getObjectColor(object);
    ctx.beginPath();
    ctx.arc(pixelX, pixelZ, 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawPlayer = (player, playerPos) => {
    const pixelX = canvas.width/2 + (player.position.x - playerPos.x);
    const pixelZ = canvas.height/2 + (player.position.z - playerPos.z);
    
    ctx.fillStyle = '#e67e22';
    ctx.beginPath();
    ctx.arc(pixelX, pixelZ, 3, 0, Math.PI * 2);
    ctx.fill();
  };

  minimapContainer.updateMinimap = updateMinimap;
  return minimapContainer;
};