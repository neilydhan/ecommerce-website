import React, { useState } from "react";
import {
  PaymentElement,
  BillingAddressElement,
  useCheckout
} from '@stripe/react-stripe-js/checkout';

const validateEmail = async (email, checkout) => {
  const updateResult = await checkout.updateEmail(email);
  const isValid = updateResult.type !== "error";

  return { isValid, message: !isValid ? updateResult.error.message : null };
};

const EmailInput = ({ checkout, email, setEmail, error, setError }) => {
  const handleBlur = async () => {
    if (!email) {
      return;
    }

    const { isValid, message } = await validateEmail(email, checkout);
    if (!isValid) {
      setError(message);
    }
  };

  const handleChange = (e) => {
    setError(null);
    setEmail(e.target.value);
  };

  return (
    <div className="form-section">
      <label htmlFor="email">
        Email *
      </label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={handleChange}
        onBlur={handleBlur}
        className={error ? "form-input error" : "form-input"}
      />
      {error && <div className="email-error">{error}</div>}
    </div>
  );
};

const CheckoutForm = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [message, setMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkoutState = useCheckout();

  if (checkoutState.type === 'loading') {
    return (
      <div className="checkout-loading">
        <h2>Loading checkout...</h2>
      </div>
    );
  }

  if (checkoutState.type === 'error') {
    return (
      <div className="checkout-error">
        <h2>Error</h2>
        <p>{checkoutState.error.message}</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { checkout } = checkoutState;
    setIsSubmitting(true);

    const { isValid, message } = await validateEmail(email, checkout);
    if (!isValid) {
      setEmailError(message);
      setMessage(message);
      setIsSubmitting(false);
      return;
    }

    const confirmResult = await checkout.confirm();

    if (confirmResult.type === 'error') {
      setMessage(confirmResult.error.message);
    }
    // If successful, Stripe redirects to return_url

    setIsSubmitting(false);
  };

  const { checkout } = checkoutState;
  const totalAmount = checkout.total?.total?.amount 
    ? `$${(checkout.total.total.amount / 100).toFixed(2)}`
    : 'Pay now';

  return (
    <form onSubmit={handleSubmit} className="checkout-form">
      <EmailInput
        checkout={checkout}
        email={email}
        setEmail={setEmail}
        error={emailError}
        setError={setEmailError}
      />
      
      <div className="form-section">
        <label>Billing Address</label>
        <BillingAddressElement />
      </div>
      
      <div className="form-section">
        <label>Payment</label>
        <PaymentElement id="payment-element" />
      </div>
      
      <button 
        disabled={isSubmitting} 
        className="pay-button"
        type="submit"
      >
        {isSubmitting ? 'Processing...' : `Pay ${totalAmount}`}
      </button>
      
      {message && <div className="payment-message error">{message}</div>}
      
      <div className="secure-notice">
        🔒 Your payment information is encrypted and secure
      </div>
    </form>
  );
};

export default CheckoutForm;