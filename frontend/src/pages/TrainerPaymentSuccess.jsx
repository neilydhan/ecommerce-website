import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';

function TrainerPaymentSuccess() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Header />

      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '60px 40px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>✅</div>
          <h1 style={{ color: '#333', marginBottom: '15px' }}>Booking Confirmed!</h1>
          <p style={{ color: '#666', lineHeight: '1.6', marginBottom: '30px' }}>
            Your personal training session has been successfully booked and paid for.
            The trainer will contact you shortly to schedule your session.
          </p>
          <div style={{
            background: '#f9f9f9',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '30px'
          }}>
            <h3 style={{ color: '#333', marginBottom: '10px' }}>What's Next?</h3>
            <ul style={{
              textAlign: 'left',
              color: '#666',
              lineHeight: '1.8',
              paddingLeft: '20px'
            }}>
              <li>Check your email for booking confirmation</li>
              <li>Your trainer will reach out to schedule the session</li>
              <li>Meet at Larry's Gym at your scheduled time</li>
            </ul>
          </div>
          <Link
            to="/browse-trainers"
            style={{
              display: 'inline-block',
              padding: '12px 30px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              transition: 'transform 0.2s'
            }}
          >
            Browse More Trainers
          </Link>
        </div>
      </div>
    </div>
  );
}

export default TrainerPaymentSuccess;
