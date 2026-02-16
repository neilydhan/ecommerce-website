import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [paymentDetails, setPaymentDetails] = useState(null);

  const paymentIntentId = searchParams.get('payment_intent');
  const clientSecret = searchParams.get('payment_intent_client_secret');

  useEffect(() => {
    if (paymentIntentId) {
      checkPaymentStatus();
    }
  }, [paymentIntentId]);

  const checkPaymentStatus = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/payment-intent-status/${paymentIntentId}`
      );
      
      setPaymentDetails(response.data);
      
      if (response.data.status === 'succeeded') {
        setStatus('success');
      } else if (response.data.status === 'processing') {
        setStatus('processing');
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="success-page">
        <div className="success-container">
          <h2>Verifying your payment...</h2>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="success-page">
        <div className="success-container">
          <div className="success-icon">❌</div>
          <h1>Payment Failed</h1>
          <p>Your payment was not successful. Please try again.</p>
          <Link to="/" className="button">Return to Shop</Link>
        </div>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className="success-page">
        <div className="success-container">
          <div className="success-icon">⏳</div>
          <h1>Payment Processing</h1>
          <p>Your payment is being processed. We'll send you an email confirmation.</p>
          <Link to="/" className="button">Return to Shop</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="success-page">
      <div className="success-container">
        <div className="success-icon">✅</div>
        <h1>Payment Successful!</h1>
        
        <div className="success-message">
          Thank you for your purchase at Larry's Gym!
        </div>

        {paymentDetails && (
          <div className="order-details">
            <p><strong>Amount Paid:</strong> ${paymentDetails.amount.toFixed(2)}</p>
            <p><strong>Shipping Method:</strong> {paymentDetails.metadata?.shipping_option === 'express' ? 'Express (1-2 days)' : 'Standard (5-7 days)'}</p>
            <p><strong>Payment Status:</strong> Completed</p>
          </div>
        )}
        
        <Link to="/" className="button">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
};

export default PaymentSuccess;