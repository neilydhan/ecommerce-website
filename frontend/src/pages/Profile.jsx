import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import '../Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [customerId, setCustomerId] = useState(localStorage.getItem('customerId'));
  const [customerData, setCustomerData] = useState(null);
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!customerId) {
      navigate('/');
      return;
    }

    loadCustomerData();
    
    // Show success message if redirected from add payment method
    if (searchParams.get('added') === 'success') {
      setSuccessMessage('Payment method added successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [customerId, navigate, searchParams]);

  const loadCustomerData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch customer details
      const customerResponse = await axios.get(
        `http://localhost:5000/customer-details/${customerId}`
      );
      setCustomerData(customerResponse.data);
      setDefaultPaymentMethodId(customerResponse.data.default_payment_method);
      
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

  const handleSetDefault = async (paymentMethodId) => {
    try {
      await axios.post('http://localhost:5000/set-default-payment-method', {
        customer_id: customerId,
        payment_method_id: paymentMethodId
      });
      
      setDefaultPaymentMethodId(paymentMethodId);
      alert('Default payment method updated!');
    } catch (err) {
      console.error('Error setting default:', err);
      alert('Failed to set as default');
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
      
      setSavedPaymentMethods(prev => 
        prev.filter(pm => pm.id !== paymentMethodId)
      );
      
      if (paymentMethodId === defaultPaymentMethodId) {
        setDefaultPaymentMethodId(null);
      }
      
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
        <div className="profile-header">
          <h1>My Profile</h1>
          <Link to="/" className="back-to-shop-link">
            ← Back to Shop
          </Link>
        </div>

        {successMessage && (
          <div className="success-banner">
            ✅ {successMessage}
          </div>
        )}

        {/* Account Information */}
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

        {/* Saved Payment Methods */}
        <div className="profile-section">
          <div className="section-header">
            <h2>💳 Saved Payment Methods</h2>
            <Link to="/add-payment-method" className="add-payment-method-link">
              + Add New
            </Link>
          </div>
          
          {savedPaymentMethods.length === 0 ? (
            <div className="empty-state">
              <p className="empty-icon">💳</p>
              <p className="empty-text">No saved payment methods yet</p>
              <p className="empty-subtext">
                Add a payment method to save time on future purchases
              </p>
              <Link to="/add-payment-method" className="button">
                Add Payment Method
              </Link>
            </div>
          ) : (
            <div className="payment-methods-list">
              {savedPaymentMethods.map((method) => (
                <div key={method.id} className="payment-method-card">
                  <div className="payment-method-info">
                    <span className="card-icon">{getCardBrandIcon(method.brand)}</span>
                    <div className="card-details">
                      <div className="card-header">
                        <span className="card-brand-text">{method.brand.toUpperCase()}</span>
                        {method.is_default && (
                          <span className="default-badge">⭐ DEFAULT</span>
                        )}
                      </div>
                      <span className="card-number">•••• •••• •••• {method.last4}</span>
                      <span className="card-expiry">
                        Expires {method.exp_month}/{method.exp_year}
                      </span>
                    </div>
                  </div>
                  
                  <div className="payment-method-actions">
                    {!method.is_default && (
                      <button 
                        className="set-default-btn"
                        onClick={() => handleSetDefault(method.id)}
                      >
                        Set as Default
                      </button>
                    )}
                    <button 
                      className="delete-payment-method-btn"
                      onClick={() => handleDeletePaymentMethod(method.id)}
                    >
                      🗑️ Remove
                    </button>
                  </div>
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