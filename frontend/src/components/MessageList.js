import React, { useEffect, useRef } from 'react';

const MessageList = ({ messages, currentUser }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (messages.length === 0) {
    return (
      <div className="messages-container">
        <div className="empty-messages">
          No messages yet. Start the conversation.
        </div>
      </div>
    );
  }

  return (
    <div className="messages-container">
      {messages.map((message, index) => {
        const isOwnMessage = message.username === currentUser;
        const isSystemMessage = message.type === 'system';

        if (isSystemMessage) {
          return (
            <div key={index} className="system-message">
              {message.message}
            </div>
          );
        }

        return (
          <div 
            key={message.messageId || index} 
            className={`message ${isOwnMessage ? 'own' : ''}`}
          >
            <div className="message-header">
              <span className="message-username">
                {isOwnMessage ? 'You' : message.username}
              </span>
              <span className="message-time">
                {formatTime(message.timestamp)}
              </span>
            </div>
            <div className="message-content">
              {message.message}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
