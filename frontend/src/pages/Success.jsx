import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';

const Success = () => {
  const [searchParams] = useSearchParams();
  const [orderDetails, setOrderDetails] = useState(null);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Define verifySession inside useEffect to avoid dependency warning
    const verifySession = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/verify-session/${sessionId}`);
        setOrderDetails(response.data);
      } catch (err) {
        console.error('Verification error:', err);
      }
    };

    if (sessionId) {
      verifySession();
    }
  }, [sessionId]); // Now only sessionId is needed in dependency array

  return (
    <div className="success-page">
      <div className="success-container">
        <div className="success-icon">✅</div>
        <h1>Order Successful!</h1>
        
        <div className="success-message">
          Thank you for your purchase!<br />
          {orderDetails?.customer_email && (
            <>A confirmation has been sent to {orderDetails.customer_email}</>
          )}
        </div>

        {orderDetails?.amount_total && (
          <div className="order-details">
            <p><strong>Total Amount:</strong> ${orderDetails.amount_total.toFixed(2)}</p>
            <p><strong>Payment Status:</strong> {orderDetails.status}</p>
          </div>
        )}
        
        <Link to="/" className="button">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
};

export default Success;