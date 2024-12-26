export class WSService {
  constructor(onPlayerUpdate) {
    this.ws = null;
    this.onPlayerUpdate = onPlayerUpdate;
  }

  initialize(user) {
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
        
        switch (data.type) {
          case 'auth_success':
          case 'join_success':
          case 'update_confirm':
            if (this.onPlayerUpdate) {
              this.onPlayerUpdate(data.player || { position: data.position });
            }
            break;

          case 'world_update':
            // Handle world updates
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