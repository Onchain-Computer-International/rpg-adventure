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
  }

  setHandlers(handlers) {
    this.onPlayerUpdate = handlers.onPlayerUpdate;
    this.onWorldUpdate = handlers.onWorldUpdate;
    this.onPlayerMove = handlers.onPlayerMove;
    this.onPlayerJoin = handlers.onPlayerJoin;
    this.onPlayerLeave = handlers.onPlayerLeave;
  }

  async getInitialWorldData() {
    try {
      const response = await fetch(`http://${window.location.hostname}:3000/api/world`);
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
    this.currentUser = user;
    
    this.ws = new WebSocket(`ws://${window.location.hostname}:3000`);
    
    this.ws.onopen = () => {
      this.ws.send(JSON.stringify({
        type: 'auth',
        userId: user.id
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
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    this.ws.onerror = (error) => {
      // Error handling removed
    };

    this.ws.onclose = () => {
      // Implement reconnection logic here if needed
    };
  }

  sendUpdate(position, direction) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'update',
        position,
        direction
      }));
    }
  }
} 