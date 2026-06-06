import React, { useEffect, useState } from 'react';
import client from '../api/client.js';

// For demo we use a fixed user_id; in a real app this would be from auth
const DEMO_USER_ID = 1;

function AccountList() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    client
      .get(`/proxy/accounts/user/${DEMO_USER_ID}`)
      .then((res) => {
        setAccounts(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load accounts');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-4">Loading accounts…</div>;
  if (error) return <div className="p-4 text-red-400">{error}</div>;
  if (accounts.length === 0) return <div className="p-4">No accounts found.</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Your Accounts</h2>
      <ul className="space-y-2">
        {accounts.map((acc) => (
          <li key={acc.account_number} className="p-4 bg-gray-800 rounded-lg shadow-md glass">
            <div className="flex justify-between items-center">
              <span className="font-medium">{acc.account_number}</span>
              <span>{acc.account_type}</span>
            </div>
            <div className="mt-2 text-green-400 font-bold">Balance: ${acc.balance.toFixed(2)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AccountList;
