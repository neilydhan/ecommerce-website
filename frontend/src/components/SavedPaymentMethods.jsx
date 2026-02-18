import React from 'react';

const SavedPaymentMethods = ({ paymentMethods, onSelect, onUseNewCard }) => {
  const getCardIcon = (brand) => {
    const icons = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳',
      default: '💳'
    };
    return icons[brand.toLowerCase()] || icons.default;
  };

  return (
    <div className="saved-payment-methods">
      <h3>💾 Saved Payment Methods</h3>
      <p className="saved-methods-subtitle">Choose a saved card for faster checkout</p>
      
      <div className="saved-methods-list">
        {paymentMethods.map((method) => (
          <button
            key={method.id}
            className="saved-method-item"
            onClick={() => onSelect(method)}
          >
            <span className="method-icon">{getCardIcon(method.brand)}</span>
            <div className="method-details">
              <span className="method-brand">{method.brand.toUpperCase()}</span>
              <span className="method-number">•••• •••• •••• {method.last4}</span>
            </div>
            <span className="method-expiry">
              {method.exp_month}/{method.exp_year}
            </span>
          </button>
        ))}
      </div>
      
      <button className="use-new-card-btn" onClick={onUseNewCard}>
        + Use a new card
      </button>
    </div>
  );
};

export default SavedPaymentMethods;