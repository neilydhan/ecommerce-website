import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const SetupComplete = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  
  const setupIntentId = searchParams.get('setup_intent');
  const customerId = localStorage.getItem('customerId');

  useEffect(() => {
    if (setupIntentId && customerId) {
      confirmSetup();
    } else {
      setStatus('error');
      setError('Missing setup information');
    }
  }, [setupIntentId, customerId]);

  const confirmSetup = async () => {
    try {
      console.log('Confirming setup intent:', setupIntentId);
      
      const response = await axios.post(
        'http://localhost:5000/confirm-setup-intent',
        {
          setup_intent_id: setupIntentId,
          set_as_default: true
        }
      );

      console.log('Setup confirmed:', response.data);
      setStatus('success');
    } catch (err) {
      console.error('Error confirming setup:', err);
      setError(err.response?.data?.error || 'Failed to save payment method');
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="success-page">
        <div className="success-container">
          <h2>Saving payment method...</h2>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="success-page">
        <div className="success-container">
          <div className="success-icon">❌</div>
          <h1>Failed to Save</h1>
          <p>{error}</p>
          <Link to="/profile" className="button">Back to Profile</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="success-page">
      <div className="success-container">
        <div className="success-icon">✅</div>
        <h1>Payment Method Saved!</h1>
        
        <div className="success-message">
          Your payment method has been securely saved and set as your default.
        </div>

        <div className="order-details">
          <p>⭐ <strong>Set as Default</strong></p>
          <p>This card will be used for future purchases and invoices.</p>
          <p className="info-note">💡 You can change your default payment method anytime in your profile.</p>
        </div>
        
        <Link to="/profile" className="button">
          View Profile
        </Link>
      </div>
    </div>
  );
};

export default SetupComplete;