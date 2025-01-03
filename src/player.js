import * as THREE from 'three';
import { Vector3 } from 'three';
import { createCharacter } from './character';
import { createPathVisualization } from './character/pathVisualization';

const createPlayer = (camera, world, playerConfig = {}, wsService) => {
  // Initialize with provided position, but don't add the 0.5 offset yet
  const initialX = playerConfig.initialPosition?.x ?? 0;
  const initialZ = playerConfig.initialPosition?.z ?? 0;
  const terrainHeight = world.heightMap[Math.floor(initialZ)][Math.floor(initialX)];
  const initialPosition = new Vector3(initialX, terrainHeight + 0.5, initialZ);

  const character = createCharacter(initialPosition, world, {
    geometry: new THREE.CapsuleGeometry(0.25, 0.5),
    material: new THREE.MeshStandardMaterial({ color: 0x4040c0 }),
    moveSpeed: playerConfig.moveSpeed,
    usePathfinding: true,
    initialDirection: playerConfig.initialDirection ? new Vector3(
      playerConfig.initialDirection.x,
      0,
      playerConfig.initialDirection.z
    ).normalize() : new Vector3(0, 0, 1)
  });
  const pathVisualization = createPathVisualization(world);

  // Pre-create reusable objects
  const raycaster = new THREE.Raycaster();
  const mouseCoords = new THREE.Vector2();
  const targetPosition = new Vector3();

  const getTerrainHeight = (x, z) => {
    if (world.getTerrainHeight) {
      return world.getTerrainHeight(x, z);
    }
    try {
      return world.heightMap[Math.floor(z)][Math.floor(x)];
    } catch (err) {
      return 0;
    }
  };

  const update = (deltaTime) => {
    character.update(deltaTime);
    pathVisualization.updatePathNodes(character);
    updateCamera(character.getPosition());
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

      // Calculate direction vector from current position to target
      const currentPos = character.getPosition();
      const direction = new THREE.Vector3()
        .subVectors(targetPosition, currentPos)
        .normalize();

      // Send position and direction update to server
      if (wsService) {
        wsService.sendUpdate(
          {
            x: Math.floor(targetPosition.x),
            z: Math.floor(targetPosition.z)
          },
          {
            x: direction.x,
            y: direction.y,
            z: direction.z
          }
        );
      }
    }
  };

  const setTargetPosition = (position) => {
    const y = position.y ?? getTerrainHeight(position.x, position.z) + 0.5;
    const targetPos = new Vector3(position.x, y, position.z);
    character.setTargetPosition(targetPos);
    pathVisualization.visualizePath(character.getPath());
  };

  const setPosition = (position, direction) => {
    const y = position.y ?? getTerrainHeight(position.x, position.z) + 0.5;
    const newPos = new Vector3(position.x, y, position.z);
    character.mesh.position.copy(newPos);
    
    // Apply direction if provided
    if (direction) {
      const directionVector = new Vector3(direction.x, direction.y, direction.z).normalize();
      const lookAtPoint = new Vector3().addVectors(newPos, directionVector);
      character.mesh.lookAt(lookAtPoint);
    }
    
    character.setTargetPosition(newPos);
    updateCamera(newPos);
  };

  // Add event listener for mouse clicks
  window.addEventListener('mousedown', onMouseDown);

  const updateFromServer = (data) => {
    if (data.player) {
      data = data.player;
    }
    
    if (data.position) {
      const newPosition = new Vector3(
        data.position.x + 0.5,
        getTerrainHeight(data.position.x, data.position.z) + 0.5,
        data.position.z + 0.5
      );

      if (!character.isInitialized) {
        setPosition(newPosition);
        if (data.direction) {
          const direction = new Vector3(data.direction.x, 0, data.direction.z).normalize();
          const angle = Math.atan2(direction.x, direction.z);
          character.mesh.rotation.y = angle;
        }
        character.isInitialized = true;
      } else {
        setTargetPosition(newPosition);
      }
    }
  };

  const getDirection = () => {
    const direction = new THREE.Vector3();
    character.mesh.getWorldDirection(direction);
    return direction;
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