export class AuthService {
  constructor() {
    this.currentUser = null;
    this.savedUserId = localStorage.getItem('userId');
  }

  async authenticate(username = null) {
    try {
      const response = await fetch('http://localhost:3000/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: this.savedUserId,
          username
        })
      });

      const userData = await response.json();
      if (userData.id) {
        localStorage.setItem('userId', userData.id);
        this.currentUser = userData;
        return true;
      }
    } catch (error) {
      console.error('Authentication failed:', error);
    }
    return false;
  }

  showLoginDialog() {
    const dialog = document.createElement('div');
    Object.assign(dialog.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: '#fff',
      padding: '20px',
      borderRadius: '5px',
      boxShadow: '0 0 10px rgba(0,0,0,0.5)',
      zIndex: 1000
    });

    dialog.innerHTML = `
      <h2>Welcome to the Game</h2>
      <p>Please enter your username:</p>
      <input type="text" id="username" style="margin: 10px 0; padding: 5px;">
      <button id="submit" style="padding: 5px 10px;">Start Playing</button>
    `;

    document.body.appendChild(dialog);

    const input = dialog.querySelector('#username');
    const button = dialog.querySelector('#submit');

    return new Promise(resolve => {
      button.onclick = async () => {
        const username = input.value.trim();
        if (username) {
          const success = await this.authenticate(username);
          if (success) {
            dialog.remove();
            resolve(true);
          }
        }
      };
    });
  }

  getCurrentUser() {
    return this.currentUser;
  }
} 