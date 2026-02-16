import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PaymentElement,
  AddressElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

const CheckoutForm = ({ amount, shippingOption, paymentIntentId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    console.log('Confirming payment...');

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success?payment_intent=${paymentIntentId}`,
        receipt_email: email,
        payment_method_data: {
          billing_details: {
            name: name,
            email: email,
          }
        }
      },
    });

    if (error) {
      console.error('Payment error:', error);
      if (error.type === 'card_error' || error.type === 'validation_error') {
        setMessage(error.message);
      } else {
        setMessage('An unexpected error occurred.');
      }
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="checkout-form">
      <div className="form-section">
        <label htmlFor="name">Full Name *</label>
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
        <label htmlFor="email">Email *</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="john@example.com"
          required
          className="form-input"
        />
      </div>

      <div className="form-section">
        <label>Shipping Address</label>
        <AddressElement options={{ mode: 'shipping' }} />
      </div>

      <div className="form-section">
        <label>Payment Information</label>
        <PaymentElement />
      </div>

      {message && <div className="payment-message error">{message}</div>}

      <div className="payment-summary">
        <p><strong>Shipping:</strong> {shippingOption === 'express' ? 'Express (1-2 days)' : 'Standard (5-7 days)'}</p>
        <p><strong>Total Amount:</strong> ${amount.toFixed(2)}</p>
      </div>

      <button 
        type="submit" 
        disabled={isLoading || !stripe || !elements}
        className="pay-button"
      >
        {isLoading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </button>

      <div className="secure-notice">
        🔒 Your payment information is encrypted and secure
      </div>
    </form>
  );
};

export default CheckoutForm;