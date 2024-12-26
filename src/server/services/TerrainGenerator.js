import { createNoise2D } from 'simplex-noise';
import { SERVER_CONFIG } from '../config.js';
import fs from 'fs/promises';
import path from 'path';

export class TerrainGenerator {
  constructor() {
    this.noise2D = createNoise2D();
    this.generatedChunks = new Map();
    this.worldDataPath = path.join(process.cwd(), 'data', 'world');
  }

  async initialize() {
    // Ensure world data directory exists
    try {
      await fs.mkdir(this.worldDataPath, { recursive: true });
    } catch (err) {
      console.error('Failed to create world data directory:', err);
    }
  }

  async generateChunk(chunkX, chunkZ) {
    const chunkId = `${chunkX}_${chunkZ}`;
    
    // Try to load existing chunk
    try {
      const loadedChunk = await this.loadChunk(chunkId);
      if (loadedChunk) {
        this.generatedChunks.set(chunkId, loadedChunk);
        return loadedChunk;
      }
    } catch (err) {
      console.warn(`Failed to load chunk ${chunkId}, generating new one:`, err);
    }

    // Generate new chunk if not found
    const heightMap = this.generateHeightMap(chunkX, chunkZ);
    const chunkData = {
      terrain: heightMap,
      objects: [],
      resources: []
    };

    // Generate objects using the stored terrain data
    chunkData.objects = this.generateObjects(chunkX, chunkZ, heightMap);
    
    // Save the chunk
    try {
      await this.saveChunk(chunkId, chunkData);
    } catch (err) {
      console.error(`Failed to save chunk ${chunkId}:`, err);
    }

    this.generatedChunks.set(chunkId, chunkData);
    return chunkData;
  }

  async loadChunk(chunkId) {
    const chunkPath = path.join(this.worldDataPath, `${chunkId}.json`);
    try {
      const data = await fs.readFile(chunkPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`Error loading chunk ${chunkId}:`, err);
      }
      return null;
    }
  }

  async saveChunk(chunkId, chunkData) {
    const chunkPath = path.join(this.worldDataPath, `${chunkId}.json`);
    try {
      await fs.writeFile(chunkPath, JSON.stringify(chunkData, null, 2));
    } catch (err) {
      console.error(`Error saving chunk ${chunkId}:`, err);
      throw err;
    }
  }

  generateHeightMap(chunkX, chunkZ) {
    const heightMap = [];
    const baseScale = 0.05;
    const baseAmplitude = 2;
    const octaves = 4;
    const persistence = 0.5;
    const lacunarity = 2.0;

    for (let z = 0; z < SERVER_CONFIG.chunkSize; z++) {
      heightMap[z] = [];
      for (let x = 0; x < SERVER_CONFIG.chunkSize; x++) {
        const worldX = chunkX * SERVER_CONFIG.chunkSize + x;
        const worldZ = chunkZ * SERVER_CONFIG.chunkSize + z;

        // Generate elevation using multiple octaves
        let elevation = 0;
        let frequency = baseScale;
        let amplitude = baseAmplitude;

        for (let i = 0; i < octaves; i++) {
          const sampleX = worldX * frequency;
          const sampleZ = worldZ * frequency;
          elevation += this.noise2D(sampleX, sampleZ) * amplitude;
          amplitude *= persistence;
          frequency *= lacunarity;
        }

        // Normalize and add features
        elevation = (elevation + baseAmplitude) / (2 * baseAmplitude);

        // Create peaks
        const distanceToCenter = Math.sqrt(
          Math.pow(x - SERVER_CONFIG.chunkSize / 2, 2) + 
          Math.pow(z - SERVER_CONFIG.chunkSize / 2, 2)
        );
        const peakFactor = Math.max(0, 1 - distanceToCenter / (SERVER_CONFIG.chunkSize / 3));
        elevation += peakFactor * peakFactor * 2;

        // Add valleys
        const valleyNoise = this.noise2D(worldX * 0.02, worldZ * 0.02);
        if (valleyNoise < -0.7) {
          elevation *= 0.3 + 0.7 * (valleyNoise + 1);
        }

        heightMap[z][x] = elevation * baseAmplitude;
      }
    }
    return heightMap;
  }

  generateObjects(chunkX, chunkZ, heightMap) {
    const objects = [];
    const chunkWorldX = chunkX * SERVER_CONFIG.chunkSize;
    const chunkWorldZ = chunkZ * SERVER_CONFIG.chunkSize;

    // Use deterministic seeding
    let seed = chunkX * 16777259 + chunkZ;
    const rand = () => {
      seed = (seed * 1597 + 51749) % 244944;
      return seed / 244944;
    };

    const occupiedPositions = new Set();
    const objectTypes = ['trees', 'rocks', 'bushes'];
    const objectDensities = {
      trees: 0.1,
      rocks: 0.05,
      bushes: 0.08
    };

    for (let z = 0; z < SERVER_CONFIG.chunkSize; z++) {
      for (let x = 0; x < SERVER_CONFIG.chunkSize; x++) {
        const posKey = `${x}-${z}`;
        if (!occupiedPositions.has(posKey)) {
          for (const type of objectTypes) {
            if (rand() < objectDensities[type]) {
              objects.push({
                type: type.slice(0, -1), // Remove 's' to match client's type names
                position: {
                  x: chunkWorldX + x + 0.5, // Add 0.5 to center objects in grid cells
                  y: heightMap[z][x],
                  z: chunkWorldZ + z + 0.5
                }
              });
              occupiedPositions.add(posKey);
              break;
            }
          }
        }
      }
    }
    return objects;
  }
} 