import fs from 'fs/promises';
import path from 'path';

export class UserManager {
  constructor() {
    this.saveDirectory = './data/users';
    fs.mkdir(this.saveDirectory, { recursive: true });
  }

  async getUser(userId) {
    try {
      const data = await fs.readFile(
        path.join(this.saveDirectory, `${userId}.json`), 
        'utf8'
      );
      return JSON.parse(data);
    } catch (err) {
      return null;
    }
  }

  async createUser(username) {
    const userData = {
      id: Math.random().toString(36).substr(2, 9),
      username,
      position: { x: 50, z: 50 },
      direction: { x: 0, y: 0, z: 1 },
      created: Date.now()
    };
    
    await this.saveUser(userData.id, userData);
    return userData;
  }

  async updateUser(userId, updates) {
    const userData = await this.getUser(userId);
    if (!userData) return null;

    const updatedData = {
      ...userData,
      position: updates.position || userData.position,
      direction: updates.direction || userData.direction,
      lastUpdate: Date.now()
    };

    await this.saveUser(userId, updatedData);
    return updatedData;
  }

  async saveUser(userId, userData) {
    await fs.writeFile(
      path.join(this.saveDirectory, `${userId}.json`),
      JSON.stringify(userData, null, 2)
    );
  }
} 