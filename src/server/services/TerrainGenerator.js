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
    const baseScale = 0.05;
    const baseAmplitude = 2;
    const octaves = 4;
    const persistence = 0.5;
    const lacunarity = 2.0;
    
    for (let z = 0; z < SERVER_CONFIG.chunkSize; z++) {
      terrain[z] = [];
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

        // Normalize and enhance features
        elevation = (elevation + baseAmplitude) / (2 * baseAmplitude);
        
        // Create peaks based on distance to chunk center
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

        terrain[z][x] = {
          height: elevation * baseAmplitude,
          type: this.getBiomeType(this.noise2D(worldX * 0.01, worldZ * 0.01)),
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

    // Use deterministic seeding
    let seed = chunkX * 16777259 + chunkZ;
    const rand = () => {
      seed = (seed * 1597 + 51749) % 244944;
      return seed / 244944;
    };

    const occupiedPositions = new Set();
    const chunkData = this.generatedChunks.get(`${chunkX}_${chunkZ}`);

    // Match client's object types
    const objectTypes = {
      forest: { trees: 0.6, rocks: 0.2, bushes: 0.2 },
      plains: { trees: 0.3, rocks: 0.3, bushes: 0.4 },
      mountain: { trees: 0.2, rocks: 0.7, bushes: 0.1 },
      beach: { trees: 0.2, rocks: 0.4, bushes: 0.4 },
      water: { trees: 0, rocks: 0.8, bushes: 0.2 }
    };

    for (let z = 0; z < SERVER_CONFIG.chunkSize; z++) {
      for (let x = 0; x < SERVER_CONFIG.chunkSize; x++) {
        const terrain = chunkData.terrain[z][x];
        const posKey = `${x}-${z}`;

        if (rand() < this.getObjectDensity(terrain.type) && !occupiedPositions.has(posKey)) {
          const typeRoll = rand();
          const biomeObjects = objectTypes[terrain.type] || objectTypes.plains;
          
          let objectType;
          let accumulator = 0;
          for (const [type, chance] of Object.entries(biomeObjects)) {
            accumulator += chance;
            if (typeRoll < accumulator) {
              objectType = type;
              break;
            }
          }

          objects.push({
            type: objectType,
            position: {
              x: chunkWorldX + x,
              y: terrain.height,
              z: chunkWorldZ + z
            }
          });
          
          occupiedPositions.add(posKey);
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