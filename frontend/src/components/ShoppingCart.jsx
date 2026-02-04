import React from 'react';

const ShoppingCart = ({ cart, onRemoveItem, onCheckout, isLoading }) => {
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="cart-section">
      <h2 className="cart-title">🛒 Shopping Cart</h2>
      
      <div className="cart-items">
        {cart.length === 0 ? (
          <p className="cart-empty">Your cart is empty</p>
        ) : (
          <>
            {cart.map(item => (
              <div key={item.productId} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.productName}</div>
                  <div className="cart-item-details">
                    {item.quantity}x ${item.price.toFixed(2)} = $
                    {(item.quantity * item.price).toFixed(2)}
                  </div>
                </div>
                <button
                  className="cart-item-remove"
                  onClick={() => onRemoveItem(item.productId)}
                >
                  Remove
                </button>
              </div>
            ))}
            
            <div className="cart-total">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
            
            <button
              className="checkout-btn"
              onClick={onCheckout}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Proceed to Checkout 🔒'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ShoppingCart;