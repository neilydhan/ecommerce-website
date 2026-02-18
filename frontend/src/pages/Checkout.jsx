import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../components/CheckoutForm';
import SavedPaymentMethods from '../components/SavedPaymentMethods';
import axios from 'axios';
import '../Checkout.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const cart = location.state?.cart || [];
  
  const [shippingOption, setShippingOption] = useState('standard');
  
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [finalAmount, setFinalAmount] = useState(0);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [error, setError] = useState('');
  
  const [customerId, setCustomerId] = useState(localStorage.getItem('customerId'));
  const [customerEmail, setCustomerEmail] = useState(localStorage.getItem('customerEmail'));
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [selectedSavedMethod, setSelectedSavedMethod] = useState(null);
  const [isChargingSaved, setIsChargingSaved] = useState(false);
  const [showSavedMethods, setShowSavedMethods] = useState(false);
  
  // ← NEW: Email collection state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [tempEmail, setTempEmail] = useState('');
  const [tempName, setTempName] = useState('');
  const [wantToSave, setWantToSave] = useState(false);

  const SHIPPING_COSTS = {
    standard: 5,
    express: 15
  };

  useEffect(() => {
    if (cart.length === 0) {
      navigate('/');
    }
  }, [cart, navigate]);

  useEffect(() => {
    if (customerId) {
      loadSavedPaymentMethods();
    }
  }, [customerId]);

  const loadSavedPaymentMethods = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/customer-payment-methods/${customerId}`
      );
      setSavedPaymentMethods(response.data.paymentMethods);
      if (response.data.paymentMethods.length > 0) {
        setShowSavedMethods(true);
      }
    } catch (err) {
      console.error('Error loading saved payment methods:', err);
    }
  };

  const clearStoredCustomer = () => {
    localStorage.removeItem('customerId');
    localStorage.removeItem('customerEmail');
    setCustomerId(null);
    setCustomerEmail(null);
    setSavedPaymentMethods([]);
    setShowSavedMethods(false);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = SHIPPING_COSTS[shippingOption];
  const displayTotal = subtotal + shippingCost;

  const chargeWithSavedMethod = async (paymentMethodId) => {
    setIsChargingSaved(true);
    setError('');
    
    try {
      const items = cart.map(item => ({
        priceId: item.priceId,
        quantity: item.quantity
      }));

      const response = await axios.post(
        'http://localhost:5000/charge-saved-payment-method',
        {
          customer_id: customerId,
          payment_method_id: paymentMethodId,
          items,
          shipping_option: shippingOption
        }
      );

      navigate(`/payment-success?payment_intent=${response.data.paymentIntentId}`);
      
    } catch (err) {
      console.error('Error charging saved method:', err);
      setError(err.response?.data?.error || 'Failed to process payment. Please try again.');
    } finally {
      setIsChargingSaved(false);
    }
  };

  // ← NEW: Handle email form submission
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setIsCreatingIntent(true);
    setError('');
    
    try {
      let finalCustomerId = customerId;
      
      // Check if email matches existing customer
      if (customerId && customerEmail === tempEmail) {
        // Same customer
        console.log('Using existing customer:', customerId);
        finalCustomerId = customerId;
      } else if (tempEmail) {
        // Create/find customer by email
        console.log('Creating/finding customer for:', tempEmail);
        
        const customerResponse = await axios.post(
          'http://localhost:5000/create-customer',
          { email: tempEmail, name: tempName }
        );
        
        finalCustomerId = customerResponse.data.customerId;
        
        // Save customer info
        localStorage.setItem('customerId', finalCustomerId);
        localStorage.setItem('customerEmail', tempEmail);
        setCustomerId(finalCustomerId);
        setCustomerEmail(tempEmail);
        
        console.log('Customer:', finalCustomerId);
      }
      
      // NOW create Payment Intent with customer already attached
      const items = cart.map(item => ({
        priceId: item.priceId,
        quantity: item.quantity
      }));

      const response = await axios.post(
        'http://localhost:5000/create-payment-intent',
        {
          items,
          shipping_option: shippingOption,
          customer_id: finalCustomerId,  // ← Customer attached from the start!
          save_payment_method: wantToSave
        }
      );

      setClientSecret(response.data.clientSecret);
      setPaymentIntentId(response.data.paymentIntentId);
      setFinalAmount(response.data.amount);
      setShowEmailForm(false);
      
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to initialize payment. Please try again.');
    } finally {
      setIsCreatingIntent(false);
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

  if (cart.length === 0) {
    return (
      <div className="checkout-page">
        <div className="checkout-loading">
          <h2>Redirecting to shop...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-header">
          <h1>Larry's Gym Checkout</h1>
          <p>Complete your purchase</p>
          {customerEmail && (
            <p className="current-customer">
              Signed in as: {customerEmail}
              <button className="sign-out-btn" onClick={clearStoredCustomer}>
                Use different account
              </button>
            </p>
          )}
        </div>

        <div className="checkout-content">
          <div className="order-summary">
            <h2>Order Summary</h2>
            
            {cart.map(item => (
              <div key={item.productId} className="summary-item">
                <div className="summary-item-details">
                  <span className="summary-item-name">{item.productName}</span>
                  <span className="summary-item-qty">x{item.quantity}</span>
                </div>
                <span className="summary-item-price">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}

            <div className="summary-subtotal">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            {!clientSecret && !selectedSavedMethod && (
              <div className="shipping-section">
                <h3>Shipping Method</h3>
                
                <label className={`shipping-option ${shippingOption === 'standard' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="shipping"
                    value="standard"
                    checked={shippingOption === 'standard'}
                    onChange={(e) => setShippingOption(e.target.value)}
                  />
                  <div className="shipping-details">
                    <div className="shipping-name">
                      <span className="shipping-icon">📦</span>
                      Standard Shipping
                    </div>
                    <div className="shipping-time">5-7 business days</div>
                  </div>
                  <div className="shipping-price">${SHIPPING_COSTS.standard.toFixed(2)}</div>
                </label>

                <label className={`shipping-option ${shippingOption === 'express' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="shipping"
                    value="express"
                    checked={shippingOption === 'express'}
                    onChange={(e) => setShippingOption(e.target.value)}
                  />
                  <div className="shipping-details">
                    <div className="shipping-name">
                      <span className="shipping-icon">🚀</span>
                      Express Shipping
                    </div>
                    <div className="shipping-time">1-2 business days</div>
                  </div>
                  <div className="shipping-price">${SHIPPING_COSTS.express.toFixed(2)}</div>
                </label>
              </div>
            )}

            {(clientSecret || selectedSavedMethod) && (
              <div className="summary-item">
                <span>Shipping ({shippingOption})</span>
                <span>${shippingCost.toFixed(2)}</span>
              </div>
            )}

            <div className="summary-total">
              <span>Total</span>
              <span className="total-amount">
                ${(clientSecret || selectedSavedMethod ? finalAmount || displayTotal : displayTotal).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="payment-section">
            <h2>Payment Information</h2>
            
            {error && (
              <div className="error-message">
                <div className="error">{error}</div>
              </div>
            )}
            
            {!clientSecret && !selectedSavedMethod && !showEmailForm ? (
              <div className="payment-initialize">
                {showSavedMethods && savedPaymentMethods.length > 0 && (
                  <SavedPaymentMethods
                    paymentMethods={savedPaymentMethods}
                    onSelect={setSelectedSavedMethod}
                    onUseNewCard={() => setShowSavedMethods(false)}
                  />
                )}
                
                {!showSavedMethods && (
                  <>
                    <div className="pre-payment-summary">
                      <p><strong>Selected Shipping:</strong> {shippingOption === 'express' ? 'Express' : 'Standard'} (${shippingCost.toFixed(2)})</p>
                      <p><strong>Order Total:</strong> ${displayTotal.toFixed(2)}</p>
                    </div>
                    <p className="payment-note">
                      Review your order and shipping selection, then proceed to enter payment details.
                    </p>
                    <button 
                      className="initialize-payment-btn"
                      onClick={() => setShowEmailForm(true)}
                      disabled={isCreatingIntent}
                    >
                      Proceed to Payment
                    </button>
                    
                    {savedPaymentMethods.length > 0 && (
                      <button 
                        className="show-saved-methods-link"
                        onClick={() => setShowSavedMethods(true)}
                      >
                        Use a saved payment method
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : !clientSecret && !selectedSavedMethod && showEmailForm ? (
              // ← Email collection form
              <div className="email-collection-form">
                <h3>Your Information</h3>
                <form onSubmit={handleEmailSubmit}>
                  <div className="form-section">
                    <label htmlFor="temp-name">Full Name *</label>
                    <input
                      id="temp-name"
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      placeholder="John Doe"
                      required
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-section">
                    <label htmlFor="temp-email">Email *</label>
                    <input
                      id="temp-email"
                      type="email"
                      value={tempEmail}
                      onChange={(e) => setTempEmail(e.target.value)}
                      placeholder="john@example.com"
                      required
                      className="form-input"
                    />
                  </div>
                  
                  <div className="save-payment-section">
                    <label className="save-payment-checkbox">
                      <input
                        type="checkbox"
                        checked={wantToSave}
                        onChange={(e) => setWantToSave(e.target.checked)}
                      />
                      <span className="checkbox-label">
                        💾 Save my information for faster checkout next time
                      </span>
                    </label>
                    <p className="save-payment-note">
                      {wantToSave 
                        ? 'Your card details will be securely saved. Only card payments can be saved.'
                        : 'You can use any payment method including PayNow, GrabPay, etc.'
                      }
                    </p>
                  </div>
                  
                  <button 
                    type="submit" 
                    className="initialize-payment-btn"
                    disabled={isCreatingIntent}
                  >
                    {isCreatingIntent ? 'Preparing...' : 'Continue to Payment'}
                  </button>
                  
                  <button 
                    type="button"
                    className="show-saved-methods-link"
                    onClick={() => setShowEmailForm(false)}
                  >
                    ← Back
                  </button>
                </form>
              </div>
            ) : selectedSavedMethod ? (
              <div className="saved-method-confirmation">
                <div className="selected-method-display">
                  <h3>Selected Payment Method</h3>
                  <div className="saved-method-card">
                    <span className="card-brand">{selectedSavedMethod.brand.toUpperCase()}</span>
                    <span className="card-number">•••• {selectedSavedMethod.last4}</span>
                    <span className="card-expiry">Exp: {selectedSavedMethod.exp_month}/{selectedSavedMethod.exp_year}</span>
                  </div>
                </div>
                
                <button 
                  className="pay-button"
                  onClick={() => chargeWithSavedMethod(selectedSavedMethod.id)}
                  disabled={isChargingSaved}
                >
                  {isChargingSaved ? 'Processing...' : `Pay $${displayTotal.toFixed(2)}`}
                </button>
                
                <button 
                  className="change-method-link"
                  onClick={() => setSelectedSavedMethod(null)}
                  disabled={isChargingSaved}
                >
                  Choose a different payment method
                </button>
              </div>
            ) : (
              <Elements options={options} stripe={stripePromise}>
                <CheckoutForm 
                  amount={finalAmount} 
                  shippingOption={shippingOption}
                  paymentIntentId={paymentIntentId}
                  email={tempEmail}
                  name={tempName}
                />
              </Elements>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;