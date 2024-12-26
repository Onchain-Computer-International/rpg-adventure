import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { TerrainGenerator } from './services/TerrainGenerator.js';
import { UserManager } from './services/UserManager.js';
import { ChatManager } from './services/ChatManager.js';

const app = express();
app.use(cors());
app.use(express.json());
const server = createServer(app);
const wss = new WebSocketServer({ server });

const userManager = new UserManager();
const terrainGenerator = new TerrainGenerator();
const chatManager = new ChatManager();
let worldData = null;

// Initialize world
terrainGenerator.initialize().then(data => {
  worldData = data;
});

// REST endpoints
app.get('/api/world', async (req, res) => {
  const allPlayers = await userManager.getAllUsers();
  res.json({
    ...worldData,
    players: allPlayers
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
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  try {
    const userId = authHeader.split(' ')[1];
    const userData = await userManager.getUser(userId);
    
    if (userData) {
      const responseData = {
        position: userData.position,
        direction: userData.direction,
        username: userData.username
      };
      
      res.json(responseData);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching player data:', error);
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
            
            // Send auth success to the connecting player
            ws.send(JSON.stringify({
              type: 'auth_success',
              player: userData
            }));

            // Broadcast new player to all other connected clients
            wss.clients.forEach(client => {
              if (client !== ws && client.readyState === client.OPEN) {
                client.send(JSON.stringify({
                  type: 'player_joined',
                  player: {
                    id: userData.id,
                    position: {
                      x: userData.position.x,
                      z: userData.position.z,
                      username: userData.username
                    },
                    direction: userData.direction
                  }
                }));
              }
            });

            // Send all existing players to the new player
            const existingPlayers = await userManager.getAllUsers();
            ws.send(JSON.stringify({
              type: 'existing_players',
              players: existingPlayers.filter(player => player.id !== playerId).map(player => ({
                id: player.id,
                position: {
                  x: player.position.x,
                  z: player.position.z,
                  username: player.username
                },
                direction: player.direction
              }))
            }));
          }
          break;

        case 'update':
          if (playerId) {
            // Get the current user data first
            const userData = await userManager.getUser(playerId);
            if (!userData) break;

            const updatedUser = await userManager.updateUser(playerId, {
              position: data.position,
              direction: data.direction
            });
            
            if (updatedUser) {
              // Send confirmation to the player who moved
              ws.send(JSON.stringify({
                type: 'update_confirm',
                position: data.position,
                direction: data.direction
              }));

              // Broadcast the update to all other connected clients
              wss.clients.forEach(client => {
                if (client !== ws && client.readyState === client.OPEN) {
                  client.send(JSON.stringify({
                    type: 'player_moved',
                    playerId: playerId,
                    position: {
                      x: data.position.x,
                      z: data.position.z,
                      username: userData.username
                    },
                    direction: data.direction
                  }));
                }
              });
            }
          }
          break;

        case 'chat_message':
          const chatMessage = await chatManager.addMessage({
            userId: playerId,
            username: data.username,
            message: data.message,
            timestamp: Date.now()
          });
          
          // Broadcast to all connected clients
          wss.clients.forEach(client => {
            if (client.readyState === client.OPEN) {
              client.send(JSON.stringify({
                type: 'chat_message',
                message: chatMessage
              }));
            }
          });
          break;
      }
    } catch (err) {
      console.error('Error:', err);
    }
  });

  ws.on('close', () => {
    if (playerId) {
      // Broadcast player departure
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === client.OPEN) {
          client.send(JSON.stringify({
            type: 'player_left',
            playerId: playerId
          }));
        }
      });
    }
  });
});

// Add new endpoint for chat history
app.get('/api/chat/history', async (req, res) => {
  const history = await chatManager.getRecentMessages();
  res.json(history);
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
}); 