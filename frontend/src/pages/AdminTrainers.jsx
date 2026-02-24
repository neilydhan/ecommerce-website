import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../components/Header';
import '../AdminTrainers.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function AdminTrainers() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [trainers, setTrainers] = useState([]);

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      const response = await axios.get(`${API_URL}/connected-accounts`);
      setTrainers(response.data.accounts);
    } catch (error) {
      console.error('Error fetching trainers:', error);
    }
  };

  const handleOnboardTrainer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      // Step 1: Create connected account
      const accountResponse = await axios.post(`${API_URL}/create-connected-account`, {
        email: email
      });

      const accountId = accountResponse.data.account_id;

      // Step 2: Create account link for onboarding
      const linkResponse = await axios.post(`${API_URL}/create-account-link`, {
        account_id: accountId
      });

      // Redirect to Stripe-hosted onboarding
      window.location.href = linkResponse.data.url;

    } catch (error) {
      console.error('Error onboarding trainer:', error);
      setMessage(`Error: ${error.response?.data?.error || error.message}`);
      setLoading(false);
    }
  };

  const refreshAccountLink = async (accountId) => {
    try {
      const response = await axios.post(`${API_URL}/create-account-link`, {
        account_id: accountId
      });

      window.location.href = response.data.url;
    } catch (error) {
      console.error('Error refreshing account link:', error);
      alert(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getStatusBadge = (trainer) => {
    if (trainer.charges_enabled && trainer.payouts_enabled) {
      return <span className="status-badge status-active">✅ Active</span>;
    } else if (trainer.details_submitted) {
      return <span className="status-badge status-pending">⏳ Pending</span>;
    } else {
      return <span className="status-badge status-incomplete">❌ Incomplete</span>;
    }
  };

  return (
    <div className="admin-trainers-page">
      <Header />

      <div className="admin-container">
        <h1>🔧 Admin: Trainer Management</h1>
        <p className="admin-subtitle">Onboard and manage personal trainers on the marketplace</p>

        {/* Onboarding Form */}
        <div className="onboarding-section">
          <h2>Onboard New Trainer</h2>
          <form onSubmit={handleOnboardTrainer} className="onboarding-form">
            <div className="form-group">
              <label>Trainer Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trainer@example.com"
                required
                disabled={loading}
              />
            </div>

            <button type="submit" disabled={loading} className="onboard-button">
              {loading ? 'Creating Account...' : 'Onboard Trainer'}
            </button>
          </form>

          {message && (
            <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}
        </div>

        {/* Trainers List */}
        <div className="trainers-list-section">
          <h2>Connected Trainers ({trainers.length})</h2>

          {trainers.length === 0 ? (
            <p className="no-trainers">No trainers onboarded yet.</p>
          ) : (
            <div className="trainers-table">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Account ID</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {trainers.map((trainer) => (
                    <tr key={trainer.id}>
                      <td>{trainer.email}</td>
                      <td className="account-id">{trainer.id}</td>
                      <td>{getStatusBadge(trainer)}</td>
                      <td>{formatDate(trainer.created)}</td>
                      <td>
                        {!trainer.details_submitted && (
                          <button
                            onClick={() => refreshAccountLink(trainer.id)}
                            className="refresh-button"
                          >
                            🔄 Refresh Link
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-info">
          <h3>ℹ️ How it works:</h3>
          <ol>
            <li>Enter trainer's email and click "Onboard Trainer"</li>
            <li>Trainer is redirected to Stripe-hosted onboarding</li>
            <li>Trainer completes identity verification and bank details</li>
            <li>Once approved, trainer can accept payments directly</li>
            <li>Trainer gets full access to their Stripe Dashboard</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default AdminTrainers;
