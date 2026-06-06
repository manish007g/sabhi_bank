import React, { useEffect, useState } from 'react';
import Login from './components/Login.jsx';
import UserManagement from './components/UserManagement.jsx';
import TransactionMonitoring from './components/TransactionMonitoring.jsx';
import AuditLogs from './components/AuditLogs.jsx';
import AccountList from './components/AccountList.jsx';
import TransferForm from './components/TransferForm.jsx';
import './styles.css';
import './otel.js'; // initialize OpenTelemetry

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [gatewayHealth, setGatewayHealth] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const savedUsername = localStorage.getItem('username');
    if (token && savedUsername) {
      setIsLoggedIn(true);
      setUsername(savedUsername);
    }

    // Health check
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    const port = 8000;
    fetch(`${protocol}//${host}:${port}/health`)
      .then((r) => r.json())
      .then((data) => setGatewayHealth(data.status))
      .catch(() => setGatewayHealth('offline'));
  }, []);

  const handleLoginSuccess = (user, token) => {
    setUsername(user);
    setIsLoggedIn(true);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername('');
    setActiveTab('dashboard');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <div className="welcome-box"><h3>Welcome, {username}</h3><p>Select a service from the menu.</p></div>;
      case 'users':
        return <UserManagement />;
      case 'transactions':
        return <TransactionMonitoring />;
      case 'audit':
        return <AuditLogs />;
      case 'accounts':
        return <AccountList />;
      case 'transfer':
        return <TransferForm />;
      default:
        return <div>Select a tab</div>;
    }
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      <header className="app-header glass">
        <div className="header-left">
          <h1>🏦 Sabhi Bank</h1>
          <span className="user-badge">Employee: {username}</span>
        </div>
        <div className="header-right">
          <span className={`status-badge ${gatewayHealth === 'ok' ? 'online' : 'offline'}`}>
            {gatewayHealth === 'ok' ? '● Online' : '● Offline'}
          </span>
          <button className="logout-button" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <nav className="app-nav glass">
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''} 
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''} 
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button 
          className={activeTab === 'transactions' ? 'active' : ''} 
          onClick={() => setActiveTab('transactions')}
        >
          💳 Transactions
        </button>
        <button 
          className={activeTab === 'audit' ? 'active' : ''} 
          onClick={() => setActiveTab('audit')}
        >
          📋 Audit Logs
        </button>
        <button 
          className={activeTab === 'accounts' ? 'active' : ''} 
          onClick={() => setActiveTab('accounts')}
        >
          🏧 Accounts
        </button>
        <button 
          className={activeTab === 'transfer' ? 'active' : ''} 
          onClick={() => setActiveTab('transfer')}
        >
          💰 Transfers
        </button>
      </nav>

      <main className="app-main glass">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
