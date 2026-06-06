import React, { useEffect, useState } from 'react';
import client from '../api/client.js';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', full_name: '', password: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fetch users (would need an API endpoint, for now we show registered accounts)
    setLoading(false);
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await client.post('/proxy/auth/register', {
        username: newUser.username,
        password: newUser.password,
        email: newUser.email,
        full_name: newUser.full_name,
      });
      setMessage(`✓ User ${newUser.username} created successfully (ID: ${res.data.user_id})`);
      setNewUser({ username: '', email: '', full_name: '', password: '' });
      setShowForm(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user');
    }
  };

  return (
    <div className="management-panel">
      <h2>User Management</h2>
      
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}

      <button 
        className="action-button"
        onClick={() => setShowForm(!showForm)}
      >
        {showForm ? '✕ Cancel' : '+ Create New User'}
      </button>

      {showForm && (
        <form onSubmit={handleCreateUser} className="form-box">
          <input
            type="text"
            placeholder="Username"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            required
            className="form-input"
          />
          <input
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            required
            className="form-input"
          />
          <input
            type="text"
            placeholder="Full Name"
            value={newUser.full_name}
            onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
            required
            className="form-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            required
            className="form-input"
          />
          <button type="submit" className="action-button">Create User</button>
        </form>
      )}

      <div className="info-box">
        <p>User management is available through the auth service. Register new users above.</p>
      </div>
    </div>
  );
}

export default UserManagement;
