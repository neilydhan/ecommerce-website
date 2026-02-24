import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import '../BrowseTrainers.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const STRIPE_PK = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_51QkqpNB4rwWpXxB1RhJqOzCLwzkXh6PaOBgZI4pAoGPAOCWd8KEwRhh9jFyxxB3zvFLNXHzWnFW5eJcJF0Q8vHb300X7zILsIh';

// Payment Form Component
function TrainerPaymentForm({ trainer, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isElementReady, setIsElementReady] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      console.error('Stripe or Elements not loaded');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/trainer-payment-success?trainer=${trainer.id}`,
        },
      });

      if (submitError) {
        setError(submitError.message);
        setLoading(false);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <h3>Book Session with {trainer.name}</h3>
      <p className="session-details">1-hour Personal Training Session - ${trainer.price}</p>

      <PaymentElement
        onReady={() => setIsElementReady(true)}
        onLoadError={(error) => {
          console.error('PaymentElement load error:', error);
          setError('Failed to load payment form. Please try again.');
        }}
      />

      {error && <div className="error-message">{error}</div>}

      <div className="payment-buttons">
        <button
          type="button"
          onClick={onCancel}
          className="cancel-button"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || !isElementReady || loading}
          className="pay-button"
        >
          {loading ? 'Processing...' : !isElementReady ? 'Loading...' : `Pay $${trainer.price}`}
        </button>
      </div>
    </form>
  );
}

function BrowseTrainers() {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [stripePromise, setStripePromise] = useState(null);
  const navigate = useNavigate();

  const customerId = localStorage.getItem('customerId');

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/connected-accounts`);

      // Filter for active trainers only (only need charges_enabled)
      const activeTrainers = response.data.accounts.filter(
        account => account.charges_enabled
      );

      // Fetch detailed info for each trainer
      const trainersWithDetails = await Promise.all(
        activeTrainers.map(async (account) => {
          try {
            const detailsResponse = await axios.get(`${API_URL}/connected-account/${account.id}`);
            return {
              id: account.id,
              email: account.email,
              name: detailsResponse.data.individual_name || detailsResponse.data.business_name || account.email,
              price: 100.00, // $100 for 1-hour session
              specialties: ['Weight Training', 'Cardio', 'Nutrition'],
              rating: 4.8,
              sessions: Math.floor(Math.random() * 50) + 10
            };
          } catch (error) {
            console.error('Error fetching trainer details:', error);
            return null;
          }
        })
      );

      setTrainers(trainersWithDetails.filter(t => t !== null));
    } catch (error) {
      console.error('Error fetching trainers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSession = async (trainer) => {
    // Check if customer exists
    if (!customerId) {
      const name = prompt('Please enter your name:');
      const email = prompt('Please enter your email:');

      if (!name || !email) {
        alert('Name and email are required to book a session');
        return;
      }

      try {
        const customerResponse = await axios.post(`${API_URL}/create-customer`, {
          name,
          email
        });

        localStorage.setItem('customerId', customerResponse.data.customerId);
      } catch (error) {
        console.error('Error creating customer:', error);
        alert('Failed to create customer profile');
        return;
      }
    }

    // Create payment intent
    try {
      const response = await axios.post(`${API_URL}/create-trainer-payment`, {
        trainer_account_id: trainer.id,
        customer_id: localStorage.getItem('customerId'),
        amount: 10000 // $100.00 in cents
      });

      // Load Stripe with the connected account ID (required for direct charges)
      const stripe = await loadStripe(STRIPE_PK, {
        stripeAccount: trainer.id
      });

      setStripePromise(Promise.resolve(stripe));
      setClientSecret(response.data.clientSecret);
      setSelectedTrainer(trainer);
    } catch (error) {
      console.error('Error creating payment:', error);
      alert('Failed to initiate payment. Please try again.');
    }
  };

  const handleCancelBooking = () => {
    setSelectedTrainer(null);
    setClientSecret('');
    setStripePromise(null);
  };

  if (loading) {
    return (
      <div className="browse-trainers-page">
        <Header />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading trainers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="browse-trainers-page">
      <Header />

      <div className="browse-container">
        <h1>💪 Personal Trainers</h1>
        <p className="browse-subtitle">Book a 1-hour session with our certified trainers</p>

        {selectedTrainer && clientSecret && stripePromise ? (
          <div className="payment-modal">
            <div className="modal-backdrop" onClick={handleCancelBooking}></div>
            <div className="modal-content">
              <Elements
                stripe={stripePromise}
                options={{ clientSecret }}
              >
                <TrainerPaymentForm
                  trainer={selectedTrainer}
                  onSuccess={() => navigate('/trainer-payment-success')}
                  onCancel={handleCancelBooking}
                />
              </Elements>
            </div>
          </div>
        ) : null}

        {trainers.length === 0 ? (
          <div className="no-trainers-container">
            <div className="no-trainers-card">
              <h2>No Trainers Available Yet</h2>
              <p>We're currently onboarding personal trainers to our platform.</p>
              <p>Check back soon!</p>
            </div>
          </div>
        ) : (
          <div className="trainers-grid">
            {trainers.map((trainer) => (
              <div key={trainer.id} className="trainer-card">
                <div className="trainer-avatar">
                  {trainer.name.charAt(0).toUpperCase()}
                </div>
                <h3>{trainer.name}</h3>
                <div className="trainer-rating">
                  ⭐ {trainer.rating} ({trainer.sessions} sessions)
                </div>
                <div className="trainer-specialties">
                  {trainer.specialties.map((specialty, index) => (
                    <span key={index} className="specialty-badge">
                      {specialty}
                    </span>
                  ))}
                </div>
                <div className="trainer-price">
                  ${trainer.price}/hour
                </div>
                <button
                  onClick={() => handleBookSession(trainer)}
                  className="book-button"
                >
                  Book Session
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="info-section">
          <h3>ℹ️ How it works:</h3>
          <ol>
            <li>Browse our certified personal trainers</li>
            <li>Click "Book Session" to reserve a 1-hour training</li>
            <li>Complete payment securely with Stripe</li>
            <li>Trainer will contact you to schedule your session</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default BrowseTrainers;
