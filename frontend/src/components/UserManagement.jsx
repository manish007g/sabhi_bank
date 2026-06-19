import React, { useEffect, useState } from 'react';
import client from '../api/client.js';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Tabs for detailed view
  const [activeTab, setActiveTab] = useState('profile');

  // Related User Data State
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [loans, setLoans] = useState([]);
  const [fds, setFds] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form states for creating sub-resources
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [newAccount, setNewAccount] = useState({ account_type: 'savings', initial_deposit: '' });

  const [showCardForm, setShowCardForm] = useState(false);
  const [newCard, setNewCard] = useState({ limit_amount: '' });

  const [showLoanForm, setShowLoanForm] = useState(false);
  const [newLoan, setNewLoan] = useState({ amount: '', interest_rate: '8.5' });

  const [showFdForm, setShowFdForm] = useState(false);
  const [newFd, setNewFd] = useState({ amount: '', interest_rate: '6.5', maturity_date: '' });

  // Edit user profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfile, setEditProfile] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchUserDetails(selectedUser.id);
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      setError('');
      const res = await client.get('/proxy/auth/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError('Failed to fetch users list');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchUserDetails = async (userId) => {
    try {
      setLoadingDetails(true);
      setError('');
      
      // Fetch profile details specifically (refreshes selectedUser)
      const profileRes = await client.get(`/proxy/auth/users/${userId}`);
      setSelectedUser(profileRes.data);
      setEditProfile(profileRes.data);
      setIsEditingProfile(false);

      // Fetch accounts
      const accountsRes = await client.get(`/proxy/accounts/user/${userId}`);
      const userAccounts = Array.isArray(accountsRes.data) ? accountsRes.data : [];
      setAccounts(userAccounts);

      // Fetch cards
      const cardsRes = await client.get(`/proxy/cards/cards/user/${userId}`);
      setCards(Array.isArray(cardsRes.data) ? cardsRes.data : []);

      // Fetch loans
      const loansRes = await client.get(`/proxy/loans/loans/user/${userId}`);
      setLoans(Array.isArray(loansRes.data) ? loansRes.data : []);

      // Fetch FDs
      const fdsRes = await client.get(`/proxy/fd/fds/user/${userId}`);
      setFds(Array.isArray(fdsRes.data) ? fdsRes.data : []);

      // Fetch transactions for all user accounts combined
      let allTxs = [];
      for (let acc of userAccounts) {
        try {
          const txRes = await client.get(`/proxy/transactions/transactions/account/${acc.account_number}`);
          if (Array.isArray(txRes.data)) {
            allTxs = [...allTxs, ...txRes.data.map(t => ({ ...t, account_number: acc.account_number }))];
          }
        } catch (e) {
          // ignore failures for single account
        }
      }
      // Sort transactions by timestamp desc
      allTxs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setTransactions(allTxs);

    } catch (err) {
      setError('Failed to load full user details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await client.put(`/proxy/auth/users/${selectedUser.id}`, {
        full_name: editProfile.full_name,
        email: editProfile.email,
        phone: editProfile.phone,
        address: editProfile.address,
        kyc_status: editProfile.kyc_status,
        status: editProfile.status,
        occupation: editProfile.occupation,
        date_of_birth: editProfile.date_of_birth
      });
      showNotification('✓ Profile updated successfully');
      setIsEditingProfile(false);
      // Refresh
      fetchUserDetails(selectedUser.id);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile');
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await client.post('/proxy/accounts/', {
        user_id: selectedUser.id,
        account_type: newAccount.account_type,
        initial_deposit: parseFloat(newAccount.initial_deposit)
      });
      showNotification('✓ Bank account opened successfully');
      setShowAccountForm(false);
      setNewAccount({ account_type: 'savings', initial_deposit: '' });
      fetchUserDetails(selectedUser.id);
    } catch (err) {
      setError('Failed to open account');
    }
  };

  const handleCreateCard = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await client.post('/proxy/cards/cards', {
        user_id: selectedUser.id,
        limit_amount: parseFloat(newCard.limit_amount)
      });
      showNotification('✓ New card issued successfully');
      setShowCardForm(false);
      setNewCard({ limit_amount: '' });
      fetchUserDetails(selectedUser.id);
    } catch (err) {
      setError('Failed to issue card');
    }
  };

  const handleToggleCardStatus = async (cardNumber, currentStatus) => {
    try {
      setError('');
      const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
      await client.put(`/proxy/cards/cards/${cardNumber}/status`, { status: newStatus });
      showNotification(`✓ Card status updated to ${newStatus}`);
      fetchUserDetails(selectedUser.id);
    } catch (err) {
      setError('Failed to update card status');
    }
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await client.post('/proxy/loans/loans', {
        user_id: selectedUser.id,
        amount: parseFloat(newLoan.amount),
        interest_rate: parseFloat(newLoan.interest_rate)
      });
      showNotification('✓ Loan application submitted');
      setShowLoanForm(false);
      setNewLoan({ amount: '', interest_rate: '8.5' });
      fetchUserDetails(selectedUser.id);
    } catch (err) {
      setError('Failed to submit loan application');
    }
  };

  const handleUpdateLoanStatus = async (loanId, newStatus) => {
    try {
      setError('');
      await client.put(`/proxy/loans/loans/${loanId}/status`, { status: newStatus });
      showNotification(`✓ Loan status updated to ${newStatus}`);
      fetchUserDetails(selectedUser.id);
    } catch (err) {
      setError('Failed to update loan status');
    }
  };

  const handleCreateFd = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await client.post('/proxy/fd/fds', {
        user_id: selectedUser.id,
        amount: parseFloat(newFd.amount),
        interest_rate: parseFloat(newFd.interest_rate),
        maturity_date: newFd.maturity_date
      });
      showNotification('✓ Fixed Deposit created successfully');
      setShowFdForm(false);
      setNewFd({ amount: '', interest_rate: '6.5', maturity_date: '' });
      fetchUserDetails(selectedUser.id);
    } catch (err) {
      setError('Failed to create Fixed Deposit');
    }
  };

  const showNotification = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  // Filtering users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesKyc = !kycFilter || u.kyc_status === kycFilter;
    const matchesStatus = !statusFilter || u.status === statusFilter;

    return matchesSearch && matchesKyc && matchesStatus;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-170px)]">
      
      {/* Users List Sidebar (4 cols) */}
      <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Bank Accounts & Users</h3>
            <span className="text-xs px-2 py-0.5 bg-slate-800 text-gray-400 rounded-full font-mono">
              Total: {filteredUsers.length}
            </span>
          </div>
          
          <input
            type="text"
            placeholder="Search by name, email, user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-gray-200 outline-none focus:border-blue-500 transition-colors"
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value)}
              className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-gray-300 outline-none"
            >
              <option value="">KYC Status (All)</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-gray-300 outline-none"
            >
              <option value="">Status (All)</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>

        {loadingUsers ? (
          <div className="flex-1 flex justify-center items-center text-gray-400 text-sm">
            Loading accounts database...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No users found matching filters.</div>
            ) : (
              filteredUsers.map((u) => {
                const initials = u.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                const isSelected = selectedUser && selectedUser.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`p-4 flex items-center gap-3 cursor-pointer transition-all ${
                      isSelected ? 'bg-blue-600/10 border-l-4 border-blue-500' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-sm text-gray-200 truncate">{u.full_name}</h4>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          u.kyc_status === 'Approved' ? 'bg-emerald-950 text-emerald-400' :
                          u.kyc_status === 'Pending' ? 'bg-amber-950 text-amber-400' :
                          'bg-rose-950 text-rose-400'
                        }`}>
                          {u.kyc_status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">@{u.username}</p>
                      <p className="text-[10px] text-gray-400 mt-1 truncate">{u.phone || 'No phone number'}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Details Panel (8 cols) */}
      <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
        
        {selectedUser ? (
          <>
            {/* Header info */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedUser.full_name}</h3>
                <p className="text-xs text-gray-400 font-mono mt-1">
                  User ID: {selectedUser.id} | Email: {selectedUser.email} | Status: 
                  <span className={`ml-1 font-bold ${selectedUser.status === 'Active' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedUser.status}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedUser.kyc_status === 'Pending' && (
                  <button 
                    onClick={() => {
                      setEditProfile({ ...selectedUser, kyc_status: 'Approved' });
                      client.put(`/proxy/auth/users/${selectedUser.id}`, { ...selectedUser, kyc_status: 'Approved' })
                        .then(() => { showNotification('✓ KYC Approved'); fetchUserDetails(selectedUser.id); fetchUsers(); });
                    }}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold transition"
                  >
                    Quick Approve KYC
                  </button>
                )}
                <button 
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-gray-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  {isEditingProfile ? 'Cancel Edit' : '✍ Edit Profile'}
                </button>
              </div>
            </div>

            {/* Tab navigation */}
            <div className="flex border-b border-slate-800 overflow-x-auto text-sm font-semibold">
              {[
                { id: 'profile', label: '👤 Profile & KYC' },
                { id: 'accounts', label: '🏧 Accounts' },
                { id: 'cards', label: '💳 Cards' },
                { id: 'loans', label: '💰 Loans' },
                { id: 'fds', label: '⏳ Fixed Deposits' },
                { id: 'transactions', label: '📋 Transactions' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-5 py-3 border-b-2 transition whitespace-nowrap ${
                    activeTab === t.id 
                      ? 'border-blue-500 text-blue-400 bg-blue-500/5' 
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-slate-800/10'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Error/Success messages inside panel */}
            {message && <div className="mx-6 mt-4 p-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl">{message}</div>}
            {error && <div className="mx-6 mt-4 p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs rounded-xl">{error}</div>}

            {/* Tab contents */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetails ? (
                <div className="h-full flex justify-center items-center text-gray-400 text-sm">
                  Fetching user database details...
                </div>
              ) : (
                <>
                  {/* PROFILE TAB */}
                  {activeTab === 'profile' && (
                    <div className="space-y-6">
                      {isEditingProfile ? (
                        <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs text-gray-400 font-semibold uppercase">Full Name</label>
                              <input
                                type="text"
                                value={editProfile?.full_name || ''}
                                onChange={(e) => setEditProfile({ ...editProfile, full_name: e.target.value })}
                                required
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-gray-400 font-semibold uppercase">Email</label>
                              <input
                                type="email"
                                value={editProfile?.email || ''}
                                onChange={(e) => setEditProfile({ ...editProfile, email: e.target.value })}
                                required
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-gray-400 font-semibold uppercase">Phone Number</label>
                              <input
                                type="text"
                                value={editProfile?.phone || ''}
                                onChange={(e) => setEditProfile({ ...editProfile, phone: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-gray-400 font-semibold uppercase">Occupation</label>
                              <input
                                type="text"
                                value={editProfile?.occupation || ''}
                                onChange={(e) => setEditProfile({ ...editProfile, occupation: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-gray-400 font-semibold uppercase">Date of Birth</label>
                              <input
                                type="date"
                                value={editProfile?.date_of_birth || ''}
                                onChange={(e) => setEditProfile({ ...editProfile, date_of_birth: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-gray-400 font-semibold uppercase">KYC Status</label>
                              <select
                                value={editProfile?.kyc_status || 'Pending'}
                                onChange={(e) => setEditProfile({ ...editProfile, kyc_status: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                              </select>
                            </div>
                            <div className="space-y-1 col-span-2">
                              <label className="text-xs text-gray-400 font-semibold uppercase">Address</label>
                              <textarea
                                value={editProfile?.address || ''}
                                onChange={(e) => setEditProfile({ ...editProfile, address: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-gray-400 font-semibold uppercase">Account Status</label>
                              <select
                                value={editProfile?.status || 'Active'}
                                onChange={(e) => setEditProfile({ ...editProfile, status: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                              >
                                <option value="Active">Active</option>
                                <option value="Suspended">Suspended</option>
                              </select>
                            </div>
                          </div>
                          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition">
                            Save Profile Changes
                          </button>
                        </form>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Account Overview</h4>
                            <div className="grid grid-cols-2 gap-4 bg-slate-900/20 p-4 border border-slate-800 rounded-xl">
                              <div>
                                <span className="text-[10px] text-gray-500 uppercase">Username</span>
                                <p className="text-sm text-gray-200 font-mono mt-0.5">@{selectedUser.username}</p>
                              </div>
                              <div>
                                <span className="text-[10px] text-gray-500 uppercase">Created Date</span>
                                <p className="text-xs text-gray-200 mt-0.5">{selectedUser.created_at || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-[10px] text-gray-500 uppercase">KYC Status</span>
                                <p className={`text-sm font-bold mt-0.5 uppercase ${
                                  selectedUser.kyc_status === 'Approved' ? 'text-emerald-400' :
                                  selectedUser.kyc_status === 'Pending' ? 'text-amber-400' : 'text-rose-400'
                                }`}>
                                  {selectedUser.kyc_status}
                                </p>
                              </div>
                              <div>
                                <span className="text-[10px] text-gray-500 uppercase">Profile Status</span>
                                <p className={`text-sm font-bold mt-0.5 uppercase ${
                                  selectedUser.status === 'Active' ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                  {selectedUser.status}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">KYC & Personal Info</h4>
                            <div className="space-y-3 bg-slate-900/20 p-4 border border-slate-800 rounded-xl text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400 text-xs">Date of Birth</span>
                                <span className="text-gray-200 font-medium">{selectedUser.date_of_birth || 'Not Specified'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400 text-xs">Occupation</span>
                                <span className="text-gray-200 font-medium">{selectedUser.occupation || 'Not Specified'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400 text-xs">Phone</span>
                                <span className="text-gray-200 font-medium">{selectedUser.phone || 'Not Specified'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400 text-xs">Email</span>
                                <span className="text-gray-200 font-medium">{selectedUser.email}</span>
                              </div>
                              <div className="pt-2 border-t border-slate-800">
                                <span className="text-gray-500 text-[10px] uppercase">Registered Address</span>
                                <p className="text-xs text-gray-300 mt-1 leading-relaxed">{selectedUser.address || 'No address provided'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ACCOUNTS TAB */}
                  {activeTab === 'accounts' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h4 className="text-md font-bold text-white">User Bank Accounts</h4>
                        <button
                          onClick={() => setShowAccountForm(!showAccountForm)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                        >
                          {showAccountForm ? '✕ Close Form' : '+ Open New Account'}
                        </button>
                      </div>

                      {showAccountForm && (
                        <form onSubmit={handleCreateAccount} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4 max-w-md">
                          <h5 className="text-xs font-bold text-gray-400 uppercase">New Account Details</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs text-gray-400">Account Type</label>
                              <select
                                value={newAccount.account_type}
                                onChange={(e) => setNewAccount({ ...newAccount, account_type: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                              >
                                <option value="savings">Savings</option>
                                <option value="checking">Checking</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-gray-400">Initial Deposit (INR)</label>
                              <input
                                type="number"
                                placeholder="e.g. 5000"
                                value={newAccount.initial_deposit}
                                onChange={(e) => setNewAccount({ ...newAccount, initial_deposit: e.target.value })}
                                required
                                min="0"
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                              />
                            </div>
                          </div>
                          <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition">
                            Create Checking / Savings Account
                          </button>
                        </form>
                      )}

                      {accounts.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 text-sm">No accounts found for this user.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {accounts.map((acc) => (
                            <div key={acc.account_number} className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-blue-400 rounded-md font-bold uppercase tracking-wider">
                                    {acc.account_type}
                                  </span>
                                  <h4 className="text-md font-bold text-gray-200 font-mono mt-2">{acc.account_number}</h4>
                                </div>
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              </div>
                              <div className="border-t border-slate-800/80 pt-3 flex justify-between items-baseline">
                                <span className="text-xs text-gray-400">Balance</span>
                                <span className="text-lg font-bold text-emerald-400">₹{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* CARDS TAB */}
                  {activeTab === 'cards' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h4 className="text-md font-bold text-white">Credit & Debit Cards</h4>
                        <button
                          onClick={() => setShowCardForm(!showCardForm)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                        >
                          {showCardForm ? '✕ Close Form' : '+ Issue Debit/Credit Card'}
                        </button>
                      </div>

                      {showCardForm && (
                        <form onSubmit={handleCreateCard} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4 max-w-md">
                          <h5 className="text-xs font-bold text-gray-400 uppercase">Card Settings</h5>
                          <div className="space-y-1">
                            <label className="text-xs text-gray-400">Card Limit Amount (INR)</label>
                            <input
                              type="number"
                              placeholder="e.g. 100000"
                              value={newCard.limit_amount}
                              onChange={(e) => setNewCard({ ...newCard, limit_amount: e.target.value })}
                              required
                              min="1000"
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                            />
                          </div>
                          <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition">
                            Issue New Card
                          </button>
                        </form>
                      )}

                      {cards.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 text-sm">No cards issued to this user.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {cards.map((c) => (
                            <div key={c.card_number} className="relative p-5 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl space-y-4 overflow-hidden">
                              {/* Background chip shape */}
                              <div className="absolute right-4 top-4 opacity-10 font-bold text-5xl">VISA</div>
                              <div>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  c.status === 'active' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                                }`}>
                                  {c.status}
                                </span>
                                <h4 className="text-sm font-semibold text-gray-400 mt-3">Card Number</h4>
                                <p className="text-md font-mono font-bold text-white tracking-widest mt-1">
                                  {c.card_number.match(/.{1,4}/g).join(' ')}
                                </p>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t border-slate-800/80">
                                <div>
                                  <span className="text-[10px] text-gray-500 uppercase">Limit</span>
                                  <p className="text-sm font-bold text-gray-200">₹{c.limit_amount.toLocaleString()}</p>
                                </div>
                                <button
                                  onClick={() => handleToggleCardStatus(c.card_number, c.status)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${
                                    c.status === 'active' 
                                      ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/40' 
                                      : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/40'
                                  }`}
                                >
                                  {c.status === 'active' ? 'Block Card' : 'Activate Card'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* LOANS TAB */}
                  {activeTab === 'loans' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h4 className="text-md font-bold text-white">Active & Pending Loans</h4>
                        <button
                          onClick={() => setShowLoanForm(!showLoanForm)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                        >
                          {showLoanForm ? '✕ Close Form' : '+ Apply For Loan'}
                        </button>
                      </div>

                      {showLoanForm && (
                        <form onSubmit={handleCreateLoan} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4 max-w-md">
                          <h5 className="text-xs font-bold text-gray-400 uppercase">Loan Requirements</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs text-gray-400">Loan Amount (INR)</label>
                              <input
                                type="number"
                                placeholder="e.g. 500000"
                                value={newLoan.amount}
                                onChange={(e) => setNewLoan({ ...newLoan, amount: e.target.value })}
                                required
                                min="10000"
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-gray-400">Interest Rate (%)</label>
                              <input
                                type="number"
                                step="0.1"
                                placeholder="e.g. 8.5"
                                value={newLoan.interest_rate}
                                onChange={(e) => setNewLoan({ ...newLoan, interest_rate: e.target.value })}
                                required
                                min="1"
                                max="30"
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                              />
                            </div>
                          </div>
                          <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition">
                            Submit Loan Request
                          </button>
                        </form>
                      )}

                      {loans.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 text-sm">No loan history for this user.</div>
                      ) : (
                        <div className="space-y-3">
                          {loans.map((l) => (
                            <div key={l.loan_id} className="p-4 bg-slate-900/30 border border-slate-800 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 font-mono">ID: {l.loan_id.slice(0, 8)}...</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                    l.status === 'approved' ? 'bg-emerald-950 text-emerald-400' :
                                    l.status === 'rejected' ? 'bg-rose-950 text-rose-400' : 'bg-amber-950 text-amber-400'
                                  }`}>
                                    {l.status}
                                  </span>
                                </div>
                                <div className="text-sm font-semibold text-gray-200">
                                  ₹{l.amount.toLocaleString('en-IN')} @ {l.interest_rate}% Interest Rate
                                </div>
                              </div>
                              
                              {l.status === 'pending' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleUpdateLoanStatus(l.loan_id, 'approved')}
                                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[10px] font-bold uppercase transition"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleUpdateLoanStatus(l.loan_id, 'rejected')}
                                    className="px-2.5 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded text-[10px] font-bold uppercase transition"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* FIXED DEPOSITS TAB */}
                  {activeTab === 'fds' && (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h4 className="text-md font-bold text-white">Fixed Deposit accounts (FD)</h4>
                        <button
                          onClick={() => setShowFdForm(!showFdForm)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
                        >
                          {showFdForm ? '✕ Close Form' : '+ Open Fixed Deposit'}
                        </button>
                      </div>

                      {showFdForm && (
                        <form onSubmit={handleCreateFd} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4 max-w-md">
                          <h5 className="text-xs font-bold text-gray-400 uppercase">FD Terms</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs text-gray-400">Principal Deposit (INR)</label>
                              <input
                                type="number"
                                placeholder="e.g. 50000"
                                value={newFd.amount}
                                onChange={(e) => setNewFd({ ...newFd, amount: e.target.value })}
                                required
                                min="5000"
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-gray-400">Rate of Interest (%)</label>
                              <input
                                type="number"
                                step="0.05"
                                placeholder="e.g. 6.75"
                                value={newFd.interest_rate}
                                onChange={(e) => setNewFd({ ...newFd, interest_rate: e.target.value })}
                                required
                                min="1"
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                              />
                            </div>
                            <div className="space-y-1 col-span-2">
                              <label className="text-xs text-gray-400">Maturity Date</label>
                              <input
                                type="date"
                                value={newFd.maturity_date}
                                onChange={(e) => setNewFd({ ...newFd, maturity_date: e.target.value })}
                                required
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white"
                              />
                            </div>
                          </div>
                          <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition">
                            Establish Fixed Deposit Account
                          </button>
                        </form>
                      )}

                      {fds.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 text-sm">No Fixed Deposits opened.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {fds.map((f) => (
                            <div key={f.fd_id} className="p-4 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-4">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-gray-500 font-mono">ID: {f.fd_id.slice(0, 8)}...</span>
                                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-950 text-emerald-400 rounded font-bold uppercase">
                                  {f.status}
                                </span>
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs text-gray-400">Principal Deposit</div>
                                <div className="text-lg font-bold text-gray-200">₹{f.amount.toLocaleString('en-IN')}</div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-800/80">
                                <div>
                                  <span className="text-gray-500 text-[9px] uppercase">Interest</span>
                                  <p className="font-semibold text-gray-300">{f.interest_rate}% p.a.</p>
                                </div>
                                <div>
                                  <span className="text-gray-500 text-[9px] uppercase">Matures On</span>
                                  <p className="font-semibold text-gray-300 font-mono">{f.maturity_date}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TRANSACTIONS TAB */}
                  {activeTab === 'transactions' && (
                    <div className="space-y-6">
                      <h4 className="text-md font-bold text-white">Account Transaction Log</h4>
                      
                      {transactions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 text-sm">No transaction log available for user's accounts.</div>
                      ) : (
                        <div className="space-y-3">
                          {transactions.map((tx) => (
                            <div key={tx.id} className="p-4 bg-slate-950/60 border border-slate-800/60 rounded-xl flex justify-between items-center">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                    tx.type === 'deposit' ? 'bg-emerald-950 text-emerald-400' :
                                    tx.type === 'withdraw' ? 'bg-rose-950 text-rose-400' : 'bg-blue-950 text-blue-400'
                                  }`}>
                                    {tx.type}
                                  </span>
                                  <span className="text-xs text-gray-500 font-mono">TX #{tx.id} | Acc: {tx.account_number}</span>
                                </div>
                                <div className="text-xs text-gray-400 leading-relaxed">
                                  {tx.from_account && <span>From: <strong className="font-mono text-gray-300">{tx.from_account}</strong> </span>}
                                  {tx.to_account && <span>To: <strong className="font-mono text-gray-300">{tx.to_account}</strong></span>}
                                </div>
                                <div className="text-[10px] text-gray-500">{tx.timestamp}</div>
                              </div>
                              <span className={`text-md font-bold ${
                                tx.type === 'deposit' ? 'text-emerald-400' :
                                tx.type === 'withdraw' ? 'text-rose-400' : 'text-gray-200'
                              }`}>
                                {tx.type === 'deposit' ? '+' : '-' } ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center text-gray-500 p-8 text-center">
            <div className="text-4xl mb-3">🏦</div>
            <h3 className="text-md font-bold text-gray-300">No User Selected</h3>
            <p className="text-xs text-gray-500 max-w-sm mt-1">Select a user profile from the left sidebar to manage bank accounts, loans, credit cards, or perform KYC reviews.</p>
          </div>
        )}
      </div>

    </div>
  );
}

export default UserManagement;
