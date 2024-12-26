import * as THREE from 'three';

export const createMinimap = () => {
  let currentUser = null;
  let currentPlayer = null;  // Store current player state
  let ws = null;

  // Try to load saved user data
  const savedUserId = localStorage.getItem('userId');

  const authenticate = async (username = null) => {
    try {
      const response = await fetch('http://localhost:3000/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: savedUserId,
          username
        })
      });

      const userData = await response.json();
      if (userData.id) {
        localStorage.setItem('userId', userData.id);
        currentUser = userData;
        return true;
      }
    } catch (error) {
      console.error('Authentication failed:', error);
    }
    return false;
  };

  // Show login dialog if needed
  const showLoginDialog = () => {
    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: '#fff',
      padding: '20px',
      borderRadius: '5px',
      boxShadow: '0 0 10px rgba(0,0,0,0.5)',
      zIndex: 1000
    });

    dialog.innerHTML = `
      <h2>Welcome to the Game</h2>
      <p>Please enter your username:</p>
      <input type="text" id="username" style="margin: 10px 0; padding: 5px;">
      <button id="submit" style="padding: 5px 10px;">Start Playing</button>
    `;

    document.body.appendChild(dialog);

    const input = dialog.querySelector('#username');
    const button = dialog.querySelector('#submit');

    return new Promise(resolve => {
      button.onclick = async () => {
        const username = input.value.trim();
        if (username) {
          const success = await authenticate(username);
          if (success) {
            dialog.remove();
            resolve(true);
          }
        }
      };
    });
  };

  // Initialize authentication
  (async () => {
    if (savedUserId) {
      const success = await authenticate();
      if (!success) {
        await showLoginDialog();
      }
    } else {
      await showLoginDialog();
    }
  })();

  // Create container
  const minimapContainer = document.createElement('div');
  minimapContainer.id = 'minimap';

  // Function to initialize WebSocket connection
  const initializeWebSocket = () => {
    ws = new WebSocket('ws://localhost:3000');
    
    ws.onopen = () => {
      // Send authentication when connection is established
      if (currentUser) {
        ws.send(JSON.stringify({
          type: 'auth',
          userId: currentUser.id
        }));
      }
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'auth_success':
          console.log('Authentication successful');
          if (data.player && data.player.position) {
            currentPlayer = data.player;
            console.log('Restored position:', currentPlayer.position);
            // Trigger initial minimap update with saved position
            updateMinimap(world, currentPlayer);
          }
          break;
        case 'move_confirm':
          console.log('Move confirmed:', data.position);
          if (currentPlayer && data.position) {
            currentPlayer.position = data.position;
            // Update minimap with new position
            updateMinimap(world, currentPlayer);
          }
          break;
        case 'world_update':
          // Handle world updates if needed
          break;
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
      // Attempt to reconnect after a delay
      setTimeout(initializeWebSocket, 5000);
    };
  };

  // Create canvas for the minimap
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  minimapContainer.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Add click handler for movement
  canvas.addEventListener('click', (event) => {
    if (!currentUser || !currentPlayer || !ws || ws.readyState !== WebSocket.OPEN) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Get current player position
    const playerPos = currentPlayer.position;
    
    // Convert click coordinates to world coordinates
    const worldX = Math.floor(playerPos.x + (x - canvas.width/2));
    const worldZ = Math.floor(playerPos.z + (y - canvas.height/2));
    
    // Send move request to server
    ws.send(JSON.stringify({
      type: 'move',
      position: { x: worldX, z: worldZ }
    }));
    
    // Update local player position immediately
    currentPlayer.position = { x: worldX, z: worldZ };
    // Update minimap immediately for responsive feedback
    updateMinimap(world, currentPlayer);
  });

  // Initialize WebSocket after authentication
  (async () => {
    if (savedUserId) {
      const success = await authenticate();
      if (!success) {
        await showLoginDialog();
      }
      initializeWebSocket();
    } else {
      await showLoginDialog();
      initializeWebSocket();
    }
  })();

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

  // Cache for chunk data
  const chunkCache = new Map();
  const CHUNK_SIZE = 100;
  const VISIBLE_CHUNKS = 3; // Number of chunks visible in each direction
  
  // Function to fetch chunk data
  const fetchChunk = async (x, z) => {
    const chunkId = `${x}_${z}`;
    if (!chunkCache.has(chunkId)) {
      try {
        const response = await fetch(`http://localhost:3000/api/map/chunk/${x}/${z}`);
        const data = await response.json();
        chunkCache.set(chunkId, data);
      } catch (error) {
        console.error('Failed to fetch chunk:', error);
        return null;
      }
    }
    return chunkCache.get(chunkId);
  };

  const getTerrainColor = (terrain) => {
    const biomeColors = {
      water: '#3498db',
      beach: '#f1c40f',
      plains: '#2ecc71',
      forest: '#27ae60',
      mountain: '#95a5a6'
    };
    return biomeColors[terrain.type] || '#2ecc71';
  };

  const getObjectColor = (object) => {
    const objectColors = {
      tree: '#145a32',
      pine_tree: '#0b5345',
      palm_tree: '#186a3b',
      bush: '#196f3d',
      rock: '#7f8c8d',
      seaweed: '#16a085',
      shell: '#f39c12',
      flower: '#e74c3c',
      mushroom: '#d35400'
    };
    return objectColors[object.type] || '#7f8c8d';
  };

  // Function to update the minimap
  const updateMinimap = async (world, player) => {
    if (!world || !player) return;

    const playerPos = player.getPosition();
    const playerChunkX = Math.floor(playerPos.x / CHUNK_SIZE);
    const playerChunkZ = Math.floor(playerPos.z / CHUNK_SIZE);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate visible area
    const visibleArea = {
      minX: playerPos.x - (canvas.width / 2),
      maxX: playerPos.x + (canvas.width / 2),
      minZ: playerPos.z - (canvas.height / 2),
      maxZ: playerPos.z + (canvas.height / 2)
    };

    // Fetch and draw visible chunks
    for (let dz = -VISIBLE_CHUNKS; dz <= VISIBLE_CHUNKS; dz++) {
      for (let dx = -VISIBLE_CHUNKS; dx <= VISIBLE_CHUNKS; dx++) {
        const chunkX = playerChunkX + dx;
        const chunkZ = playerChunkZ + dz;
        const chunk = await fetchChunk(chunkX, chunkZ);
        
        if (chunk) {
          // Draw terrain
          for (let z = 0; z < CHUNK_SIZE; z++) {
            for (let x = 0; x < CHUNK_SIZE; x++) {
              const worldX = chunkX * CHUNK_SIZE + x;
              const worldZ = chunkZ * CHUNK_SIZE + z;

              if (worldX < visibleArea.minX || worldX > visibleArea.maxX ||
                  worldZ < visibleArea.minZ || worldZ > visibleArea.maxZ) {
                continue;
              }

              const terrain = chunk.terrain[z][x];
              ctx.fillStyle = getTerrainColor(terrain);
              
              const pixelX = canvas.width/2 + (worldX - playerPos.x);
              const pixelZ = canvas.height/2 + (worldZ - playerPos.z);
              ctx.fillRect(pixelX, pixelZ, 1, 1);
            }
          }

          // Draw objects
          chunk.objects?.forEach(object => {
            const worldX = object.position.x;
            const worldZ = object.position.z;

            if (worldX < visibleArea.minX || worldX > visibleArea.maxX ||
                worldZ < visibleArea.minZ || worldZ > visibleArea.maxZ) {
              return;
            }

            const pixelX = canvas.width/2 + (worldX - playerPos.x);
            const pixelZ = canvas.height/2 + (worldZ - playerPos.z);

            ctx.fillStyle = getObjectColor(object);
            ctx.beginPath();
            ctx.arc(pixelX, pixelZ, 2, 0, Math.PI * 2);
            ctx.fill();
          });

          // Draw other players
          chunk.players?.forEach(otherPlayer => {
            if (otherPlayer.id !== player.id) {
              const pixelX = canvas.width/2 + (otherPlayer.position.x - playerPos.x);
              const pixelZ = canvas.height/2 + (otherPlayer.position.z - playerPos.z);
              
              ctx.fillStyle = '#e67e22';
              ctx.beginPath();
              ctx.arc(pixelX, pixelZ, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        }
      }
    }
  };

  // Expose update function
  minimapContainer.updateMinimap = updateMinimap;

  return minimapContainer;
};