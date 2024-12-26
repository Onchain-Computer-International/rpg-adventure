export class WSService {
  constructor(onPlayerUpdate, onWorldUpdate) {
    this.ws = null;
    this.onPlayerUpdate = onPlayerUpdate;
    this.onWorldUpdate = onWorldUpdate;
    this.currentUser = null;
  }

  async getInitialWorldData() {
    try {
      const response = await fetch(`http://${window.location.hostname}:3000/api/world`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch world data:', error);
      throw error;
    }
  }

  async getInitialPlayerData() {
    try {
      if (!this.currentUser) {
        throw new Error('No authenticated user');
      }

      const response = await fetch(`http://${window.location.hostname}:3000/api/player`, {
        headers: {
          'Authorization': `Bearer ${this.currentUser.id}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch player data:', error);
      throw error;
    }
  }

  initialize(user) {
    this.currentUser = user;
    this.ws = new WebSocket(`ws://${window.location.hostname}:3000`);
    
    this.ws.onopen = () => {
      console.log('Connected to game server');
      this.ws.send(JSON.stringify({
        type: 'auth',
        userId: user.id
      }));
    };

    this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket received:', data);
          
          switch (data.type) {
            case 'auth_success':
            case 'join_success':
            case 'update_confirm':
              if (this.onPlayerUpdate) {
                console.log('WSService calling onPlayerUpdate with:', data);
                this.onPlayerUpdate(data);
              }
              break;

          case 'world_update':
            if (this.onWorldUpdate) {
              this.onWorldUpdate(data);
            }
            break;

          default:
            console.warn('Unknown message type:', data.type);
        }
      } catch (err) {
        console.error('Error processing websocket message:', err);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from game server');
      // Implement reconnection logic here if needed
    };
  }

  sendUpdate(position) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'update',
        position
      }));
    }
  }
} 