import React, { useEffect, useState } from 'react';
import client from '../api/client.js';

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await client.get('/proxy/audit/audit');
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError('Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(
    (log) => !filter || log.service.includes(filter) || log.action.includes(filter)
  );

  if (loading) return <div className="loading">Loading audit logs...</div>;

  return (
    <div className="audit-panel">
      <h2>Audit Logs</h2>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Filter by service or action"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-input"
        />
        <button onClick={fetchLogs} className="refresh-button">↻ Refresh</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {filteredLogs.length === 0 ? (
        <div className="info-box">No audit logs found.</div>
      ) : (
        <div className="logs-list">
          {filteredLogs.map((log, idx) => (
            <div key={idx} className="log-entry">
              <div className="log-header">
                <span className="log-service">{log.service}</span>
                <span className="log-action">{log.action}</span>
              </div>
              <div className="log-detail">{log.detail}</div>
              <div className="log-time">{log.timestamp}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AuditLogs;
