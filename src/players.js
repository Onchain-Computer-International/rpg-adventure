import { Vector3 } from 'three';
import { createCharacter } from './character';
import { createCharacterModel } from './character/characterModel';

class Players {
  constructor(world) {
    this.world = world;
    this.players = new Map();
  }

  createPlayerMesh(playerId, playerData) {
    // Generate a consistent color based on playerId
    const hash = Array.from(playerId).reduce((hash, char) => {
      return char.charCodeAt(0) + ((hash << 5) - hash);
    }, 0);
    const playerColor = Math.abs(hash) % 0xFFFFFF;

    const { geometry, material } = createCharacterModel(playerColor, 1);

    const playerOptions = {
      geometry,
      material,
      moveSpeed: 2,
      usePathfinding: false
    };

    const position = new Vector3(
      playerData.position.x,
      0.5,  // Always start at y = 0.5
      playerData.position.z
    );

    const player = createCharacter(position, this.world, playerOptions);

    // Set initial rotation if direction is provided
    if (playerData.direction) {
      const angle = Math.atan2(playerData.direction.x, playerData.direction.z);
      player.mesh.rotation.y = angle;
    }

    // Store additional player info
    player.id = playerId;
    
    return player;
  }

  updatePlayerPosition(playerId, position, direction) {
    let player = this.players.get(playerId);
    
    // If player doesn't exist, create them
    if (!player) {
      player = this.createPlayerMesh(playerId, { position, direction });
      this.players.set(playerId, player);
      return player.mesh;
    }
    
    // Update existing player
    const targetPos = new Vector3(position.x, 0.5, position.z);
    player.setTargetPosition(targetPos);

    if (direction) {
      const angle = Math.atan2(direction.x, direction.z);
      player.mesh.rotation.y = angle;
    }
    
    return null;
  }

  addPlayer(playerId, playerData) {
    if (!this.players.has(playerId)) {
      const player = this.createPlayerMesh(playerId, playerData);
      this.players.set(playerId, player);
      return player.mesh;
    }
    return null;
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      this.players.delete(playerId);
      return player.mesh;
    }
    return null;
  }

  update(deltaTime) {
    for (const player of this.players.values()) {
      player.update(deltaTime);
    }
  }

  getPlayerMeshes() {
    return Array.from(this.players.values()).map(player => player.mesh);
  }
}

export { Players };