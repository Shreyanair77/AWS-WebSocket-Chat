import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      setIsLoading(true);
      // Simulate a small delay for better UX
      setTimeout(() => {
        onLogin(username.trim());
        setIsLoading(false);
      }, 500);
    }
  };

  return (
    <div className="login-container">
      <h2>Welcome to WebSocket Chat</h2>
      <p>Enter your username to start chatting</p>
      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={50}
            required
            autoFocus
          />
        </div>
        <button 
          type="submit" 
          className="login-btn"
          disabled={!username.trim() || isLoading}
        >
          {isLoading ? 'Joining...' : 'Join Chat'}
        </button>
      </form>
    </div>
  );
};

export default Login;
