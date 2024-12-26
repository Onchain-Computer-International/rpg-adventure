import { createNoise2D } from 'simplex-noise';
import { SERVER_CONFIG } from '../config.js';
import fs from 'fs/promises';
import path from 'path';

export class TerrainGenerator {
  constructor() {
    this.noise2D = createNoise2D();
    this.worldDataPath = path.join(process.cwd(), 'data', 'world.json');
  }

  async initialize() {
    try {
      // Try to load existing world
      const worldData = await this.loadWorld();
      if (worldData) {
        return worldData;
      }
      
      // Generate new world if none exists
      const newWorld = this.generateWorld();
      await this.saveWorld(newWorld);
      return newWorld;
    } catch (err) {
      console.error('Failed to initialize world:', err);
      throw err;
    }
  }

  async loadWorld() {
    try {
      const data = await fs.readFile(this.worldDataPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('Error loading world:', err);
      }
      return null;
    }
  }

  async saveWorld(worldData) {
    try {
      await fs.writeFile(this.worldDataPath, JSON.stringify(worldData, null, 2));
    } catch (err) {
      console.error('Error saving world:', err);
      throw err;
    }
  }

  generateWorld() {
    const terrain = this.generateTerrain();
    const objects = this.generateObjects(terrain);
    
    return {
      terrain,
      objects,
      resources: [],
      timestamp: Date.now()
    };
  }

  generateTerrain() {
    const terrain = [];
    const baseScale = 0.05;
    const baseAmplitude = 2;
    const octaves = 4;
    const persistence = 0.5;
    const lacunarity = 2.0;

    for (let z = 0; z < SERVER_CONFIG.worldSize; z++) {
      terrain[z] = [];
      for (let x = 0; x < SERVER_CONFIG.worldSize; x++) {
        let elevation = 0;
        let frequency = baseScale;
        let amplitude = baseAmplitude;

        for (let i = 0; i < octaves; i++) {
          const sampleX = x * frequency;
          const sampleZ = z * frequency;
          elevation += this.noise2D(sampleX, sampleZ) * amplitude;
          amplitude *= persistence;
          frequency *= lacunarity;
        }

        elevation = (elevation + baseAmplitude) / (2 * baseAmplitude);

        // Create peaks
        const distanceToCenter = Math.sqrt(
          Math.pow(x - SERVER_CONFIG.worldSize / 2, 2) + 
          Math.pow(z - SERVER_CONFIG.worldSize / 2, 2)
        );
        const peakFactor = Math.max(0, 1 - distanceToCenter / (SERVER_CONFIG.worldSize / 3));
        elevation += peakFactor * peakFactor * 2;

        // Add valleys
        const valleyNoise = this.noise2D(x * 0.02, z * 0.02);
        if (valleyNoise < -0.7) {
          elevation *= 0.3 + 0.7 * (valleyNoise + 1);
        }

        terrain[z][x] = elevation * baseAmplitude;
      }
    }
    return terrain;
  }

  generateObjects(terrain) {
    const objects = [];
    const occupiedPositions = new Set();

    // Use deterministic seeding
    let seed = Date.now();
    const rand = () => {
      seed = (seed * 1597 + 51749) % 244944;
      return seed / 244944;
    };

    const objectTypes = ['tree', 'rock', 'bush'];
    const objectDensities = {
      tree: 0.1,
      rock: 0.05,
      bush: 0.08
    };

    for (let z = 0; z < SERVER_CONFIG.worldSize; z++) {
      for (let x = 0; x < SERVER_CONFIG.worldSize; x++) {
        const posKey = `${x}-${z}`;
        if (!occupiedPositions.has(posKey)) {
          for (const type of objectTypes) {
            if (rand() < objectDensities[type]) {
              objects.push({
                type,
                id: `${type}-${x}-${z}`,
                position: {
                  x: x + 0.5,
                  y: terrain[z][x],
                  z: z + 0.5
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