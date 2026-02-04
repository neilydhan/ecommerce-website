import React, { useState } from 'react';

const productIcons = {
  'T-shirt': '👕',
  'Sweatshirt': '🧥',
  'Water bottle': '💧'
};

const ProductCard = ({ product, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);

  const handleQuantityChange = (delta) => {
    setQuantity(prev => Math.max(1, Math.min(99, prev + delta)));
  };

  const handleAddToCart = () => {
    onAddToCart({
      productId: product.id,
      productName: product.name,
      price: product.price.amount,
      priceId: product.price.id,
      quantity: quantity
    });
    setQuantity(1);
  };

  return (
    <div className="product-card">
      <div className="product-image">
        {product.images && product.images.length > 0 ? (
          <img 
            src={product.images[0]} 
            alt={product.name}
            className="product-image-img"
          />
        ) : (
          <span className="product-image-placeholder">
            {productIcons[product.name] || '🏋️'}
          </span>
        )}
      </div>
      <h3 className="product-name">{product.name}</h3>
      <p className="product-description">
        {product.description || 'Premium quality gym merchandise'}
      </p>
      <div className="product-price">
        ${product.price.amount.toFixed(2)}
      </div>
      
      <div className="quantity-selector">
        <button 
          className="quantity-btn"
          onClick={() => handleQuantityChange(-1)}
        >
          -
        </button>
        <input 
          type="number" 
          className="quantity-input"
          value={quantity}
          readOnly
        />
        <button 
          className="quantity-btn"
          onClick={() => handleQuantityChange(1)}
        >
          +
        </button>
      </div>
      
      <button 
        className="add-to-cart-btn"
        onClick={handleAddToCart}
      >
        Add to Cart
      </button>
    </div>
  );
};

export default ProductCard;