import { WorldChunk } from '../models/WorldChunk.js';
import { SERVER_CONFIG } from '../config.js';
import { TerrainGenerator } from './TerrainGenerator.js';
import fs from 'fs/promises';
import path from 'path';

export class WorldManager {
  constructor(userManager) {
    this.chunks = new Map();
    this.players = new Map();
    this.lastSave = Date.now();
    this.terrainGenerator = new TerrainGenerator();
    this.userManager = userManager;
    this.initialize();
  }

  async initialize() {
    // Initialize terrain generator
    await this.terrainGenerator.initialize();
    
    // Load active chunks
    try {
      const activeChunksPath = path.join(process.cwd(), 'data', 'world', 'active_chunks.json');
      const activeChunks = await fs.readFile(activeChunksPath, 'utf8')
        .then(data => JSON.parse(data))
        .catch(() => ({}));

      // Load each active chunk
      for (const chunkId of Object.keys(activeChunks)) {
        const [x, z] = chunkId.split('_').map(Number);
        await this.getOrCreateChunk(x, z);
      }
    } catch (err) {
      console.warn('Failed to load active chunks:', err);
    }
  }

  async getOrCreateChunk(x, z) {
    const chunkId = `${x}_${z}`;
    if (!this.chunks.has(chunkId)) {
      const chunkData = await this.terrainGenerator.generateChunk(x, z);
      const chunk = new WorldChunk(x, z, chunkData);
      this.chunks.set(chunkId, chunk);
      await this.saveActiveChunks();
    }
    return this.chunks.get(chunkId);
  }

  async saveActiveChunks() {
    const activeChunks = {};
    for (const [chunkId, chunk] of this.chunks) {
      activeChunks[chunkId] = {
        lastAccessed: Date.now()
      };
    }

    try {
      const activeChunksPath = path.join(process.cwd(), 'data', 'world', 'active_chunks.json');
      await fs.writeFile(activeChunksPath, JSON.stringify(activeChunks, null, 2));
    } catch (err) {
      console.error('Failed to save active chunks:', err);
    }
  }

  async addPlayer(player) {
    player.setUserManager(this.userManager);
    this.players.set(player.id, player);
    const chunk = await this.getOrCreateChunk(
      Math.floor(player.position.x / SERVER_CONFIG.chunkSize),
      Math.floor(player.position.z / SERVER_CONFIG.chunkSize)
    );
    chunk.addPlayer(player);
  }

  async updatePlayer(playerId, data) {
    const player = this.players.get(playerId);
    if (!player) return;

    const oldChunkId = player.chunkId;
    const chunkChanged = player.update(data);

    if (chunkChanged) {
      const oldChunk = this.chunks.get(oldChunkId);
      const newChunk = await this.getOrCreateChunk(
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