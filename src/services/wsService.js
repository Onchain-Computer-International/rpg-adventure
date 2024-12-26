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

      console.log('Fetching initial player data for user:', this.currentUser.id);
      
      const response = await fetch(`http://${window.location.hostname}:3000/api/player`, {
        headers: {
          'Authorization': `Bearer ${this.currentUser.id}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received initial player data:', data);
      return data;
    } catch (error) {
      console.error('Failed to fetch player data:', error);
      throw error;
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
          case 'join_success':
          case 'update_confirm':
            if (this.onPlayerUpdate) {
              this.onPlayerUpdate(data);
            }
            break;

          case 'world_update':
            if (this.onWorldUpdate) {
              this.onWorldUpdate(data);
            }
            break;
        }
      } catch (err) {
        console.error('Error processing websocket message:', err);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
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