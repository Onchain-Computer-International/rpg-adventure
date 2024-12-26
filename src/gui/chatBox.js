export const createChatBox = (wsService) => {
  // Create main container
  const chatContainer = document.createElement('div');
  chatContainer.id = 'chat-box';
  Object.assign(chatContainer.style, {
    position: 'absolute',
    left: '10px',
    bottom: '10px',
    width: '420px',
    height: '280px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    border: '1px solid #444',
    borderRadius: '5px',
    display: 'flex',
    flexDirection: 'column',
    zIndex: '1000'
  });

  // Prevent event propagation for all chat interactions
  const preventPropagation = (e) => {
    e.stopPropagation();
  };

  // Add event listeners to prevent propagation
  chatContainer.addEventListener('mousedown', preventPropagation);
  chatContainer.addEventListener('mouseup', preventPropagation);
  chatContainer.addEventListener('click', preventPropagation);
  chatContainer.addEventListener('keydown', preventPropagation);
  chatContainer.addEventListener('keyup', preventPropagation);
  chatContainer.addEventListener('wheel', preventPropagation);

  // Create messages container
  const messagesContainer = document.createElement('div');
  Object.assign(messagesContainer.style, {
    flex: '1',
    overflowY: 'auto',
    padding: '10px',
    color: 'white',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px'
  });

  // Create input container
  const inputContainer = document.createElement('div');
  Object.assign(inputContainer.style, {
    display: 'flex',
    padding: '10px',
    borderTop: '1px solid #444'
  });

  // Create input field
  const input = document.createElement('input');
  Object.assign(input.style, {
    flex: '1',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid #555',
    borderRadius: '3px',
    padding: '5px',
    color: 'white',
    outline: 'none'
  });
  input.placeholder = 'Type a message...';

  // Create send button
  const sendButton = document.createElement('button');
  sendButton.textContent = 'Send';
  Object.assign(sendButton.style, {
    marginLeft: '5px',
    padding: '5px 10px',
    backgroundColor: '#4CAF50',
    border: 'none',
    borderRadius: '3px',
    color: 'white',
    cursor: 'pointer'
  });

  // Add hover effect to send button
  sendButton.onmouseover = () => sendButton.style.backgroundColor = '#45a049';
  sendButton.onmouseout = () => sendButton.style.backgroundColor = '#4CAF50';

  // Chat functionality
  const addMessage = (text, sender = 'Player', timestamp = Date.now()) => {
    const messageElement = document.createElement('div');
    messageElement.style.marginBottom = '5px';
    
    const time = new Date(timestamp).toLocaleTimeString();
    messageElement.innerHTML = `<span style="color: #888">[${time}]</span> <span style="color: #4CAF50">${sender}:</span> ${text}`;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  };

  const handleSendMessage = () => {
    const text = input.value.trim();
    if (text) {
      wsService.sendChatMessage(text);
      input.value = '';
    }
  };

  // Load chat history
  const loadChatHistory = async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:3000/api/chat/history`);
      const history = await response.json();
      
      history.forEach(msg => {
        addMessage(msg.message, msg.username, msg.timestamp);
      });
    } catch (error) {
      console.error('Failed to load chat history:', error);
      addMessage('Failed to load chat history', 'System');
    }
  };

  // Load initial history
  loadChatHistory();

  // Set up WebSocket message handler
  wsService.setHandlers({
    ...wsService.handlers,
    onChatMessage: (data) => {
      addMessage(data.message.message, data.message.username, data.message.timestamp);
    }
  });

  // Event listeners
  sendButton.addEventListener('click', handleSendMessage);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  });

  // Toggle chat visibility with 'T' key
  let isVisible = true;
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 't') {
      e.preventDefault(); // Prevent 't' from being typed in other inputs
      isVisible = !isVisible;
      chatContainer.style.display = isVisible ? 'flex' : 'none';
      if (isVisible) {
        input.focus();
      }
    }
  });

  // Assemble the chat box
  inputContainer.appendChild(input);
  inputContainer.appendChild(sendButton);
  chatContainer.appendChild(messagesContainer);
  chatContainer.appendChild(inputContainer);

  // Expose chat API
  chatContainer.addMessage = addMessage;

  // Add some welcome messages
  addMessage('Welcome to the game!', 'System');
  addMessage('Press T to toggle chat visibility', 'System');

  return chatContainer;
};