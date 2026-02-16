import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '../components/CheckoutForm';
import axios from 'axios';
import '../Checkout.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const cart = location.state?.cart || [];
  
  // Shipping selection
  const [shippingOption, setShippingOption] = useState('standard');
  
  // Payment Intent state - NOT created yet!
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [finalAmount, setFinalAmount] = useState(0);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [error, setError] = useState('');

  const SHIPPING_COSTS = {
    standard: 5,
    express: 15
  };

  useEffect(() => {
    if (cart.length === 0) {
      navigate('/');
    }
  }, [cart, navigate]);

  // Calculate displayed totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = SHIPPING_COSTS[shippingOption];
  const displayTotal = subtotal + shippingCost;

  // Create Payment Intent when customer is ready
  const proceedToPayment = async () => {
    setIsCreatingIntent(true);
    setError('');
    
    try {
      console.log('Creating Payment Intent with:', {
        items: cart,
        shipping: shippingOption
      });
      
      const items = cart.map(item => ({
        priceId: item.priceId,
        quantity: item.quantity
      }));

      const response = await axios.post(
        'http://localhost:5000/create-payment-intent',
        {
          items,
          shipping_option: shippingOption
        }
      );

      console.log('Payment Intent created:', response.data);
      
      setClientSecret(response.data.clientSecret);
      setPaymentIntentId(response.data.paymentIntentId);
      setFinalAmount(response.data.amount);
      
    } catch (err) {
      console.error('Error creating payment intent:', err);
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
        </div>

        <div className="checkout-content">
          {/* Order Summary */}
          <div className="order-summary">
            <h2>Order Summary</h2>
            
            {/* Products */}
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

            {/* Subtotal */}
            <div className="summary-subtotal">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            {/* Shipping Selection (only if payment not started) */}
            {!clientSecret && (
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

            {/* Shipping cost line (after intent created) */}
            {clientSecret && (
              <div className="summary-item">
                <span>Shipping ({shippingOption})</span>
                <span>${shippingCost.toFixed(2)}</span>
              </div>
            )}

            {/* Total */}
            <div className="summary-total">
              <span>Total</span>
              <span className="total-amount">
                ${(clientSecret ? finalAmount : displayTotal).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Section */}
          <div className="payment-section">
            <h2>Payment Information</h2>
            
            {error && (
              <div className="error-message">
                <div className="error">{error}</div>
              </div>
            )}
            
            {!clientSecret ? (
              // Before Payment Intent creation
              <div className="payment-initialize">
                <div className="pre-payment-summary">
                  <p><strong>Selected Shipping:</strong> {shippingOption === 'express' ? 'Express' : 'Standard'} (${shippingCost.toFixed(2)})</p>
                  <p><strong>Order Total:</strong> ${displayTotal.toFixed(2)}</p>
                </div>
                <p className="payment-note">
                  Review your order and shipping selection above, then proceed to enter payment details.
                </p>
                <button 
                  className="initialize-payment-btn"
                  onClick={proceedToPayment}
                  disabled={isCreatingIntent}
                >
                  {isCreatingIntent ? 'Preparing Payment...' : 'Proceed to Payment'}
                </button>
              </div>
            ) : (
              // After Payment Intent created - show Payment Element
              <Elements options={options} stripe={stripePromise}>
                <CheckoutForm 
                  amount={finalAmount} 
                  shippingOption={shippingOption}
                  paymentIntentId={paymentIntentId}
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