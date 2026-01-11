/**
 * WebSocket Service for managing real-time chat connections
 */

class WebSocketService {
  constructor(user) {
    this.user = user;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.messageCallbacks = [];
    this.statusCallbacks = [];
    this.errorCallbacks = [];
    
    // Get WebSocket URL from environment variable or use default
    this.wsUrl = process.env.REACT_APP_WEBSOCKET_URL || 'wss://i3nwerqn51.execute-api.us-east-1.amazonaws.com/production';
  }

  connect() {
    try {
      // Add user info as query parameters
      const url = `${this.wsUrl}?userId=${encodeURIComponent(this.user.userId)}&username=${encodeURIComponent(this.user.username)}`;
      
      this.updateStatus('connecting');
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
        this.notifyMessage({
          type: 'system',
          message: `Welcome to the chat, ${this.user.username}!`,
          timestamp: Date.now(),
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message:', data);
          this.notifyMessage(data);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.notifyError('Connection error occurred');
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.updateStatus('disconnected');
        
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.handleReconnect();
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.notifyError('Failed to reconnect after multiple attempts');
        }
      };

    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.notifyError('Failed to establish connection');
      this.updateStatus('disconnected');
    }
  }

  handleReconnect() {
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    this.notifyMessage({
      type: 'system',
      message: `Reconnecting... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      timestamp: Date.now(),
    });

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  sendMessage(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      this.notifyError('Cannot send message: not connected');
      return false;
    }

    try {
      const payload = {
        action: 'sendMessage',
        message: message,
        username: this.user.username,
        roomId: 'general',
      };

      this.ws.send(JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      this.notifyError('Failed to send message');
      return false;
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
      this.updateStatus('disconnected');
    }
  }

  onMessage(callback) {
    this.messageCallbacks.push(callback);
  }

  onStatusChange(callback) {
    this.statusCallbacks.push(callback);
  }

  onError(callback) {
    this.errorCallbacks.push(callback);
  }

  notifyMessage(message) {
    this.messageCallbacks.forEach(callback => callback(message));
  }

  updateStatus(status) {
    this.statusCallbacks.forEach(callback => callback(status));
  }

  notifyError(error) {
    this.errorCallbacks.forEach(callback => callback(error));
  }
}

export default WebSocketService;
