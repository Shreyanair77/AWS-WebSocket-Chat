import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Chat from './components/Chat';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const storedUser = localStorage.getItem('chatUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('chatUser');
      }
    }
    setIsConnecting(false);
  }, []);

  const handleLogin = (username) => {
    const userData = {
      username,
      userId: `user-${Date.now()}`,
      connectedAt: new Date().toISOString(),
    };
    setUser(userData);
    localStorage.setItem('chatUser', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('chatUser');
  };

  if (isConnecting) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 AWS WebSocket Chat</h1>
        {user && (
          <div className="user-info">
            <span className="username">👤 {user.username}</span>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </header>
      <main className="app-main">
        {user ? <Chat user={user} /> : <Login onLogin={handleLogin} />}
      </main>
      <footer className="app-footer">
        <p>Built with AWS Lambda, API Gateway, DynamoDB & React</p>
      </footer>
    </div>
  );
}

export default App;
