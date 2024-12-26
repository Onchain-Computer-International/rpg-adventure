import fs from 'fs/promises';
import path from 'path';

export class UserManager {
  constructor() {
    this.saveDirectory = './data/users';
    this.initialize();
  }

  async initialize() {
    try {
      await fs.mkdir(this.saveDirectory, { recursive: true });
    } catch (error) {
      console.error('Error creating users directory:', error);
    }
  }

  async getUser(userId) {
    try {
      const userPath = path.join(this.saveDirectory, `${userId}.json`);
      const data = await fs.readFile(userPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`Error reading user ${userId}:`, err);
      }
      return null;
    }
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
    
    await this.saveUser(userId, userData);
    return userData;
  }

  async updateUser(userId, updates) {
    try {
      console.log(`Updating user ${userId} with:`, updates);
      
      // Read current user data
      const currentData = await this.getUser(userId);
      if (!currentData) {
        throw new Error(`User ${userId} not found`);
      }
      console.log(`Current user data:`, currentData);

      // Create updated data
      const updatedData = {
        ...currentData,
        ...updates,
        lastUpdate: Date.now()
      };
      console.log(`New user data to save:`, updatedData);

      // Save updated data
      await this.saveUser(userId, updatedData);
      console.log(`Successfully saved user data for ${userId}`);
      
      return updatedData;
    } catch (err) {
      console.error(`Failed to update user ${userId}:`, err);
      throw err;
    }
  }

  async saveUser(userId, userData) {
    try {
      const userPath = path.join(this.saveDirectory, `${userId}.json`);
      console.log(`Writing to ${userPath}:`, userData);
      await fs.writeFile(userPath, JSON.stringify(userData, null, 2));
      console.log(`Successfully wrote file for ${userId}`);
    } catch (err) {
      console.error(`Error saving user ${userId}:`, err);
      throw err;
    }
  }
} 