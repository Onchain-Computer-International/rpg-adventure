import * as THREE from 'three';
import { Vector3 } from 'three';
import { createCharacter } from './character';
import { createPathVisualization } from './character/pathVisualization';
import { createPositionDisplay } from './gui/positionDisplay';

const createPlayer = (camera, world, playerConfig = {}, wsService) => {
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

  const character = createCharacter(initialPosition, world, playerOptions);
  const pathVisualization = createPathVisualization(world);

  // Pre-create reusable objects
  const raycaster = new THREE.Raycaster();
  const mouseCoords = new THREE.Vector2();
  const targetPosition = new Vector3();

  const getTerrainHeight = (x, z) => {
    if (world.getTerrainHeight) {
      return world.getTerrainHeight(x, z);
    }
    // Fallback to using heightMap directly if getTerrainHeight is not available
    try {
      return world.heightMap[Math.floor(z)][Math.floor(x)];
    } catch (err) {
      console.warn('Could not get terrain height, using default height 0');
      return 0;
    }
  };

  const update = (deltaTime) => {
    character.update(deltaTime);
    pathVisualization.updatePathNodes(character);
    updateCamera(character.getPosition());
    positionDisplay.updatePosition(character.getPosition());
  };

  const updateCamera = (position) => {
    camera.position.x = position.x;
    camera.position.y = position.y + playerConfig.cameraOffset.y;
    camera.position.z = position.z + playerConfig.cameraOffset.z;
    camera.lookAt(position);
  };

  const onMouseDown = (event) => {
    mouseCoords.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    raycaster.setFromCamera(mouseCoords, camera);
    const intersections = raycaster.intersectObject(world.terrain);

    if (intersections.length > 0) {
      targetPosition.copy(intersections[0].point);
      targetPosition.y = getTerrainHeight(targetPosition.x, targetPosition.z) + 0.5;
      setTargetPosition(targetPosition);

      // Send position update to server
      if (wsService) {
        wsService.sendUpdate({
          x: Math.floor(targetPosition.x),
          z: Math.floor(targetPosition.z)
        });
      }
    }
  };

  const setTargetPosition = (position) => {
    const y = position.y ?? getTerrainHeight(position.x, position.z) + 0.5;
    const targetPos = new Vector3(position.x, y, position.z);
    character.setTargetPosition(targetPos);
    pathVisualization.visualizePath(character.getPath());
  };

  const setPosition = (position) => {
    // Ensure y position is above terrain
    const y = position.y ?? getTerrainHeight(position.x, position.z) + 0.5;
    const newPos = new Vector3(position.x, y, position.z);
    character.mesh.position.copy(newPos);
    character.setTargetPosition(newPos);
    updateCamera(newPos);
    positionDisplay.updatePosition(newPos);
  };

  // Add event listener for mouse clicks
  window.addEventListener('mousedown', onMouseDown);

  const updateFromServer = (data) => {
    if (data.position) {
      const newPosition = new Vector3(
        data.position.x,
        getTerrainHeight(data.position.x, data.position.z) + 0.5,
        data.position.z
      );

      // If the change is large, update current position immediately
      if (character.getPosition().distanceTo(newPosition) > 10) {
        setPosition(newPosition);
      } else {
        setTargetPosition(newPosition);
      }
    }

    if (data.rotation) {
      character.mesh.rotation.y = data.rotation;
    }
  };

  return {
    mesh: character.mesh,
    update,
    getPosition: () => character.getPosition(),
    setPosition,
    setTargetPosition,
    updateFromServer,
    getPath: () => character.getPath()
  };
};

export { createPlayer };