import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [subscriptionData, setSubscriptionData] = useState(null);
  
  const subscriptionId = searchParams.get('subscription_id');
  const customerId = localStorage.getItem('customerId');

  useEffect(() => {
    if (subscriptionId && customerId) {
      verifySubscription();
    }
  }, [subscriptionId, customerId]);

  const verifySubscription = async () => {
    try {
      // You might want to add a verify endpoint, or just show success
      setStatus('success');
    } catch (err) {
      console.error('Error verifying subscription:', err);
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="success-page">
        <div className="success-container">
          <h2>Activating your subscription...</h2>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="success-page">
        <div className="success-container">
          <div className="success-icon">❌</div>
          <h1>Subscription Failed</h1>
          <p>We couldn't activate your subscription. Please try again.</p>
          <Link to="/membership" className="button">Back to Membership</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="success-page">
      <div className="success-container">
        <div className="success-icon">🎉</div>
        <h1>Welcome to Larry's Gym!</h1>
        
        <div className="success-message">
          Your subscription has been activated successfully!
        </div>

        <div className="order-details">
          <p>✓ <strong>Subscription Active</strong></p>
          <p>Your membership benefits are now available.</p>
          <p>You can manage your subscription anytime from your profile.</p>
        </div>
        
        <div className="success-actions">
          <Link to="/profile" className="button">
            View Profile
          </Link>
          <Link to="/" className="button-secondary">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;