import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { TerrainGenerator } from './services/TerrainGenerator.js';
import { UserManager } from './services/UserManager.js';

const app = express();
app.use(cors());
app.use(express.json());
const server = createServer(app);
const wss = new WebSocketServer({ server });

const userManager = new UserManager();
const terrainGenerator = new TerrainGenerator();
const players = new Map();
let worldData = null;

// Initialize world
terrainGenerator.initialize().then(data => {
  worldData = data;
});

// REST endpoints
app.get('/api/world', (req, res) => {
  res.json({
    ...worldData,
    players: Array.from(players.values())
  });
});

app.post('/api/auth', async (req, res) => {
  const { username, userId } = req.body;
  try {
    let userData = userId ? await userManager.getUser(userId) : null;
    if (!userData && username) {
      userData = await userManager.createUser(username);
    }
    res.json(userData || { error: 'Username required' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new endpoint for initial player data
app.get('/api/player', async (req, res) => {
  // Get player data from auth header or session
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  try {
    const userId = authHeader.split(' ')[1]; // Assuming "Bearer <userId>"
    const userData = await userManager.getUser(userId);
    if (userData) {
      res.json({
        position: userData.position || { x: 40.5, z: 60.5 }, // Use default if no position saved
        username: userData.username
      });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// WebSocket handling
wss.on('connection', async (ws) => {
  let playerId = null;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'auth':
          const userData = await userManager.getUser(data.userId);
          if (userData) {
            playerId = userData.id;
            players.set(playerId, {
              id: userData.id,
              username: userData.username,
              position: userData.position
            });
            ws.send(JSON.stringify({
              type: 'auth_success',
              player: userData
            }));
          }
          break;

        case 'update':
          if (playerId) {
            const player = players.get(playerId);
            if (player) {
              player.position = data.position;
              await userManager.updateUser(playerId, {
                position: data.position
              });
              ws.send(JSON.stringify({
                type: 'update_confirm',
                position: data.position
              }));
            }
          }
          break;
      }
    } catch (err) {
      console.error('Error:', err);
    }
  });

  ws.on('close', () => {
    if (playerId) {
      players.delete(playerId);
    }
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
}); 