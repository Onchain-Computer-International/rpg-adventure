import { WorldChunk } from '../models/WorldChunk.js';
import { SERVER_CONFIG } from '../config.js';
import { TerrainGenerator } from './TerrainGenerator.js';
import fs from 'fs/promises';
import path from 'path';

export class WorldManager {
  constructor(userManager) {
    this.players = new Map();
    this.userManager = userManager;
    this.terrainGenerator = new TerrainGenerator();
    this.worldData = null;
  }

  async initialize() {
    this.worldData = await this.terrainGenerator.initialize();
  }

  async addPlayer(player) {
    player.setUserManager(this.userManager);
    
    // Get latest position from user data
    const userData = await this.userManager.getUser(player.id);
    if (userData && userData.position) {
      player.update({ position: userData.position });
    }
    
    this.players.set(player.id, player);
  }

  async updatePlayer(playerId, data) {
    const player = this.players.get(playerId);
    if (!player) return;

    // Log the incoming position update
    console.log(`Processing position update for ${playerId}:`, {
      current: player.position,
      new: data
    });

    // Update the player's position first
    player.update(data);

    // Save to user data file with the new position
    try {
      const result = await this.userManager.updateUser(playerId, {
        position: data, // Use the new position directly from the update data
        lastPositionUpdate: Date.now()
      });
      console.log(`Position saved for ${playerId}:`, result.position);
    } catch (err) {
      console.error(`Failed to save position for ${playerId}:`, err);
    }
  }

  async removePlayer(playerId) {
    this.players.delete(playerId);
  }

  getWorldState() {
    return {
      ...this.worldData,
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        username: p.username,
        position: p.position
      })),
      timestamp: Date.now()
    };
  }

  async saveState() {
    await this.terrainGenerator.saveWorld(this.worldData);
  }
} 