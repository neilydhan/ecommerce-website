import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import ShoppingCart from '../components/ShoppingCart';

const Shop = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/products');
      setProducts(response.data.products);
      setLoading(false);
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Failed to load products. Please refresh the page.');
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(
        cartItem => cartItem.productId === item.productId
      );

      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.productId === item.productId
            ? { ...cartItem, quantity: cartItem.quantity + item.quantity }
            : cartItem
        );
      }

      return [...prevCart, item];
    });

    showNotification(`Added ${item.quantity}x ${item.productName} to cart`);
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);

    try {
      const items = cart.map(item => ({
        priceId: item.priceId,
        quantity: item.quantity
      }));

      const response = await axios.post('http://localhost:5000/create-checkout-session', { items });
      
      // Redirect to Stripe Checkout
      window.location.href = response.data.url;
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to proceed to checkout. Please try again.');
      setCheckoutLoading(false);
    }
  };

  const showNotification = (message) => {
    // Simple notification (you could use a toast library like react-toastify)
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  return (
    <div className="container">
      <Header />
      
      <ShoppingCart
        cart={cart}
        onRemoveItem={removeFromCart}
        onCheckout={handleCheckout}
        isLoading={checkoutLoading}
      />

      {error && (
        <div className="error-message">
          <div className="error">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading products...</div>
      ) : (
        <div className="products-container">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={addToCart}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Shop;