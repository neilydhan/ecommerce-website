import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import '../TrainerDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function TrainerDashboard() {
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get('account_id');

  const [trainer, setTrainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (accountId) {
      // Store account ID in localStorage for future visits
      localStorage.setItem('trainerAccountId', accountId);
      fetchTrainerData(accountId);
    } else {
      // Check if there's a stored account ID
      const storedAccountId = localStorage.getItem('trainerAccountId');
      if (storedAccountId) {
        fetchTrainerData(storedAccountId);
      } else {
        setError('No trainer account found');
        setLoading(false);
      }
    }
  }, [accountId]);

  const fetchTrainerData = async (accId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/connected-account/${accId}`);
      setTrainer(response.data);
    } catch (err) {
      console.error('Error fetching trainer data:', err);
      setError('Failed to load trainer information');
    } finally {
      setLoading(false);
    }
  };

  const openStripeDashboard = () => {
    // In production, Stripe provides a dashboard link
    // For testing, we'll show the account ID
    alert(`Your Stripe Account ID: ${trainer.id}\n\nLog in to dashboard.stripe.com with your Stripe account to view your full dashboard.`);
  };

  if (loading) {
    return (
      <div className="trainer-dashboard-page">
        <Header />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !trainer) {
    return (
      <div className="trainer-dashboard-page">
        <Header />
        <div className="error-container">
          <h2>⚠️ Error</h2>
          <p>{error || 'Trainer account not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trainer-dashboard-page">
      <Header />

      <div className="dashboard-container">
        <h1>🎉 Welcome to Your Trainer Dashboard!</h1>

        <div className="welcome-card">
          <div className="success-icon">✅</div>
          <h2>Onboarding Complete!</h2>
          <p>Your account has been successfully set up on Larry's Gym marketplace.</p>
        </div>

        <div className="trainer-info-card">
          <h3>Your Account Details</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Account ID:</span>
              <span className="info-value account-id">{trainer.id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Email:</span>
              <span className="info-value">{trainer.email}</span>
            </div>
            {trainer.individual_name && (
              <div className="info-item">
                <span className="info-label">Name:</span>
                <span className="info-value">{trainer.individual_name}</span>
              </div>
            )}
            {trainer.business_name && (
              <div className="info-item">
                <span className="info-label">Business Name:</span>
                <span className="info-value">{trainer.business_name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="status-card">
          <h3>Account Status</h3>
          <div className="status-grid">
            <div className="status-item">
              <div className={`status-indicator ${trainer.details_submitted ? 'active' : 'inactive'}`}>
                {trainer.details_submitted ? '✅' : '❌'}
              </div>
              <div className="status-text">
                <strong>Details Submitted</strong>
                <p>{trainer.details_submitted ? 'Complete' : 'Incomplete'}</p>
              </div>
            </div>
            <div className="status-item">
              <div className={`status-indicator ${trainer.charges_enabled ? 'active' : 'inactive'}`}>
                {trainer.charges_enabled ? '✅' : '❌'}
              </div>
              <div className="status-text">
                <strong>Charges Enabled</strong>
                <p>{trainer.charges_enabled ? 'Ready to accept payments' : 'Not yet enabled'}</p>
              </div>
            </div>
            <div className="status-item">
              <div className={`status-indicator ${trainer.payouts_enabled ? 'active' : 'inactive'}`}>
                {trainer.payouts_enabled ? '✅' : '❌'}
              </div>
              <div className="status-text">
                <strong>Payouts Enabled</strong>
                <p>{trainer.payouts_enabled ? 'Can receive funds' : 'Not yet enabled'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="services-card">
          <h3>Your Services</h3>
          <div className="service-item">
            <div className="service-icon">🏋️</div>
            <div className="service-details">
              <h4>1-hour Personal Training Session</h4>
              <p>Individual training session at Larry's Gym facilities</p>
              <div className="service-price">$100.00 / hour</div>
            </div>
          </div>
        </div>

        <div className="actions-card">
          <h3>Quick Actions</h3>
          <div className="actions-grid">
            <button onClick={openStripeDashboard} className="action-button primary">
              <span className="button-icon">📊</span>
              <span className="button-text">
                <strong>Open Stripe Dashboard</strong>
                <small>View payments, payouts, and analytics</small>
              </span>
            </button>
            <a
              href="https://dashboard.stripe.com/test/connect/accounts/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="action-button secondary"
            >
              <span className="button-icon">💳</span>
              <span className="button-text">
                <strong>Manage Payouts</strong>
                <small>Configure bank account and payout schedule</small>
              </span>
            </a>
          </div>
        </div>

        <div className="info-card">
          <h3>ℹ️ What's Next?</h3>
          <ul>
            <li>Customers can now book sessions with you through the marketplace</li>
            <li>Payments go directly to your Stripe account</li>
            <li>You have full access to your Stripe Dashboard to manage your business</li>
            <li>Set up automatic payouts to your bank account in the Stripe Dashboard</li>
            <li>Track your earnings, view customer payments, and generate reports</li>
          </ul>
        </div>

        <div className="support-card">
          <h3>Need Help?</h3>
          <p>For questions about your account or payments:</p>
          <ul>
            <li>📧 Email: support@larrysgym.com</li>
            <li>📞 Phone: (555) 123-4567</li>
            <li>💬 Visit us at: Larry's Gym, 123 Fitness Street</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default TrainerDashboard;
