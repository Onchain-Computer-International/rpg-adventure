export class Player {
  constructor(id, username, position = { x: 0, z: 0 }) {
    this.id = id;
    this.username = username;
    this.position = {
      x: position.x || 500,
      z: position.z || 500
    };
    this.health = 100;
    this.inventory = [];
    this.lastUpdate = Date.now();
    this.lastPositionUpdate = Date.now();
    this.chunkId = this.getCurrentChunk();
    this.userManager = null;
  }

  setUserManager(userManager) {
    this.userManager = userManager;
  }

  getCurrentChunk() {
    return `${Math.floor(this.position.x/100)}_${Math.floor(this.position.z/100)}`;
  }

  update(data) {
    // Validate position data
    if (data.position && typeof data.position.x === 'number' && typeof data.position.z === 'number') {
      // Prevent setting position to 0,0
      if (data.position.x === 0 && data.position.z === 0) {
        return false;
      }
      this.position = { ...data.position };
      this.lastPositionUpdate = Date.now();
      // Save position immediately when it changes
      this.savePosition().catch(error => {
        // console.error('Failed to save position in update:', error);
      });
    }

    // Only copy specific properties we want to update
    const allowedUpdates = ['health', 'inventory', 'lastUpdate'];
    for (const key of allowedUpdates) {
      if (key in data) {
        this[key] = data[key];
      }
    }

    const newChunkId = this.getCurrentChunk();
    if (newChunkId !== this.chunkId) {
      this.chunkId = newChunkId;
      return true; // Chunk changed
    }
    return false;
  }

  async savePosition() {
    try {
      if (!this.userManager) {
        return;
      }
      await this.userManager.updateUser(this.id, {
        position: { ...this.position },
        lastPositionUpdate: this.lastPositionUpdate
      });
    } catch (error) {
      throw error;
    }
  }

  serialize() {
    return {
      id: this.id,
      username: this.username,
      position: this.position,
      lastPositionUpdate: this.lastPositionUpdate,
      health: this.health
    };
  }
} 