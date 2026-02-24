import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Shop from './pages/Shop';
import Checkout from './pages/Checkout';
import PaymentSuccess from './pages/PaymentSuccess';
import './App.css';
import Profile from './pages/Profile';
import AddPaymentMethod from './pages/AddPaymentMethod';
import SetupComplete from './pages/SetupComplete';
import Membership from './pages/Membership';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import AdminTrainers from './pages/AdminTrainers';
import BrowseTrainers from './pages/BrowseTrainers';
import TrainerDashboard from './pages/TrainerDashboard';
import TrainerPaymentSuccess from './pages/TrainerPaymentSuccess';


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
          <Route path="/membership" element={<Membership />} />
          <Route path="/subscription-success" element={<SubscriptionSuccess />} />
          <Route path="/admin/trainers" element={<AdminTrainers />} />
          <Route path="/browse-trainers" element={<BrowseTrainers />} />
          <Route path="/trainer-dashboard" element={<TrainerDashboard />} />
          <Route path="/trainer-payment-success" element={<TrainerPaymentSuccess />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;