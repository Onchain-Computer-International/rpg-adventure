export class ChunkManager {
  constructor() {
    this.chunks = new Map();
    this.loadedChunks = new Set();
    this.pendingChunks = new Set();
  }

  async requestChunk(x, z) {
    const chunkId = `${x}_${z}`;
    if (this.loadedChunks.has(chunkId) || this.pendingChunks.has(chunkId)) {
      return;
    }

    this.pendingChunks.add(chunkId);
    try {
      const response = await fetch(`/api/chunks/${x}/${z}`);
      if (!response.ok) throw new Error('Failed to fetch chunk');
      
      const chunkData = await response.json();
      this.chunks.set(chunkId, chunkData);
      this.loadedChunks.add(chunkId);
    } catch (err) {
      console.error(`Failed to load chunk ${chunkId}:`, err);
    } finally {
      this.pendingChunks.delete(chunkId);
    }
  }

  getChunk(x, z) {
    return this.chunks.get(`${x}_${z}`);
  }
} 