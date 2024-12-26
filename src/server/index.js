import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { SERVER_CONFIG } from './config.js';
import { WorldManager } from './services/WorldManager.js';
import { Player } from './models/Player.js';
import { UserManager } from './services/UserManager.js';

const app = express();
app.use(cors());
app.use(express.json());
const server = createServer(app);
const wss = new WebSocketServer({ server });

const userManager = new UserManager();
const worldManager = new WorldManager(userManager);

// REST endpoints for initial data
app.get('/api/map/chunk/:x/:z', (req, res) => {
  const { x, z } = req.params;
  const chunk = worldManager.getOrCreateChunk(parseInt(x), parseInt(z));
  res.json(chunk.update());
});

// REST endpoint for user authentication
app.post('/api/auth', async (req, res) => {
  const { username, userId } = req.body;
  
  try {
    let userData;
    if (userId) {
      userData = await userManager.getUser(userId);
      if (userData) {
        userData.lastLogin = Date.now();
        if (!userData.position) {
          userData.position = { x: 500, z: 500 };
        }
        await userManager.updateUser(userId, userData);
      }
    }
    
    if (!userData && username) {
      userData = await userManager.createUser(username);
    }
    
    if (userData) {
      res.json(userData);
    } else {
      res.status(400).json({ error: 'Username required for new users' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// WebSocket handling for real-time updates
wss.on('connection', async (ws, req) => {
  let player = null;
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'auth':
          const userData = await userManager.getUser(data.userId);
          if (userData) {
            player = new Player(userData.id, userData.username, userData.position);
            await worldManager.addPlayer(player);
            ws.send(JSON.stringify({
              type: 'auth_success',
              player: player.serialize()
            }));
          }
          break;
        
        case 'join':
          if (!player) {
            player = new Player(data.userId, data.position);
            await worldManager.addPlayer(player);
            ws.send(JSON.stringify({
              type: 'join_success',
              player: player.serialize()
            }));
          }
          break;
          
        case 'update':
          if (player) {
            await worldManager.updatePlayer(player.id, data.position);
            ws.send(JSON.stringify({
              type: 'update_confirm',
              position: data.position
            }));
          }
          break;
        
        case 'action':
          // Handle player actions (combat, interaction, etc)
          break;
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  ws.on('close', () => {
    if (player) {
      worldManager.removePlayer(player.id);
    }
  });
});

// Regular world updates
setInterval(() => {
  const updates = worldManager.getChunkUpdates();
  if (Object.keys(updates).length > 0) {
    const message = JSON.stringify({
      type: 'world_update',
      updates
    });
    
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}, 1000 / SERVER_CONFIG.tickRate);

// Regular world state saving
setInterval(() => {
  worldManager.saveState();
}, SERVER_CONFIG.saveInterval);

server.listen(SERVER_CONFIG.port, () => {
  console.log(`Game server running on port ${SERVER_CONFIG.port}`);
}); 