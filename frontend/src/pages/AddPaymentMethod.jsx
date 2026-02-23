import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import '../AddPaymentMethod.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Form Component (inside Elements provider)
const SetupForm = ({ setupIntentId, customerId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      console.log('Confirming setup intent...');

      // Confirm the Setup Intent
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/setup-complete?setup_intent=${setupIntentId}`,
          payment_method_data: {
            billing_details: {
              name: name
            }
          }
        },
        redirect: 'if_required'  // Only redirect if necessary (3D Secure)
      });

      if (error) {
        console.error('Setup error:', error);
        setMessage(error.message);
      } else if (setupIntent && setupIntent.status === 'succeeded') {
        console.log('Setup succeeded:', setupIntent);
        
        // Set as default if requested
        if (setAsDefault) {
          await axios.post('http://localhost:5000/set-default-payment-method', {
            customer_id: customerId,
            payment_method_id: setupIntent.payment_method
          });
        }
        
        // Redirect to profile
        navigate('/profile?added=success');
      }
    } catch (err) {
      console.error('Error during setup:', err);
      setMessage('An error occurred. Please try again.');
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="setup-form">
      <div className="form-section">
        <label htmlFor="name">Cardholder Name *</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          required
          className="form-input"
        />
      </div>

      <div className="form-section">
        <label>Card Information</label>
        <PaymentElement />
      </div>

      <div className="default-checkbox-section">
        <label className="default-checkbox">
          <input
            type="checkbox"
            checked={setAsDefault}
            onChange={(e) => setSetAsDefault(e.target.checked)}
          />
          <span className="checkbox-label">
            ⭐ Set as default payment method for invoices
          </span>
        </label>
        <p className="default-note">
          This card will be automatically used for future charges and subscriptions.
        </p>
      </div>

      {message && <div className="setup-message error">{message}</div>}

      <button 
        type="submit" 
        disabled={isLoading || !stripe || !elements}
        className="save-button"
      >
        {isLoading ? 'Saving...' : 'Save Payment Method'}
      </button>

      <div className="secure-notice">
        🔒 No charges will be made. We're only saving your card details.
      </div>
    </form>
  );
};

// Main Add Payment Method Page
const AddPaymentMethod = () => {
  const navigate = useNavigate();
  
  const [customerId, setCustomerId] = useState(localStorage.getItem('customerId'));
  const [customerEmail, setCustomerEmail] = useState(localStorage.getItem('customerEmail'));
  const [customerName, setCustomerName] = useState(localStorage.getItem('customerName'));
  
  const [clientSecret, setClientSecret] = useState('');
  const [setupIntentId, setSetupIntentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // New customer form (if not logged in)
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  useEffect(() => {
    if (customerId) {
      createSetupIntent();
    } else {
      setLoading(false);
    }
  }, [customerId]);

  const createSetupIntent = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Creating Setup Intent for customer:', customerId);
      
      const response = await axios.post(
        'http://localhost:5000/create-setup-intent',
        { customer_id: customerId }
      );

      setClientSecret(response.data.clientSecret);
      setSetupIntentId(response.data.setupIntentId);
      setLoading(false);
    } catch (err) {
      console.error('Error creating setup intent:', err);
      setError('Failed to initialize. Please try again.');
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setIsCreatingCustomer(true);
    setError('');
    
    try {
      console.log('Creating customer:', newEmail);
      
      const response = await axios.post(
        'http://localhost:5000/create-customer',
        { email: newEmail, name: newName }
      );
      
      const newCustomerId = response.data.customerId;
      
      // Save to localStorage
      localStorage.setItem('customerId', newCustomerId);
      localStorage.setItem('customerEmail', newEmail);
      localStorage.setItem('customerName', newName);
      
      setCustomerId(newCustomerId);
      setCustomerEmail(newEmail);
      setCustomerName(newName);
      
      // This will trigger useEffect to create Setup Intent
      
    } catch (err) {
      console.error('Error creating customer:', err);
      setError('Failed to create account. Please try again.');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#667eea',
      colorBackground: '#ffffff',
      colorText: '#30313d',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      borderRadius: '8px',
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  // If no customer, show customer creation form
  if (!customerId) {
    return (
      <div className="add-payment-page">
        <div className="add-payment-container">
          <div className="page-header">
            <h1>Create Account</h1>
            <p>Save your payment information for faster checkout</p>
            <Link to="/" className="back-link">← Back to Shop</Link>
          </div>

          {error && (
            <div className="error-message">
              <div className="error">{error}</div>
            </div>
          )}

          <div className="customer-form-card">
            <h2>Your Information</h2>
            <form onSubmit={handleCreateCustomer} className="customer-form">
              <div className="form-section">
                <label htmlFor="new-name">Full Name *</label>
                <input
                  id="new-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-section">
                <label htmlFor="new-email">Email *</label>
                <input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                  className="form-input"
                />
              </div>

              <button 
                type="submit"
                className="save-button"
                disabled={isCreatingCustomer}
              >
                {isCreatingCustomer ? 'Creating Account...' : 'Continue'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="add-payment-page">
        <div className="add-payment-loading">
          <h2>Preparing form...</h2>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="add-payment-page">
        <div className="add-payment-error">
          <h2>Error</h2>
          <p>{error}</p>
          <Link to="/profile" className="button">Back to Profile</Link>
        </div>
      </div>
    );
  }

  // Main form with Setup Intent
  return (
    <div className="add-payment-page">
      <div className="add-payment-container">
        <div className="page-header">
          <h1>Add Payment Method</h1>
          <p>Save a card for faster checkout</p>
          <Link to="/profile" className="back-link">← Back to Profile</Link>
        </div>

        <div className="customer-info-display">
          <p><strong>Account:</strong> {customerEmail}</p>
        </div>

        <div className="setup-form-card">
          {clientSecret && (
            <Elements options={options} stripe={stripePromise}>
              <SetupForm 
                setupIntentId={setupIntentId}
                customerId={customerId}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddPaymentMethod;