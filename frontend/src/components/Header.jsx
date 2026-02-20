import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  const customerId = localStorage.getItem('customerId');

  return (
    <header className="header">
      <div className="header-content">
        <h1>Larry's Gym Shop</h1>
        <p className="subtitle">Official Merchandise & Gear</p>
      </div>
      
      {customerId && (
        <Link to="/profile" className="profile-link">
          👤 My Profile
        </Link>
      )}
    </header>
  );
};

export default Header;