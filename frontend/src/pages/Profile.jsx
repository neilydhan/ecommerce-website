import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  
  const [customerId, setCustomerId] = useState(localStorage.getItem('customerId'));
  const [customerEmail, setCustomerEmail] = useState(localStorage.getItem('customerEmail'));
  const [customerName, setCustomerName] = useState(localStorage.getItem('customerName'));
  
  const [customerData, setCustomerData] = useState(null);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Redirect if not logged in (no customer ID)
    if (!customerId) {
      navigate('/');
      return;
    }

    loadCustomerData();
  }, [customerId, navigate]);

  const loadCustomerData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch customer details from Stripe
      const customerResponse = await axios.get(
        `http://localhost:5000/customer-details/${customerId}`
      );
      setCustomerData(customerResponse.data);
      
      // Update localStorage with fresh data
      localStorage.setItem('customerName', customerResponse.data.name || '');
      localStorage.setItem('customerEmail', customerResponse.data.email || '');
      
      // Fetch saved payment methods
      const paymentMethodsResponse = await axios.get(
        `http://localhost:5000/customer-payment-methods/${customerId}`
      );
      setSavedPaymentMethods(paymentMethodsResponse.data.paymentMethods);
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading customer data:', err);
      setError('Failed to load profile. Please try again.');
      setLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId) => {
    if (!window.confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      await axios.delete(
        `http://localhost:5000/payment-method/${paymentMethodId}`
      );
      
      // Refresh payment methods
      setSavedPaymentMethods(prev => 
        prev.filter(pm => pm.id !== paymentMethodId)
      );
      
      alert('Payment method removed successfully');
    } catch (err) {
      console.error('Error deleting payment method:', err);
      alert('Failed to remove payment method');
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('customerId');
    localStorage.removeItem('customerEmail');
    localStorage.removeItem('customerName');
    navigate('/');
  };

  const getCardBrandIcon = (brand) => {
    const icons = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳',
      default: '💳'
    };
    return icons[brand.toLowerCase()] || icons.default;
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <h2>Loading profile...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="profile-error">
          <h2>Error</h2>
          <p>{error}</p>
          <Link to="/" className="button">Return to Shop</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {/* Header */}
        <div className="profile-header">
          <h1>My Profile</h1>
          <Link to="/" className="back-to-shop-link">
            ← Back to Shop
          </Link>
        </div>

        {/* Customer Information Card */}
        <div className="profile-section">
          <div className="section-header">
            <h2>👤 Account Information</h2>
          </div>
          
          <div className="info-card">
            <div className="info-row">
              <span className="info-label">Name:</span>
              <span className="info-value">{customerData?.name || 'Not provided'}</span>
            </div>
            
            <div className="info-row">
              <span className="info-label">Email:</span>
              <span className="info-value">{customerData?.email}</span>
            </div>
            
            <div className="info-row">
              <span className="info-label">Customer ID:</span>
              <span className="info-value customer-id">{customerId}</span>
            </div>
          </div>
          
          <button className="sign-out-button" onClick={handleSignOut}>
            Sign Out
          </button>
        </div>

        {/* Saved Payment Methods Card */}
        <div className="profile-section">
          <div className="section-header">
            <h2>💳 Saved Payment Methods</h2>
            <Link to="/checkout" className="add-payment-method-link">
              + Add New
            </Link>
          </div>
          
          {savedPaymentMethods.length === 0 ? (
            <div className="empty-state">
              <p className="empty-icon">💳</p>
              <p className="empty-text">No saved payment methods yet</p>
              <p className="empty-subtext">
                Add a payment method during checkout to save it for future purchases
              </p>
              <Link to="/" className="button">
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="payment-methods-list">
              {savedPaymentMethods.map((method) => (
                <div key={method.id} className="payment-method-card">
                  <div className="payment-method-info">
                    <span className="card-icon">{getCardBrandIcon(method.brand)}</span>
                    <div className="card-details">
                      <span className="card-brand-text">{method.brand.toUpperCase()}</span>
                      <span className="card-number">•••• •••• •••• {method.last4}</span>
                      <span className="card-expiry">
                        Expires {method.exp_month}/{method.exp_year}
                      </span>
                    </div>
                  </div>
                  
                  <button 
                    className="delete-payment-method-btn"
                    onClick={() => handleDeletePaymentMethod(method.id)}
                    title="Remove payment method"
                  >
                    🗑️ Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;