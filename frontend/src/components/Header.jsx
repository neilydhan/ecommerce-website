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
      
      <nav className="header-nav">
        <Link to="/membership" className="nav-link">
          🏋️ Memberships
        </Link>
        
        {customerId && (
          <Link to="/profile" className="nav-link profile-link">
            👤 My Profile
          </Link>
        )}
      </nav>
    </header>
  );
};

export default Header;