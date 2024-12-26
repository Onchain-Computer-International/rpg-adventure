export class Player {
  constructor(id, username, position) {
    this.id = id;
    this.username = username;
    this.position = position || { x: 500, z: 500 };
    this.userManager = null;
  }

  setUserManager(userManager) {
    this.userManager = userManager;
  }

  update(data) {
    // If we receive a direct position object (not wrapped in data.position)
    if (typeof data.x === 'number' && typeof data.z === 'number') {
      this.position = { x: data.x, z: data.z };
    } 
    // If position is wrapped in data.position
    else if (data.position && typeof data.position.x === 'number' && typeof data.position.z === 'number') {
      this.position = { x: data.position.x, z: data.position.z };
    }
  }

  serialize() {
    return {
      id: this.id,
      username: this.username,
      position: this.position
    };
  }
} 