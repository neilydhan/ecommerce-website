import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import '../Membership.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Subscription Confirmation Form
const SubscriptionConfirmForm = ({ clientSecret, subscriptionId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/subscription-success?subscription_id=${subscriptionId}`,
      },
    });

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="subscription-form">
      <div className="form-section">
        <label>Payment Method</label>
        <PaymentElement />
      </div>

      {message && <div className="payment-message error">{message}</div>}

      <button 
        type="submit" 
        disabled={isLoading || !stripe || !elements}
        className="subscribe-button"
      >
        {isLoading ? 'Processing...' : 'Start Subscription'}
      </button>

      <div className="secure-notice">
        🔒 Your payment information is secure
      </div>
    </form>
  );
};

// Main Membership Page
const Membership = () => {
  const navigate = useNavigate();
  
  const [customerId, setCustomerId] = useState(localStorage.getItem('customerId'));
  const [plans, setPlans] = useState([]);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [currentSubscriptions, setCurrentSubscriptions] = useState([]);
  
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [subscriptionId, setSubscriptionId] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [customerId]);

  const loadData = async () => {
    setLoading(true);
    
    try {
        // Load subscription plans
        const plansResponse = await axios.get('http://localhost:5000/api/subscription-plans');
        setPlans(plansResponse.data.plans);
        
        // Load customer data if logged in
        if (customerId) {
            try {
                // Load saved payment methods
                const pmResponse = await axios.get(
                `http://localhost:5000/customer-payment-methods/${customerId}`
                );
                setSavedPaymentMethods(pmResponse.data.paymentMethods);
            } catch (err) {
                console.error('Error loading payment methods:', err);
                // Don't fail completely if payment methods can't load
            }
            
            try {
                // Load current subscriptions
                const subsResponse = await axios.get(
                `http://localhost:5000/customer-subscriptions/${customerId}`
                );
                setCurrentSubscriptions(subsResponse.data.subscriptions || []);
            } catch (err) {
                console.error('Error loading subscriptions:', err);
                // Set empty array if subscriptions can't load
                setCurrentSubscriptions([]);
            }
        }
        
        setLoading(false);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load membership plans');
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan) => {
    if (!customerId) {
      // Redirect to create account
      alert('Please create an account first');
      navigate('/add-payment-method');
      return;
    }
    
    setSelectedPlan(plan);
    setError('');
  };

  const handleSubscribe = async () => {
    if (!selectedPaymentMethod && savedPaymentMethods.length > 0) {
      setError('Please select a payment method');
      return;
    }
    
    setIsCreatingSubscription(true);
    setError('');
    
    try {
      console.log('Creating subscription:', {
        customer: customerId,
        plan: selectedPlan.name,
        paymentMethod: selectedPaymentMethod
      });
      
      const response = await axios.post(
        'http://localhost:5000/create-subscription',
        {
          customer_id: customerId,
          price_id: selectedPlan.price.id,
          payment_method_id: selectedPaymentMethod
        }
      );

      if (response.data.clientSecret) {
        // Need payment confirmation
        setClientSecret(response.data.clientSecret);
        setSubscriptionId(response.data.subscriptionId);
      } else {
        // Subscription activated immediately
        navigate('/profile?subscription=success');
      }
      
    } catch (err) {
      console.error('Error creating subscription:', err);
      setError(err.response?.data?.error || 'Failed to create subscription');
    } finally {
      setIsCreatingSubscription(false);
    }
  };

  const getPlanIcon = (name) => {
    if (name.includes('Unlimited')) return '♾️';
    if (name.includes('Plus')) return '➕';
    return '🏋️';
  };

  const formatInterval = (interval, count) => {
    if (count === 1) {
      return interval === 'year' ? 'per year' : 'per month';
    }
    return `every ${count} ${interval}s`;
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

  if (loading) {
    return (
      <div className="membership-page">
        <div className="membership-loading">
          <h2>Loading membership plans...</h2>
        </div>
      </div>
    );
  }

  // Show payment confirmation if needed
  if (clientSecret) {
    return (
      <div className="membership-page">
        <div className="subscription-confirm-container">
          <div className="page-header">
            <h1>Confirm Subscription</h1>
            <p>Complete your {selectedPlan.name} subscription</p>
          </div>

          <div className="subscription-summary-card">
            <h3>Subscription Summary</h3>
            <div className="summary-row">
              <span>Plan:</span>
              <span className="summary-value">{selectedPlan.name}</span>
            </div>
            <div className="summary-row">
              <span>Price:</span>
              <span className="summary-value">
                ${selectedPlan.price.amount} {formatInterval(selectedPlan.price.interval, selectedPlan.price.interval_count)}
              </span>
            </div>
          </div>

          <div className="payment-form-card">
            <Elements options={options} stripe={stripePromise}>
              <SubscriptionConfirmForm 
                clientSecret={clientSecret}
                subscriptionId={subscriptionId}
              />
            </Elements>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="membership-page">
      <div className="membership-container">
        <div className="page-header">
          <h1>💪 Membership Plans</h1>
          <p>Choose the perfect plan for your fitness journey</p>
          <Link to="/" className="back-link">← Back to Shop</Link>
        </div>

        {error && (
          <div className="error-message">
            <div className="error">{error}</div>
          </div>
        )}

        {/* Current Subscriptions */}
        {currentSubscriptions.length > 0 && (
          <div className="current-subscriptions-section">
            <h2>Your Active Subscriptions</h2>
            <div className="current-subs-list">
              {currentSubscriptions.filter(sub => sub.status === 'active').map(sub => (
                <div key={sub.id} className="current-sub-card">
                  <div className="sub-info">
                    <h3>{sub.product_name}</h3>
                    <p>${sub.amount} / {sub.interval}</p>
                    <p className="sub-status">Status: {sub.status}</p>
                  </div>
                  <Link to="/profile" className="manage-link">
                    Manage →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Plans */}
        <div className="plans-section">
          <h2>Available Plans</h2>
          <div className="plans-grid">
            {plans.map(plan => {
              const isSubscribed = currentSubscriptions.some(
                sub => sub.status === 'active' && sub.product_name === plan.name
              );

              return (
                <div 
                  key={plan.id} 
                  className={`plan-card ${selectedPlan?.id === plan.id ? 'selected' : ''}`}
                >
                  <div className="plan-icon">{getPlanIcon(plan.name)}</div>
                  <h3 className="plan-name">{plan.name}</h3>
                  <p className="plan-description">{plan.description}</p>
                  
                  <div className="plan-price">
                    <span className="price-amount">${plan.price.amount}</span>
                    <span className="price-interval">
                      {formatInterval(plan.price.interval, plan.price.interval_count)}
                    </span>
                  </div>

                  {plan.features.length > 0 && (
                    <ul className="plan-features">
                      {plan.features.map((feature, idx) => (
                        <li key={idx}>✓ {feature.trim()}</li>
                      ))}
                    </ul>
                  )}

                  {isSubscribed ? (
                    <button className="plan-button subscribed" disabled>
                      ✓ Subscribed
                    </button>
                  ) : (
                    <button 
                      className="plan-button"
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isCreatingSubscription}
                    >
                      Select Plan
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscription Confirmation Modal */}
        {selectedPlan && !clientSecret && (
          <div className="subscription-modal-overlay" onClick={() => setSelectedPlan(null)}>
            <div className="subscription-modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setSelectedPlan(null)}>✕</button>
              
              <h2>Subscribe to {selectedPlan.name}</h2>
              
              <div className="modal-plan-details">
                <p className="modal-price">
                  ${selectedPlan.price.amount} {formatInterval(selectedPlan.price.interval, selectedPlan.price.interval_count)}
                </p>
                <p className="modal-description">{selectedPlan.description}</p>
              </div>

              {savedPaymentMethods.length > 0 ? (
                <>
                  <h3>Select Payment Method</h3>
                  <div className="payment-methods-selection">
                    {savedPaymentMethods.map(method => (
                      <label 
                        key={method.id}
                        className={`payment-method-option ${selectedPaymentMethod === method.id ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="payment-method"
                          value={method.id}
                          checked={selectedPaymentMethod === method.id}
                          onChange={() => setSelectedPaymentMethod(method.id)}
                        />
                        <div className="method-info">
                          <span className="method-brand">{method.brand.toUpperCase()}</span>
                          <span className="method-number">•••• {method.last4}</span>
                        </div>
                        {method.is_default && <span className="default-badge-small">DEFAULT</span>}
                      </label>
                    ))}
                  </div>

                  <button 
                    className="subscribe-now-button"
                    onClick={handleSubscribe}
                    disabled={isCreatingSubscription || !selectedPaymentMethod}
                  >
                    {isCreatingSubscription ? 'Creating...' : 'Subscribe Now'}
                  </button>
                </>
              ) : (
                <div className="no-payment-method">
                  <p>You need to add a payment method first</p>
                  <Link to="/add-payment-method" className="add-pm-button">
                    Add Payment Method
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Membership;