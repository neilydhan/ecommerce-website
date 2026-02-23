import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Shop from './pages/Shop';
import Checkout from './pages/Checkout';
import PaymentSuccess from './pages/PaymentSuccess';
import './App.css';
import Profile from './pages/Profile';
import AddPaymentMethod from './pages/AddPaymentMethod'; 
import SetupComplete from './pages/SetupComplete';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Shop />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/add-payment-method" element={<AddPaymentMethod />} /> 
          <Route path="/setup-complete" element={<SetupComplete />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;