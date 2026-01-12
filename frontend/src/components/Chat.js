import React, { useState, useEffect, useRef } from 'react';
import MessageList from './MessageList';
import WebSocketService from '../services/websocket';

const Chat = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [error, setError] = useState(null);
  const wsService = useRef(null);

  useEffect(() => {
    // Initialize WebSocket connection
    wsService.current = new WebSocketService(user);

    wsService.current.onStatusChange((status) => {
      setConnectionStatus(status);
      if (status === 'connected') {
        setError(null);
      }
    });

    wsService.current.onMessage((message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    wsService.current.onError((errorMessage) => {
      setError(errorMessage);
      console.error('WebSocket error:', errorMessage);
    });

    wsService.current.connect();

    // Cleanup on unmount
    return () => {
      if (wsService.current) {
        wsService.current.disconnect();
      }
    };
  }, [user]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      return;
    }

    if (connectionStatus !== 'connected') {
      setError('Not connected to server. Please wait...');
      return;
    }

    const success = wsService.current.sendMessage(newMessage.trim());
    
    if (success) {
      setNewMessage('');
      setError(null);
    } else {
      setError('Failed to send message. Please try again.');
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>Chat Room - General</h3>
        <div className="connection-status">
          <span className={`status-indicator ${connectionStatus}`}></span>
          <span>{getStatusText()}</span>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      <MessageList messages={messages} currentUser={user.username} />

      <form onSubmit={handleSendMessage} className="message-input-container">
        <input
          type="text"
          className="message-input"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          maxLength={1000}
          disabled={connectionStatus !== 'connected'}
        />
        <button
          type="submit"
          className="send-btn"
          disabled={!newMessage.trim() || connectionStatus !== 'connected'}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
