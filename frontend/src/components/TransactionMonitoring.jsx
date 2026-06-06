import React, { useEffect, useState } from 'react';
import client from '../api/client.js';

function TransactionMonitoring() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      // Fetch a sample account's transactions (demo: use account 1)
      const res = await client.get('/proxy/transactions/account/1');
      setTransactions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError('Failed to load transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(
    (tx) => !filter || tx.type.includes(filter) || tx.id.toString().includes(filter)
  );

  if (loading) return <div className="loading">Loading transactions...</div>;

  return (
    <div className="monitoring-panel">
      <h2>Transaction Monitoring</h2>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Filter by type or ID"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-input"
        />
        <button onClick={fetchTransactions} className="refresh-button">↻ Refresh</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {filteredTransactions.length === 0 ? (
        <div className="info-box">No transactions found.</div>
      ) : (
        <div className="transaction-list">
          {filteredTransactions.map((tx) => (
            <div key={tx.id} className="transaction-card">
              <div className="tx-header">
                <span className={`tx-type ${tx.type}`}>{tx.type.toUpperCase()}</span>
                <span className="tx-id">#{tx.id}</span>
              </div>
              <div className="tx-body">
                <div>From: {tx.from_account || '—'}</div>
                <div>To: {tx.to_account || '—'}</div>
                <div className="tx-amount">${tx.amount?.toFixed(2) || '0.00'}</div>
                <div className="tx-time">{tx.timestamp}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TransactionMonitoring;
