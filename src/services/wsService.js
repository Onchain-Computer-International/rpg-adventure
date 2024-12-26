export class WSService {
  constructor(onPlayerUpdate) {
    this.ws = null;
    this.currentUser = null;
    this.onPlayerUpdate = onPlayerUpdate;
  }

  initialize(currentUser) {
    this.currentUser = currentUser;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket('ws://localhost:3000');
    
    this.ws.onopen = () => {
      if (this.currentUser) {
        this.ws.send(JSON.stringify({
          type: 'auth',
          userId: this.currentUser.id
        }));
      }
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'auth_success':
          console.log('Authentication successful');
          if (data.player && data.player.position) {
            this.onPlayerUpdate(data.player);
          }
          break;
        case 'move_confirm':
          console.log('Move confirmed:', data.position);
          if (data.position) {
            this.onPlayerUpdate({ position: data.position });
          }
          break;
        case 'world_update':
          // Handle world updates if needed
          break;
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
      setTimeout(() => this.connect(), 5000);
    };
  }

  sendMove(position) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'move',
        position
      }));
    }
  }
} 