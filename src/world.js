import * as THREE from 'three';
import { createTerrain } from './world/terrain';
import { createTree } from './world/tree';
import { createRock } from './world/rock';
import { createBush } from './world/bush';

const createObjectFunctions = {
  tree: createTree,
  rock: createRock,
  bush: createBush
};

export class World extends THREE.Group {
  constructor(serverWorldData) {
    super();
    this.width = serverWorldData.terrain.length;
    this.height = serverWorldData.terrain[0].length;
    this.heightMap = serverWorldData.terrain;
    this.serverObjects = serverWorldData.objects;
    this.objectMap = new Map();
    
    this.generate();
  }

  updateFromServer(data) {
    // Handle any dynamic world updates from the server
    if (data.terrain) {
      this.heightMap = data.terrain;
      this.updateTerrain();
    }
    
    if (data.objects) {
      this.serverObjects = data.objects;
      this.updateObjects();
    }
  }

  updateTerrain() {
    if (this.terrain) {
      this.remove(this.terrain);
      this.terrain.geometry.dispose();
      this.terrain.material.dispose();
    }
    
    this.terrain = createTerrain(this.width, this.height, this.heightMap);
    this.add(this.terrain);
  }

  updateObjects() {
    // Remove old objects
    this.children.forEach(child => {
      if (child !== this.terrain) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        this.remove(child);
      }
    });

    // Create new objects based on server data
    const worldObjects = this.serverObjects.map(obj => {
      const object = createObjectFunctions[obj.type](obj.position);
      object.position.copy(obj.position);
      return object;
    });

    this.add(...worldObjects);
    this.objectMap = new Map(
      worldObjects.map(obj => [`${Math.floor(obj.position.x)}-${Math.floor(obj.position.z)}`, obj])
    );
  }

  generate() {
    this.clear();
    
    // Create terrain mesh
    this.terrain = createTerrain(this.width, this.height, this.heightMap);
    this.add(this.terrain);

    // Create objects based on server data
    const worldObjects = this.serverObjects.map(obj => {
      const object = createObjectFunctions[obj.type](obj.position);
      object.position.copy(obj.position);
      return object;
    });

    this.add(...worldObjects);
    this.objectMap = new Map(
      worldObjects.map(obj => [`${Math.floor(obj.position.x)}-${Math.floor(obj.position.z)}`, obj])
    );
  }

  clear() {
    this.children.forEach(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    this.removeAll();
  }

  removeAll() {
    while(this.children.length > 0) {
      this.remove(this.children[0]);
    }
  }

  getObject(coords) {
    return this.objectMap.get(`${coords.x}-${coords.y}`) || null;
  }
}