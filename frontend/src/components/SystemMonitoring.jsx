import React, { useEffect, useState } from 'react';
import client from '../api/client.js';

const SERVICES = [
  { name: 'gateway', label: 'API Gateway', port: 8000 },
  { name: 'auth', label: 'Auth Service', port: 8001 },
  { name: 'accounts', label: 'Accounts Service', port: 8002 },
  { name: 'transactions', label: 'Transactions Service', port: 8003 },
  { name: 'cards', label: 'Cards Service', port: 8004 },
  { name: 'loans', label: 'Loans Service', port: 8005 },
  { name: 'fd', label: 'Fixed Deposit Service', port: 8006 },
  { name: 'notification', label: 'Notification Service', port: 8007 },
  { name: 'audit', label: 'Audit Service', port: 8008 },
  { name: 'analytics', label: 'Analytics Service', port: 8009 }
];

function SystemMonitoring() {
  const [healthStatus, setHealthStatus] = useState({});
  const [metrics, setMetrics] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingHealth, setCheckingHealth] = useState(false);

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchSystemData = async () => {
    try {
      setError('');
      // Check health of each service
      setCheckingHealth(true);
      const healthPromises = SERVICES.map(async (srv) => {
        try {
          // Check health via gateway health endpoint or directly if CORS allows
          // Since they are inside docker and we are outside, we proxy through the gateway
          // Except gateway itself which we check directly at gateway /health
          if (srv.name === 'gateway') {
            const res = await client.get('/health', { timeout: 2000 });
            return { name: srv.name, status: res.data?.status === 'ok' ? 'online' : 'offline' };
          } else {
            // Check health of subservice via proxy gateway
            // FastAPI subservices don't have a custom health route in their main.py, 
            // but we can query their base URL or docs or any basic route (e.g. proxying a simple route)
            // If they are reachable they will return a response (even a 404 or 401 verify count as reachable)
            // Let's use the verify endpoint for auth, accounts root for accounts, etc.
            const path = srv.name === 'accounts' ? '/' : srv.name === 'auth' ? '/verify?token=test' : '';
            const res = await client.get(`/proxy/${srv.name}${path}`, { timeout: 2000 });
            return { name: srv.name, status: 'online' };
          }
        } catch (err) {
          // If we receive a response with status code, the service is alive (just route error)
          if (err.response) {
            return { name: srv.name, status: 'online' };
          }
          return { name: srv.name, status: 'offline' };
        }
      });

      const healthResults = await Promise.all(healthPromises);
      const newHealth = {};
      healthResults.forEach(r => {
        newHealth[r.name] = r.status;
      });
      setHealthStatus(newHealth);
      setCheckingHealth(false);

      // Fetch metrics
      const metricsRes = await client.get('/proxy/analytics/metrics');
      setMetrics(Array.isArray(metricsRes.data) ? metricsRes.data.slice(0, 30) : []);

      // Fetch audit logs
      const logsRes = await client.get('/proxy/audit/audit');
      setLogs(Array.isArray(logsRes.data) ? logsRes.data.slice(0, 30) : []);

    } catch (err) {
      setError('Failed to fetch system data from backend services.');
    } finally {
      setLoading(false);
    }
  };

  const getMetricValuePercent = (metricName, val) => {
    if (metricName.includes('percent') || metricName.includes('utilization')) {
      return val;
    }
    // Normalized representation
    return Math.min((val / 1000) * 100, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">System & Observability Dashboard</h2>
          <p className="text-gray-400 text-sm">Real-time health monitoring and backend telemetry analytics</p>
        </div>
        <button 
          onClick={fetchSystemData} 
          disabled={checkingHealth}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2 font-medium"
        >
          {checkingHealth ? 'Checking...' : '↻ Refresh System'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Services Health Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {SERVICES.map((srv) => {
          const status = healthStatus[srv.name] || 'loading';
          return (
            <div key={srv.name} className="p-4 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <div className="text-xs text-gray-500 font-mono uppercase">Port {srv.port}</div>
                <div className="font-semibold text-gray-200 mt-1 leading-tight">{srv.label}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  status === 'online' ? 'bg-emerald-500 animate-pulse' : 
                  status === 'offline' ? 'bg-rose-500' : 'bg-amber-500'
                }`} />
                <span className={`text-xs font-bold uppercase ${
                  status === 'online' ? 'text-emerald-400' : 
                  status === 'offline' ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Analytics Telemetry Panel */}
        <div className="p-6 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-blue-400">System Telemetry & Metrics</h3>
            <span className="text-xs text-gray-500">Analytics Service</span>
          </div>
          
          {metrics.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">No telemetry metrics recorded.</div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {metrics.map((m) => {
                const percent = getMetricValuePercent(m.metric, m.value);
                return (
                  <div key={m.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-300 font-semibold">{m.metric}</span>
                      <span className="text-blue-400">{m.value.toFixed(1)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          percent > 85 ? 'bg-rose-500' : 
                          percent > 60 ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>{m.tags}</span>
                      <span>{m.timestamp}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Global Audit Log Panel */}
        <div className="p-6 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-purple-400">Global System Audit Logs</h3>
            <span className="text-xs text-gray-500">Audit Service</span>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">No audit logs available.</div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {logs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-purple-950 text-purple-300 rounded font-bold uppercase text-[10px]">
                        {log.service.replace('-service', '')}
                      </span>
                      <span className="text-gray-400 font-medium">{log.action}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{log.timestamp}</span>
                  </div>
                  <p className="text-xs text-gray-300 font-mono leading-relaxed">{log.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SystemMonitoring;
