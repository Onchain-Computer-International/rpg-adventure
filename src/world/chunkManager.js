export class ChunkManager {
  constructor() {
    this.chunkCache = new Map();
    this.CHUNK_SIZE = 100;
    this.VISIBLE_CHUNKS = 3;
  }

  async fetchChunk(x, z) {
    const chunkId = `${x}_${z}`;
    if (!this.chunkCache.has(chunkId)) {
      try {
        const response = await fetch(`http://localhost:3000/api/map/chunk/${x}/${z}`);
        const data = await response.json();
        this.chunkCache.set(chunkId, data);
      } catch (error) {
        console.error('Failed to fetch chunk:', error);
        return null;
      }
    }
    return this.chunkCache.get(chunkId);
  }

  getTerrainColor(terrain) {
    const biomeColors = {
      water: '#3498db',
      beach: '#f1c40f',
      plains: '#2ecc71',
      forest: '#27ae60',
      mountain: '#95a5a6'
    };
    return biomeColors[terrain.type] || '#2ecc71';
  }

  getObjectColor(object) {
    const objectColors = {
      tree: '#145a32',
      pine_tree: '#0b5345',
      palm_tree: '#186a3b',
      bush: '#196f3d',
      rock: '#7f8c8d',
      seaweed: '#16a085',
      shell: '#f39c12',
      flower: '#e74c3c',
      mushroom: '#d35400'
    };
    return objectColors[object.type] || '#7f8c8d';
  }
} 