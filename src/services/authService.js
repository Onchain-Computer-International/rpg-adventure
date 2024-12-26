import { CONFIG } from '../config';

export class AuthService {
  constructor() {
    this.currentUser = null;
    this.savedUserId = localStorage.getItem('userId');
  }

  async authenticate(username = null) {
    try {
      const response = await fetch(`${CONFIG.API_URL}/api/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add CSRF token if your backend requires it
          // 'X-CSRF-Token': this.getCSRFToken(),
        },
        credentials: 'include', // For handling cookies properly
        body: JSON.stringify({
          userId: this.savedUserId,
          username: username?.trim()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
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