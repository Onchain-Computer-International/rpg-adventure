import fs from 'fs/promises';
import path from 'path';

export class UserManager {
  constructor() {
    this.users = new Map();
    this.saveDirectory = './data/users';
    this.loadUsers();
  }

  async loadUsers() {
    try {
      await fs.mkdir(this.saveDirectory, { recursive: true });
      const files = await fs.readdir(this.saveDirectory);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const userData = JSON.parse(
            await fs.readFile(path.join(this.saveDirectory, file), 'utf8')
          );
          this.users.set(userData.id, userData);
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }

  async saveUser(userData) {
    try {
      await fs.writeFile(
        path.join(this.saveDirectory, `${userData.id}.json`),
        JSON.stringify(userData, null, 2)
      );
    } catch (error) {
      console.error('Error saving user:', error);
    }
  }

  async getUser(userId) {
    return this.users.get(userId);
  }

  async createUser(username) {
    const userId = Math.random().toString(36).substr(2, 9);
    const userData = {
      id: userId,
      username,
      position: { x: 500, z: 500 },
      created: Date.now(),
      lastLogin: Date.now()
    };
    
    this.users.set(userId, userData);
    await this.saveUser(userData);
    return userData;
  }

  async updateUser(userId, updates) {
    const userData = this.users.get(userId);
    if (userData) {
      if (updates.position) {
        if (updates.position.x === 0 && updates.position.z === 0) {
          return userData;
        }
        userData.position = { ...updates.position };
      }
      const allowedUpdates = ['lastLogin', 'lastPositionUpdate', 'health', 'inventory'];
      for (const key of allowedUpdates) {
        if (key in updates) {
          userData[key] = updates[key];
        }
      }
      await this.saveUser(userData);
    }
    return userData;
  }
} 