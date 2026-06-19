import React, { useEffect, useState } from 'react';
import Login from './components/Login.jsx';
import UserManagement from './components/UserManagement.jsx';
import TransactionMonitoring from './components/TransactionMonitoring.jsx';
import './styles.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const savedUsername = localStorage.getItem('username');
    if (token && savedUsername) {
      setIsLoggedIn(true);
      setUsername(savedUsername);
    }
  }, []);

  const handleLoginSuccess = (user, token) => {
    setUsername(user);
    setIsLoggedIn(true);
    setActiveTab('users');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername('');
    setActiveTab('users');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'transactions':
        return <TransactionMonitoring />;
      default:
        return <UserManagement />;
    }
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container bg-[#08090d] text-gray-100 min-h-screen font-sans flex flex-col">
      <header className="app-header glass px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            🏦 Sabhi Bank Employee Portal
          </h1>
          <span className="text-xs px-2.5 py-1 bg-blue-950/60 border border-blue-900/40 text-blue-300 rounded-full font-semibold">
            Staff: {username}
          </span>
        </div>
        <div>
          <button 
            className="px-3.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-gray-300 rounded-lg text-xs font-semibold transition"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <nav className="app-nav glass border-b border-slate-800/50 bg-slate-950/20 px-6 py-1 flex gap-2">
        {[
          { id: 'users', label: '👥 User Accounts & CRUD' },
          { id: 'transactions', label: '💳 Ledger & Transfer' }
        ].map(t => (
          <button 
            key={t.id}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === t.id 
                ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`} 
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="app-main flex-1 p-6 overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
