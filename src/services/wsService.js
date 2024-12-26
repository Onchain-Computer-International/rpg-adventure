import { CONFIG } from '../config';

export class WSService {
  constructor() {
    this.ws = null;
    this.onPlayerUpdate = null;
    this.onWorldUpdate = null;
    this.onPlayerMove = null;
    this.onPlayerJoin = null;
    this.onPlayerLeave = null;
    this.currentUser = null;
    this.pendingPlayers = []; // Store players that join before world is ready
    this.onChatMessage = null;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.isConnecting = false;
  }

  setHandlers(handlers) {
    // Preserve existing handlers if not provided in the new handlers
    this.onPlayerUpdate = handlers.onPlayerUpdate || this.onPlayerUpdate;
    this.onWorldUpdate = handlers.onWorldUpdate || this.onWorldUpdate;
    this.onPlayerMove = handlers.onPlayerMove || this.onPlayerMove;
    this.onPlayerJoin = handlers.onPlayerJoin || this.onPlayerJoin;
    this.onPlayerLeave = handlers.onPlayerLeave || this.onPlayerLeave;
    this.onChatMessage = handlers.onChatMessage || this.onChatMessage;
  }

  async getInitialWorldData() {
    try {
      const response = await fetch(`${CONFIG.API_URL}/api/world`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${this.currentUser.id}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Store initial players to process after world is created
      if (data.players) {
        this.pendingPlayers = data.players.filter(
          player => player.id !== this.currentUser?.id
        );
      }
      
      return data;
    } catch (error) {
      console.error('Failed to fetch world data:', error);
      throw error;
    }
  }

  processPendingPlayers() {
    if (this.onPlayerJoin) {
      this.pendingPlayers.forEach(player => {
        this.onPlayerJoin(player);
      });
      this.pendingPlayers = []; // Clear pending players
    }
  }

  initialize(user) {
    if (this.isConnecting) return;
    this.isConnecting = true;
    this.currentUser = user;
    
    this.connectWebSocket();
  }

  connectWebSocket() {
    try {
      this.ws = new WebSocket(CONFIG.WS_URL);
      
      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.ws.send(JSON.stringify({
          type: 'auth',
          userId: this.currentUser.id
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'auth_success':
              if (this.onPlayerUpdate) {
                this.onPlayerUpdate(data);
              }
              break;

            case 'existing_players':
              if (this.onPlayerJoin && data.players) {
                data.players.forEach(player => {
                  if (this.currentUser && player.id !== this.currentUser.id) {
                    this.onPlayerJoin(player);
                  }
                });
              }
              break;

            case 'player_joined':
              if (this.onPlayerJoin && data.player && 
                  this.currentUser && data.player.id !== this.currentUser.id) {
                this.onPlayerJoin(data.player);
              }
              break;

            case 'player_left':
              if (this.onPlayerLeave) {
                this.onPlayerLeave(data.playerId);
              }
              break;

            case 'player_moved':
              if (this.onPlayerMove) {
                this.onPlayerMove(data);
              }
              break;

            case 'world_update':
              if (this.onWorldUpdate) {
                this.onWorldUpdate(data);
              }
              break;

            case 'chat_message':
              if (this.onChatMessage) {
                this.onChatMessage(data);
              }
              break;
          }
        } catch (err) {
          console.error('WebSocket message error:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket connection error:', error);
        this.handleConnectionError();
      };

      this.ws.onclose = () => {
        this.handleConnectionError();
      };
    } catch (error) {
      console.error('WebSocket initialization error:', error);
      this.handleConnectionError();
    }
  }

  handleConnectionError() {
    if (this.reconnectAttempts >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
      if (this.onWorldUpdate) {
        this.onWorldUpdate({
          type: 'connection_error',
          error: 'Unable to connect to server after multiple attempts'
        });
      }
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket();
    }, CONFIG.RECONNECT_INTERVAL);

    if (this.onWorldUpdate) {
      this.onWorldUpdate({
        type: 'connection_error',
        error: 'Lost connection to server. Attempting to reconnect...'
      });
    }
  }

  sendUpdate(position, direction) {
    if (!position || !direction) {
      console.error('Invalid position or direction');
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'update',
        position,
        direction,
        timestamp: Date.now() // Add timestamp for potential lag compensation
      }));
    }
  }

  async getInitialPlayerData() {
    try {
      // Add Authorization header with current user ID
      const response = await fetch(`http://${window.location.hostname}:3000/api/player`, {
        headers: {
          'Authorization': `Bearer ${this.currentUser.id}`
        }
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch player data:', error);
      throw error;
    }
  }

  sendChatMessage(message) {
    if (!message?.trim()) {
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'chat_message',
        message: message.trim(),
        userId: this.currentUser.id,
        username: this.currentUser.username,
        timestamp: Date.now()
      }));
    }
  }
} 