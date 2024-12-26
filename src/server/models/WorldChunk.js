export class WorldChunk {
  constructor(x, z, data) {
    this.x = x;
    this.z = z;
    this.id = `${x}_${z}`;
    this.terrain = data.terrain;
    this.objects = data.objects;
    this.resources = data.resources;
    this.players = new Map();
    this.isDirty = true;
    this.lastUpdate = Date.now();
  }

  addPlayer(player) {
    this.players.set(player.id, player);
    this.isDirty = true;
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    this.isDirty = true;
  }

  removeObject(objectId) {
    const index = this.objects.findIndex(obj => obj.id === objectId);
    if (index !== -1) {
      this.objects.splice(index, 1);
      this.isDirty = true;
    }
  }

  update() {
    if (!this.isDirty) return null;
    
    const update = {
      id: this.id,
      terrain: this.terrain,
      objects: this.objects.filter(obj => !obj.removed),
      resources: this.resources,
      players: Array.from(this.players.values()).map(p => p.serialize()),
      timestamp: Date.now()
    };
    
    this.isDirty = false;
    return update;
  }

  serialize() {
    return {
      id: this.id,
      terrain: this.terrain,
      objects: this.objects,
      resources: this.resources
    };
  }
} 