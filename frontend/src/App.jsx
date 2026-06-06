import React, { useEffect, useState } from 'react';
import AccountList from './components/AccountList.jsx';
import TransferForm from './components/TransferForm.jsx';
import './styles.css';
import './otel.js'; // initialize OpenTelemetry

function App() {
  const [gatewayHealth, setGatewayHealth] = useState(null);
  const [activeTab, setActiveTab] = useState('accounts'); // simple navigation

  useEffect(() => {
    // health‑check call to the gateway using relative path
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    const port = 8000;
    fetch(`${protocol}//${host}:${port}/health`)
      .then((r) => r.json())
      .then((data) => setGatewayHealth(data.status))
      .catch(() => setGatewayHealth('offline'));
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'accounts':
        return <AccountList />;
      case 'transfer':
        return <TransferForm />;
      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="app-container">
      <header className="app-header glass">
        <h1>Sabhi Bank Dashboard</h1>
        <div className="status">
          Gateway: <span className={gatewayHealth === 'ok' ? 'online' : 'offline'}>{gatewayHealth || '…'}</span>
        </div>
      </header>
      <nav className="app-nav glass">
        <button className={activeTab === 'accounts' ? 'active' : ''} onClick={() => setActiveTab('accounts')}>Accounts</button>
        <button className={activeTab === 'transfer' ? 'active' : ''} onClick={() => setActiveTab('transfer')}>Transfer</button>
        {/* Add more tabs for cards, loans, etc. */}
      </nav>
      <main className="app-main glass">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
