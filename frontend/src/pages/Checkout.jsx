import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { CheckoutProvider } from '@stripe/react-stripe-js/checkout';
import CheckoutForm from '../components/CheckoutForm';
import axios from 'axios';
import '../Checkout.css';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const cart = location.state?.cart || [];

  //Shipping option state
  const [shippingOption, setShippingOption] = useState('standard');
  const [isChangingShipping, setIsChangingShipping] = useState(false);

  // Shipping prices
  const SHIPPING_COSTS = {
    standard: 5,
    express: 15
  };

  // Check if cart is empty and redirect (using useEffect, not early return)
  useEffect(() => {
    if (cart.length === 0) {
      navigate('/');
    }
  }, [cart, navigate]);

  // Create the promise to fetch client secret
  // This must be called before any conditional returns
  const clientSecretPromise = useMemo(() => {
    if (cart.length === 0) {
      return Promise.reject(new Error('Cart is empty'));
    }

    const items = cart.map(item => ({
      priceId: item.priceId,
      quantity: item.quantity
    }));

    console.log('Creating checkout session with shipping:', shippingOption);

    return axios.post('http://localhost:5000/create-checkout-session', { 
        items,
        shipping_option: shippingOption  //Send shipping option
      })
      .then(res => {
        console.log('Checkout session created');
        setIsChangingShipping(false);
        return res.data.clientSecret;
      })
      .catch(err => {
        console.error('Error creating checkout session:', err);
        setIsChangingShipping(false);
        throw err;
      });
  }, [cart, shippingOption]);

  //Handle shipping option change
  const handleShippingChange = (option) => {
    setIsChangingShipping(true);
    setShippingOption(option);
  };

  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#667eea',
      colorBackground: '#ffffff',
      colorText: '#30313d',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      spacingUnit: '4px',
      borderRadius: '8px',
    },
  };

  // Calculate total
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = SHIPPING_COSTS[shippingOption];
  const total = subtotal + shippingCost;

  // Now we can have conditional returns after all hooks
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
            
            {/* Product Items */}
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

            {/* Shipping Options */}
            <div className="shipping-section">
              <h3>Shipping Method</h3>
              
              <label className={`shipping-option ${shippingOption === 'standard' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="shipping"
                  value="standard"
                  checked={shippingOption === 'standard'}
                  onChange={() => handleShippingChange('standard')}
                  disabled={isChangingShipping}
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
                  onChange={() => handleShippingChange('express')}
                  disabled={isChangingShipping}
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

            {/* Shipping Cost Line */}
            <div className="summary-item">
              <span>Shipping</span>
              <span>${shippingCost.toFixed(2)}</span>
            </div>

            {/* Total */}
            <div className="summary-total">
              <span>Total</span>
              <span className="total-amount">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Form */}
          <div className="payment-section">
            <h2>Payment Information</h2>
            
            {isChangingShipping ? (
              <div className="updating-message">
                <p>Updating shipping option...</p>
              </div>
            ) : (
              <CheckoutProvider
                key={shippingOption}  // ← NEW: Force re-render when shipping changes
                stripe={stripePromise}
                options={{
                  clientSecret: clientSecretPromise,
                  elementsOptions: { appearance },
                }}
              >
                <CheckoutForm />
              </CheckoutProvider>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;