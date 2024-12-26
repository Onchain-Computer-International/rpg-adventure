import { Vector3 } from 'three';
import { createCharacter } from './character';
import { createCharacterModel } from './character/characterModel';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import * as THREE from 'three';

class Players {
  constructor(world, camera) {
    this.world = world;
    this.camera = camera;
    this.players = new Map();
    this.font = null;
    
    // Load font
    const loader = new FontLoader();
    const fontPath = '/fonts/helvetiker_regular.typeface.json';
    
    loader.load(
      fontPath,
      // onLoad callback
      (font) => {
        console.log('Font loaded successfully');
        this.font = font;
        // Update existing player labels if any
        this.players.forEach(player => {
          if (player.username && !player.label) {
            this.createPlayerLabel(player, player.username);
          }
        });
      },
      // onProgress callback
      (xhr) => {
        console.log(`Font ${(xhr.loaded / xhr.total * 100)}% loaded`);
      },
      // onError callback
      (err) => {
        console.error('Error loading font:', err);
        console.error('Attempted to load font from:', fontPath);
      }
    );
  }

  createPlayerLabel(player, username) {
    console.log('Creating label for player:', username); // Debug log
    if (!this.font || !username) {
      console.log('Missing font or username:', { font: !!this.font, username }); // Debug log
      return;
    }

    // Remove existing label if any
    if (player.label) {
      player.mesh.remove(player.label);
    }

    // Create text geometry with smaller size
    const textGeometry = new TextGeometry(username, {
      font: this.font,
      size: 0.15,  // Reduced from 0.3
      height: 0.01, // Reduced from 0.02
    });

    // Center the text geometry
    textGeometry.computeBoundingBox();
    const textWidth = textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x;
    textGeometry.translate(-textWidth / 2, -0.2, 0); // Reduced Y offset from 2 to 1.2

    // Create text mesh with double-sided material
    const textMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      side: THREE.DoubleSide
    });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    
    // Create a billboard object to hold the text
    const billboard = new THREE.Object3D();
    billboard.add(textMesh);
    
    // Position the billboard closer to the player
    billboard.position.set(0, 1.2, 0); // Reduced Y position from 2 to 1.2
    
    // Add billboard as child of player mesh
    player.label = billboard;
    player.mesh.add(billboard);
    
    // Store username
    player.username = username;
    
    console.log('Label created successfully for:', username);
  }

  createPlayerMesh(playerId, playerData) {
    // Generate a consistent color based on playerId
    const hash = Array.from(playerId).reduce((hash, char) => {
      return char.charCodeAt(0) + ((hash << 5) - hash);
    }, 0);
    const playerColor = Math.abs(hash) % 0xFFFFFF;

    const { geometry, material } = createCharacterModel(playerColor, 1);

    const playerOptions = {
      geometry,
      material,
      moveSpeed: 2,
      usePathfinding: false
    };

    const position = new Vector3(
      playerData.position.x + 0.5,
      0.5,
      playerData.position.z + 0.5
    );

    const player = createCharacter(position, this.world, playerOptions);

    // Set initial rotation if direction is provided
    if (playerData.direction) {
      const angle = Math.atan2(playerData.direction.x, playerData.direction.z);
      player.mesh.rotation.y = angle;
    }

    // Store additional player info
    player.id = playerId;
    player.username = playerData.username;
    
    // Create label if font is loaded and username is provided
    if (this.font && playerData.username) {
      this.createPlayerLabel(player, playerData.username);
    }
    
    return player;
  }

  updatePlayerPosition(playerId, position, direction) {
    console.log('Updating player position:', { playerId, position, direction }); // Debug log
    let player = this.players.get(playerId);
    
    // If player doesn't exist, create them
    if (!player) {
      player = this.createPlayerMesh(playerId, { 
        position: {
          x: position.x,
          z: position.z
        },
        direction,
        username: position.username  // Get username from position object
      });
      this.players.set(playerId, player);
      return player.mesh;
    }
    
    // Update existing player with offset
    const targetPos = new THREE.Vector3(
      position.x + 0.5,
      0.5,
      position.z + 0.5
    );
    player.setTargetPosition(targetPos);

    if (direction) {
      const angle = Math.atan2(direction.x, direction.z);
      player.mesh.rotation.y = angle;
    }

    // Update username if provided
    if (position.username && position.username !== player.username) {
      console.log('Updating player label to:', position.username); // Debug log
      this.createPlayerLabel(player, position.username);
    }
    
    return null;
  }

  addPlayer(playerId, playerData) {
    console.log('Adding player:', { playerId, playerData }); // Debug log
    if (!this.players.has(playerId)) {
      const player = this.createPlayerMesh(playerId, {
        position: playerData.position,
        direction: playerData.direction,
        username: playerData.position.username  // Get username from position object
      });
      this.players.set(playerId, player);
      return player.mesh;
    }
    return null;
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      this.players.delete(playerId);
      return player.mesh;
    }
    return null;
  }

  update(deltaTime) {
    for (const player of this.players.values()) {
      player.update(deltaTime);
      
      // TODO: Fix label rotation
      // Make labels always face the camera while staying horizontal
      if (player.label && this.camera) {
        // Get direction to camera in the XZ plane only
        const directionToCamera = new THREE.Vector3()
          .subVectors(this.camera.position, player.mesh.position)
          .setY(0)  // Ignore Y component to keep text horizontal
          .normalize();
        
        // Calculate the angle in the XZ plane
        const angle = Math.atan2(directionToCamera.x, directionToCamera.z);
        
        // Set the label's Y rotation only
        player.label.rotation.set(0, angle + Math.PI, 0);
      }
    }
  }

  getPlayerMeshes() {
    return Array.from(this.players.values()).map(player => player.mesh);
  }
}

export { Players };