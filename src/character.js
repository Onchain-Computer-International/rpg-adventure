import * as THREE from 'three';
import { Vector2, Vector3, Quaternion } from 'three';
import { search } from './pathfinding';
import { createCharacterModel } from './character/characterModel';

const getTerrainHeight = (heightMap, x, z) => {
  const gridX = Math.floor(x);
  const gridZ = Math.floor(z);
  return heightMap && heightMap[gridZ] ? heightMap[gridZ][gridX] || 0 : 0;
};

const smoothedTerrainHeight = (heightMap, x, z) => {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const x1 = x0 + 1;
  const z1 = z0 + 1;

  const dx = x - x0;
  const dz = z - z0;

  const h00 = getTerrainHeight(heightMap, x0, z0);
  const h10 = getTerrainHeight(heightMap, x1, z0);
  const h01 = getTerrainHeight(heightMap, x0, z1);
  const h11 = getTerrainHeight(heightMap, x1, z1);

  const h0 = h00 * (1 - dx) + h10 * dx;
  const h1 = h01 * (1 - dx) + h11 * dx;

  return h0 * (1 - dz) + h1 * dz;
};

const createCharacter = (initialPosition, world, options = {}) => {
  const {
    moveSpeed = 2,
    // Removed rotationSpeed
    getTargetPosition = null,
    usePathfinding = false,
    ...modelOptions
  } = options;

  const characterModel = createCharacterModel(modelOptions);

  // Adjust initial position to be on top of the terrain
  initialPosition.y = smoothedTerrainHeight(world.heightMap, initialPosition.x, initialPosition.z) + 0.5;
  characterModel.position.copy(initialPosition);

  let state = {
    currentPosition: new Vector3().copy(characterModel.position),
    targetPosition: new Vector3().copy(characterModel.position),
    // Removed direction and targetDirection
    finalTargetPosition: null,
    isMoving: false,
    moveSpeed,
    // Removed rotationSpeed
    world,
    path: [],
    pathIndex: 0,
    currentDirection: new Vector3(0, 0, 1) // Add this line to track current direction
  };

  const setTargetPosition = (currentState, newTargetPosition) => {
    const newState = { ...currentState };

    // Determine the starting point for pathfinding
    const start = currentState.isMoving
      ? new Vector2(Math.floor(currentState.targetPosition.x), Math.floor(currentState.targetPosition.z))
      : new Vector2(Math.floor(currentState.currentPosition.x), Math.floor(currentState.currentPosition.z));

    const goal = new Vector2(Math.floor(newTargetPosition.x), Math.floor(newTargetPosition.z));
    const searchResult = search(start, goal, newState.world);

    if (searchResult && searchResult.length > 0) {
      newState.finalTargetPosition = newTargetPosition;
      newState.path = searchResult;
      newState.pathIndex = 0;
      newState.isMoving = true;
      const nextPoint = newState.path[0];
      newState.targetPosition.set(
        nextPoint.x + 0.5,
        smoothedTerrainHeight(world.heightMap, nextPoint.x + 0.5, nextPoint.y + 0.5) + 0.5,
        nextPoint.y + 0.5
      );
    } else {
      if (newState.isMoving) {
        console.log("Invalid target selected. Continuing to previous destination.");
        // Keep the current path and target
      } else {
        console.log("No valid path found.");
        newState.isMoving = false;
        newState.path = [];
        newState.targetPosition = new Vector3(newState.currentPosition.x, newState.currentPosition.y, newState.currentPosition.z);
      }
    }

    return newState;
  };

  const update = (deltaTime, currentState) => {
    const newState = { ...currentState };

    if (newState.isMoving) {
      const moveDirection = new THREE.Vector3().subVectors(newState.targetPosition, newState.currentPosition).normalize();
      const step = moveDirection.multiplyScalar(newState.moveSpeed * deltaTime);
      const newPosition = new THREE.Vector3().addVectors(newState.currentPosition, step);

      // Always set the Y position to be on top of the terrain
      newPosition.y = smoothedTerrainHeight(world.heightMap, newPosition.x, newPosition.z) + 0.5;

      // Update the current direction
      if (step.length() > 0.001) { // Only update direction if there's significant movement
        newState.currentDirection.copy(moveDirection);
      }

      // Rotate the character model to face the movement direction
      const lookAtPoint = new Vector3().addVectors(characterModel.position, newState.currentDirection);
      characterModel.lookAt(lookAtPoint);

      // Check if we've reached or overshot the target
      if (newPosition.distanceTo(newState.targetPosition) <= step.length()) {
        newState.currentPosition.copy(newState.targetPosition);
        newState.currentPosition.y = smoothedTerrainHeight(world.heightMap, newState.targetPosition.x, newState.targetPosition.z) + 0.5;
        characterModel.position.copy(newState.currentPosition);

        if (newState.pathIndex < newState.path.length - 1) {
          // Move to the next tile in the path
          newState.pathIndex++;
          const nextPoint = newState.path[newState.pathIndex];
          newState.targetPosition.set(
            nextPoint.x + 0.5,
            smoothedTerrainHeight(world.heightMap, nextPoint.x + 0.5, nextPoint.y + 0.5) + 0.5,
            nextPoint.y + 0.5
          );
        } else {
          // If we've reached the end of the path
          newState.isMoving = false;
          newState.path = [];
          newState.pathIndex = 0;
        }
      } else {
        newState.currentPosition.copy(newPosition);
        characterModel.position.copy(newPosition);
      }
    }

    return newState;
  };

  return {
    mesh: characterModel,
    isInitialized: false,
    update: (deltaTime) => {
      state = update(deltaTime, state);
    },
    getPosition: () => characterModel.position.clone(),
    // Removed getDirection
    setTargetPosition: (newTargetPosition) => {
      state = setTargetPosition(state, newTargetPosition);
    },
    isMoving: () => state.isMoving,
    getPath: () => state.path,
    getCurrentPathIndex: () => state.pathIndex
  };
};

export { createCharacter, smoothedTerrainHeight };