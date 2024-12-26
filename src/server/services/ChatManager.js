export class ChatManager {
  constructor() {
    this.messages = [];
    this.maxMessages = 100; // Keep last 100 messages
  }

  async addMessage(message) {
    this.messages.push(message);
    
    // Trim old messages if needed
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
    
    return message;
  }

  async getRecentMessages() {
    return this.messages;
  }
} 