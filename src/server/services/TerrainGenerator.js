import { createNoise2D } from 'simplex-noise';
import { SERVER_CONFIG } from '../config.js';

export class TerrainGenerator {
  constructor() {
    this.noise2D = createNoise2D();
    this.generatedChunks = new Map();
  }

  generateChunk(chunkX, chunkZ) {
    const chunkId = `${chunkX}_${chunkZ}`;
    if (this.generatedChunks.has(chunkId)) {
      return this.generatedChunks.get(chunkId);
    }

    // Generate terrain first
    const terrain = this.generateTerrain(chunkX, chunkZ);
    
    // Store chunk data temporarily for object generation
    const chunkData = {
      terrain,
      objects: [],
      resources: []
    };
    this.generatedChunks.set(chunkId, chunkData);

    // Generate objects using the stored terrain data
    chunkData.objects = this.generateObjects(chunkX, chunkZ);
    chunkData.resources = this.generateResources(chunkX, chunkZ);

    return chunkData;
  }

  generateTerrain(chunkX, chunkZ) {
    const terrain = [];
    const scale = 0.02;
    
    for (let z = 0; z < SERVER_CONFIG.chunkSize; z++) {
      terrain[z] = [];
      for (let x = 0; x < SERVER_CONFIG.chunkSize; x++) {
        const worldX = chunkX * SERVER_CONFIG.chunkSize + x;
        const worldZ = chunkZ * SERVER_CONFIG.chunkSize + z;
        
        // Generate base terrain height
        const baseHeight = (
          this.noise2D(worldX * scale, worldZ * scale) * 20 +
          this.noise2D(worldX * scale * 2, worldZ * scale * 2) * 10 +
          this.noise2D(worldX * scale * 4, worldZ * scale * 4) * 5
        ) + 20;

        // Generate biome influence
        const biomeNoise = this.noise2D(worldX * 0.01, worldZ * 0.01);
        
        terrain[z][x] = {
          height: baseHeight,
          type: this.getBiomeType(biomeNoise),
          moisture: this.noise2D(worldX * 0.03, worldZ * 0.03)
        };
      }
    }
    return terrain;
  }

  getBiomeType(noise) {
    if (noise < -0.5) return 'water';
    if (noise < -0.2) return 'beach';
    if (noise < 0.2) return 'plains';
    if (noise < 0.5) return 'forest';
    return 'mountain';
  }

  generateObjects(chunkX, chunkZ) {
    const objects = [];
    const chunkWorldX = chunkX * SERVER_CONFIG.chunkSize;
    const chunkWorldZ = chunkZ * SERVER_CONFIG.chunkSize;

    // Use deterministic seeding based on chunk coordinates
    let seed = chunkX * 16777259 + chunkZ;
    const rand = () => {
      seed = (seed * 1597 + 51749) % 244944;
      return seed / 244944;
    };

    const chunkData = this.generatedChunks.get(`${chunkX}_${chunkZ}`);
    
    // Generate objects based on terrain type
    for (let z = 0; z < SERVER_CONFIG.chunkSize; z++) {
      for (let x = 0; x < SERVER_CONFIG.chunkSize; x++) {
        const terrain = chunkData.terrain[z][x];
        
        if (rand() < this.getObjectDensity(terrain.type)) {
          objects.push({
            type: this.getObjectType(terrain.type, rand()),
            position: {
              x: chunkWorldX + x,
              z: chunkWorldZ + z
            },
            properties: this.generateObjectProperties(terrain.type)
          });
        }
      }
    }
    return objects;
  }

  getObjectDensity(terrainType) {
    const densities = {
      water: 0.01,
      beach: 0.05,
      plains: 0.1,
      forest: 0.3,
      mountain: 0.15
    };
    return densities[terrainType] || 0.1;
  }

  getObjectType(terrainType, random) {
    const objects = {
      water: ['seaweed', 'rock'],
      beach: ['palm_tree', 'shell', 'rock'],
      plains: ['tree', 'bush', 'rock', 'flower'],
      forest: ['tree', 'bush', 'mushroom', 'rock'],
      mountain: ['rock', 'pine_tree']
    };
    
    const possibleObjects = objects[terrainType] || ['rock'];
    return possibleObjects[Math.floor(random * possibleObjects.length)];
  }

  generateObjectProperties(terrainType) {
    // Add specific properties based on object type
    return {
      harvestable: true,
      respawnTime: 300, // 5 minutes
      resources: ['wood', 'stone', 'herb']
    };
  }

  generateResources(chunkX, chunkZ) {
    // Generate resource nodes (ores, herbs, etc)
    return [];
  }
} 