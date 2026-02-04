import React, { useMemo, useEffect } from 'react';
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

    return axios.post('http://localhost:5000/create-checkout-session', { items })
      .then(res => res.data.clientSecret)
      .catch(err => {
        console.error('Error creating checkout session:', err);
        throw err;
      });
  }, [cart]);

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
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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
            <div className="summary-total">
              <span>Total</span>
              <span className="total-amount">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Checkout Form with Provider */}
          <div className="payment-section">
            <h2>Payment Information</h2>
            <CheckoutProvider
              stripe={stripePromise}
              options={{
                clientSecret: clientSecretPromise,
                elementsOptions: { appearance },
              }}
            >
              <CheckoutForm />
            </CheckoutProvider>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;