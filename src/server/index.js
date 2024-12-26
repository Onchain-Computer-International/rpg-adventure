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

// Add a helper function for logging
const logPlayerAction = (action, playerId, data) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Player ${playerId} ${action}:`, data);
};

// REST endpoints for initial data
app.get('/api/world', (req, res) => {
  res.json(worldManager.getWorldState());
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
            logPlayerAction('authenticated', userData.id, userData.position);
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
            logPlayerAction('joined', data.userId, data.position);
            ws.send(JSON.stringify({
              type: 'join_success',
              player: player.serialize()
            }));
          }
          break;
          
        case 'update':
          if (player) {
            console.log('Received position update:', {
              playerId: player.id,
              oldPosition: player.position,
              newPosition: data.position
            });
            logPlayerAction('moved', player.id, data.position);
            await worldManager.updatePlayer(player.id, data.position);
            ws.send(JSON.stringify({
              type: 'update_confirm',
              position: data.position
            }));
          }
          break;
        
        case 'action':
          if (player) {
            logPlayerAction('action', player.id, data);
          }
          break;
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  ws.on('close', () => {
    if (player) {
      logPlayerAction('disconnected', player.id, player.position);
      worldManager.removePlayer(player.id);
    }
  });
});

// Regular world updates
setInterval(() => {
  const worldState = worldManager.getWorldState();
  const message = JSON.stringify({
    type: 'world_update',
    state: worldState
  });
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}, 1000 / SERVER_CONFIG.tickRate);

// Regular world state saving
setInterval(() => {
  worldManager.saveState();
}, SERVER_CONFIG.saveInterval);

server.listen(SERVER_CONFIG.port, () => {
  console.log(`Game server running on port ${SERVER_CONFIG.port}`);
}); 