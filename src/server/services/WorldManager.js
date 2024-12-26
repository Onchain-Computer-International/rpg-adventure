import { WorldChunk } from '../models/WorldChunk.js';
import { SERVER_CONFIG } from '../config.js';
import { TerrainGenerator } from './TerrainGenerator.js';

export class WorldManager {
  constructor(userManager) {
    this.chunks = new Map();
    this.players = new Map();
    this.lastSave = Date.now();
    this.terrainGenerator = new TerrainGenerator();
    this.userManager = userManager;
  }

  getOrCreateChunk(x, z) {
    const chunkId = `${x}_${z}`;
    if (!this.chunks.has(chunkId)) {
      const chunkData = this.terrainGenerator.generateChunk(x, z);
      const chunk = new WorldChunk(x, z, chunkData);
      this.chunks.set(chunkId, chunk);
    }
    return this.chunks.get(chunkId);
  }

  addPlayer(player) {
    player.setUserManager(this.userManager);
    this.players.set(player.id, player);
    const chunk = this.getOrCreateChunk(
      Math.floor(player.position.x / SERVER_CONFIG.chunkSize),
      Math.floor(player.position.z / SERVER_CONFIG.chunkSize)
    );
    chunk.addPlayer(player);
  }

  updatePlayer(playerId, data) {
    const player = this.players.get(playerId);
    if (!player) return;

    const oldChunkId = player.chunkId;
    const chunkChanged = player.update(data);

    if (chunkChanged) {
      const oldChunk = this.chunks.get(oldChunkId);
      const newChunk = this.getOrCreateChunk(
        Math.floor(player.position.x / SERVER_CONFIG.chunkSize),
        Math.floor(player.position.z / SERVER_CONFIG.chunkSize)
      );
      
      oldChunk?.removePlayer(playerId);
      newChunk.addPlayer(player);
    }
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      const chunk = this.chunks.get(player.chunkId);
      chunk?.removePlayer(playerId);
      this.players.delete(playerId);
    }
  }

  getChunkUpdates() {
    const updates = {};
    for (const [chunkId, chunk] of this.chunks) {
      const update = chunk.update();
      if (update) updates[chunkId] = update;
    }
    return updates;
  }

  async saveState() {
    // TODO: Implement persistence
    this.lastSave = Date.now();
  }
} 