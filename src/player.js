import * as THREE from 'three';
import { Vector3 } from 'three';
import { createCharacter } from './character';
import { createPathVisualization } from './character/pathVisualization';
import { createPositionDisplay } from './gui/positionDisplay';

const createPlayer = (camera, world, playerConfig = {}) => {
  let ws = null;
  let currentUser = null;
  let player = null;
  const positionDisplay = createPositionDisplay();
  document.body.appendChild(positionDisplay.element);

  const initialX = playerConfig.initialPosition.x;
  const initialZ = playerConfig.initialPosition.z;
  const terrainHeight = world.heightMap[Math.floor(initialZ)][Math.floor(initialX)];
  const initialPosition = new Vector3(initialX, terrainHeight + 0.5, initialZ);

  const playerOptions = {
    geometry: new THREE.CapsuleGeometry(0.25, 0.5),
    material: new THREE.MeshStandardMaterial({ color: 0x4040c0 }),
    moveSpeed: playerConfig.moveSpeed,
    usePathfinding: true
  };

  player = createCharacter(initialPosition, world, playerOptions);

  // Initialize WebSocket connection
  const initWebSocket = () => {
    ws = new window.WebSocket('ws://localhost:3000');
    
    ws.onopen = () => {
      // Send authentication when connection is established
      const userId = localStorage.getItem('userId');
      if (userId) {
        ws.send(JSON.stringify({
          type: 'auth',
          userId
        }));
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'auth_success') {
        currentUser = data.player;
        // Update player position from saved data
        if (currentUser.position) {
          try {
            const x = currentUser.position.x;
            const z = currentUser.position.z;
            const y = world.heightMap[Math.floor(z)][Math.floor(x)] + 0.5;
            const savedPosition = new Vector3(x, y, z);
            console.log('Restoring saved position:', savedPosition);
            player.setPosition(savedPosition);
          } catch (error) {
            console.error('Error restoring player position:', error);
          }
        }
      }
    };

    ws.onerror = (error) => console.error('WebSocket error:', error);
    ws.onclose = () => setTimeout(initWebSocket, 5000);
  };

  initWebSocket();

  // Pre-create reusable objects
  const raycaster = new THREE.Raycaster();
  const mouseCoords = new THREE.Vector2();
  const targetPosition = new Vector3();

  const pathVisualization = createPathVisualization(world);

  const update = (deltaTime) => {
    player.update(deltaTime);
    pathVisualization.updatePathNodes(player);
    updateCamera(player.getPosition());
    positionDisplay.updatePosition(player.getPosition());
  };

  const onMouseDown = (event) => {
    mouseCoords.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(mouseCoords, camera);
    const intersections = raycaster.intersectObject(world.terrain);

    if (intersections.length > 0) {
      targetPosition.set(intersections[0].point.x, 0.5, intersections[0].point.z);
      // Convert world coordinates to grid coordinates
      const gridX = Math.floor(targetPosition.x);
      const gridZ = Math.floor(targetPosition.z);

      player.setTargetPosition(targetPosition);
      pathVisualization.visualizePath(player.getPath());
      
      console.log('Moving to grid position:', gridX, gridZ);
      
      // Send position update to server
      if (ws && ws.readyState === WebSocket.OPEN && currentUser) {
        ws.send(JSON.stringify({
          type: 'move',
          position: {
            x: gridX,
            z: gridZ
          }
        }));
      }
    }
  };

  window.addEventListener('mousedown', onMouseDown);

  const updateCamera = (position) => {
    camera.position.x = position.x;
    camera.position.y = position.y + playerConfig.cameraOffset.y;
    camera.position.z = position.z + playerConfig.cameraOffset.z;
    camera.lookAt(position);
  };

  return {
    ...player,
    update,
    mesh: player.mesh,
    getPosition: () => player.getPosition(),
    setPosition: (newPosition) => {
      player.mesh.position.copy(newPosition);
      player.setTargetPosition(newPosition);
      // Send position update to server when position is set programmatically
      if (ws && ws.readyState === WebSocket.OPEN && currentUser) {
        // Convert world coordinates to grid coordinates
        const gridX = Math.floor(newPosition.x);
        const gridZ = Math.floor(newPosition.z);
        
        console.log('Setting grid position:', gridX, gridZ);

        ws.send(JSON.stringify({
          type: 'move',
          position: {
            x: gridX,
            z: gridZ
          }
        }));
      }
      positionDisplay.updatePosition(newPosition);
    }
  };
};

export { createPlayer };