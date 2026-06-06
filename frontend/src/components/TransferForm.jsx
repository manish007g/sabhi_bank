import React, { useState } from 'react';
import client from '../api/client.js';

function TransferForm() {
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('transfer'); // transfer, deposit, withdraw
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const payload = { from_account: fromAccount || null, to_account: toAccount || null, amount: parseFloat(amount), type };
      // Proxy through gateway: /proxy/transactions/transactions
      await client.post('/proxy/transactions/transactions', payload);
      setStatus('success');
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <div className="p-4 glass">
      <h2 className="text-xl font-semibold mb-4">Create Transaction</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        >
          <option value="transfer">Transfer</option>
          <option value="deposit">Deposit</option>
          <option value="withdraw">Withdraw</option>
        </select>
        {(type === 'transfer' || type === 'withdraw') && (
          <input
            type="text"
            placeholder="From Account"
            value={fromAccount}
            onChange={(e) => setFromAccount(e.target.value)}
            required
            className="w-full p-2 rounded bg-gray-800 text-white"
          />
        )}
        {(type === 'transfer' || type === 'deposit') && (
          <input
            type="text"
            placeholder="To Account"
            value={toAccount}
            onChange={(e) => setToAccount(e.target.value)}
            required
            className="w-full p-2 rounded bg-gray-800 text-white"
          />
        )}
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          min="0"
          step="0.01"
          className="w-full p-2 rounded bg-gray-800 text-white"
        />
        <button
          type="submit"
          className="w-full p-2 bg-primary text-white rounded hover:bg-primary/80 transition"
          disabled={status === 'sending'}
        >
          {status === 'sending' ? 'Sending…' : 'Submit'}
        </button>
        {status === 'success' && <div className="text-green-400">Transaction sent!</div>}
        {status === 'error' && <div className="text-red-400">Failed to send.</div>}
      </form>
    </div>
  );
}

export default TransferForm;
