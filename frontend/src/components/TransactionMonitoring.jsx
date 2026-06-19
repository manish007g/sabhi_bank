import React, { useEffect, useState } from 'react';
import client from '../api/client.js';

function TransactionMonitoring() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter state
  const [searchAccount, setSearchAccount] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Form state for creating transactions
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [txType, setTxType] = useState('transfer'); // transfer, deposit, withdraw
  const [txStatus, setTxStatus] = useState(null);
  const [txMessage, setTxMessage] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await client.get('/proxy/transactions/transactions');
      setTransactions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError('Failed to load transaction ledger');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    setTxStatus('sending');
    setTxMessage('');
    try {
      const payload = {
        from_account: txType === 'deposit' ? null : fromAccount,
        to_account: txType === 'withdraw' ? null : toAccount,
        amount: parseFloat(amount),
        type: txType
      };
      
      const res = await client.post('/proxy/transactions/transactions', payload);
      setTxStatus('success');
      setTxMessage('Transaction recorded successfully!');
      
      // Clear form
      setFromAccount('');
      setToAccount('');
      setAmount('');
      
      // Refresh ledger
      fetchTransactions();
      setTimeout(() => {
        setTxStatus(null);
        setTxMessage('');
      }, 4000);
    } catch (err) {
      setTxStatus('error');
      setTxMessage(err.response?.data?.detail || 'Failed to execute transaction. Verify account numbers & balances.');
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesType = !typeFilter || tx.type === typeFilter;
    const matchesAccount = 
      !searchAccount ||
      (tx.from_account && tx.from_account.includes(searchAccount)) ||
      (tx.to_account && tx.to_account.includes(searchAccount));
    return matchesType && matchesAccount;
  });

  // Calculate statistics
  const totalVolume = filteredTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const depositsCount = filteredTransactions.filter(tx => tx.type === 'deposit').length;
  const withdrawalsCount = filteredTransactions.filter(tx => tx.type === 'withdraw').length;
  const transfersCount = filteredTransactions.filter(tx => tx.type === 'transfer').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-170px)]">
      
      {/* Left: Ledger & Stats (8 columns) */}
      <div className="lg:col-span-8 space-y-6 flex flex-col overflow-hidden">
        
        {/* Header & Refresh */}
        <div className="flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">Transaction Monitoring & Ledger</h2>
            <p className="text-gray-400 text-xs mt-0.5">Real-time ledger audit and monitoring system</p>
          </div>
          <button 
            onClick={fetchTransactions} 
            disabled={loading}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
          >
            {loading ? 'Refreshing...' : '↻ Refresh Ledger'}
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
          <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl">
            <div className="text-[9px] text-gray-500 uppercase font-semibold">Total Volume</div>
            <div className="text-md font-bold text-emerald-400 mt-1 font-mono">
              ₹{totalVolume.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl">
            <div className="text-[9px] text-gray-500 uppercase font-semibold">Deposits</div>
            <div className="text-md font-bold text-gray-200 mt-1">{depositsCount}</div>
          </div>
          <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl">
            <div className="text-[9px] text-gray-500 uppercase font-semibold">Withdrawals</div>
            <div className="text-md font-bold text-gray-200 mt-1">{withdrawalsCount}</div>
          </div>
          <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl">
            <div className="text-[9px] text-gray-500 uppercase font-semibold">Transfers</div>
            <div className="text-md font-bold text-gray-200 mt-1">{transfersCount}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-3 bg-slate-900/20 border border-slate-850 rounded-xl flex gap-3 items-center shrink-0">
          <input
            type="text"
            placeholder="Search by account number..."
            value={searchAccount}
            onChange={(e) => setSearchAccount(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-gray-200 outline-none focus:border-blue-500"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-gray-300 outline-none"
          >
            <option value="">All Types</option>
            <option value="deposit">Deposit</option>
            <option value="withdraw">Withdraw</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>

        {/* Ledger Table */}
        <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          {error && <div className="p-3 bg-rose-950/40 border-b border-rose-500/30 text-rose-300 text-xs">{error}</div>}
          
          {loading ? (
            <div className="flex-1 flex justify-center items-center text-gray-400 text-xs">Loading ledger transactions...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex-1 flex justify-center items-center text-gray-500 text-xs">No transactions in the log.</div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-950 text-gray-400 font-semibold uppercase text-[10px] border-b border-slate-800 z-10">
                  <tr>
                    <th className="p-3">TX ID</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">From Account</th>
                    <th className="p-3">To Account</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-gray-300">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/10 transition-colors">
                      <td className="p-3 font-mono text-[10px]">#{tx.id}</td>
                      <td className="p-3">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          tx.type === 'deposit' ? 'bg-emerald-950 text-emerald-400' :
                          tx.type === 'withdraw' ? 'bg-rose-950 text-rose-400' :
                          'bg-blue-950 text-blue-400'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[10px] text-gray-400">{tx.from_account || '— (Deposit)'}</td>
                      <td className="p-3 font-mono text-[10px] text-gray-400">{tx.to_account || '— (Withdrawal)'}</td>
                      <td className={`p-3 text-right font-bold font-mono ${
                        tx.type === 'deposit' ? 'text-emerald-400' : 
                        tx.type === 'withdraw' ? 'text-rose-400' : 'text-gray-200'
                      }`}>
                        {tx.type === 'deposit' ? '+' : '-'} ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
                      </td>
                      <td className="p-3 text-[10px] text-gray-500 font-mono">{tx.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Right: Transfer / Transaction Creator Form (4 columns) */}
      <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white">Execute Transaction</h3>
            <p className="text-gray-400 text-xs mt-0.5">Perform manual transfers, deposits, or withdrawals for customers.</p>
          </div>

          <form onSubmit={handleCreateTransaction} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-bold uppercase">Transaction Type</label>
              <select
                value={txType}
                onChange={(e) => setTxType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none"
              >
                <option value="transfer">Transfer (Account to Account)</option>
                <option value="deposit">Manual Deposit (Cash Inflow)</option>
                <option value="withdraw">Manual Withdrawal (Cash Outflow)</option>
              </select>
            </div>

            {(txType === 'transfer' || txType === 'withdraw') && (
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase">Source Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. 10-digit number"
                  value={fromAccount}
                  onChange={(e) => setFromAccount(e.target.value)}
                  required
                  maxLength={12}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>
            )}

            {(txType === 'transfer' || txType === 'deposit') && (
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase">Destination Account Number</label>
                <input
                  type="text"
                  placeholder="e.g. 10-digit number"
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  required
                  maxLength={12}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] text-gray-400 font-bold uppercase">Amount (INR)</label>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="1"
                step="0.01"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
              />
            </div>

            {txMessage && (
              <div className={`p-3 rounded-lg text-xs font-medium border ${
                txStatus === 'success' ? 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400' : 'bg-rose-950/40 border-rose-500/20 text-rose-400'
              }`}>
                {txMessage}
              </div>
            )}

            <button 
              type="submit" 
              disabled={txStatus === 'sending'}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
            >
              {txStatus === 'sending' ? 'Executing...' : 'Post Transaction'}
            </button>
          </form>
        </div>

        <div className="p-4 bg-slate-950/30 border border-slate-850 rounded-xl text-[10px] text-gray-500 leading-relaxed mt-4">
          <strong>Note:</strong> All operations are logged immediately under the audit service and automatically update client accounts in real time.
        </div>

      </div>

    </div>
  );
}

export default TransactionMonitoring;
