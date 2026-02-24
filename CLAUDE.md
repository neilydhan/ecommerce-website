# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Larry's Gym Shop is an e-commerce application demonstrating Stripe payment integration patterns. It's a dual-server architecture with a Flask backend (Python) and React frontend, showcasing both one-time purchases and subscription billing.

## Development Commands

### Backend (Flask)
```bash
cd backend
source venv/bin/activate  # Activate virtual environment
python app.py             # Run development server (port 5000)
python create_products.py      # Initialize one-time purchase products in Stripe
python create_subscriptions.py # Initialize subscription products in Stripe
```

### Frontend (React)
```bash
cd frontend
npm install              # Install dependencies
npm start               # Run development server (port 3000)
npm run build           # Production build
npm test               # Run tests
```

### Stripe Webhooks (Local Testing)
```bash
stripe listen --forward-to localhost:5000/webhook
stripe trigger checkout.session.completed  # Trigger test events
```

## Architecture

### Request Flow
1. Frontend (React on :3000) makes API calls to backend
2. Backend (Flask on :5000) handles Stripe API integration
3. Stripe webhooks notify backend of payment events

### Stripe Integration Patterns

**Payment Intent Pattern (Deferred)**
- Used for one-time purchases in `/checkout`
- Frontend creates Payment Intent, backend provides client secret
- Customer can optionally save payment method during checkout
- `setup_future_usage: 'off_session'` is set at Payment Intent creation time (not update)

**SetupIntent Pattern**
- Used for saving payment methods without charging (Profile page)
- Creates payment method, attaches to customer, sets as default
- Endpoint: `/create-setup-intent` and `/confirm-setup-intent`

**Subscription Pattern**
- Three tiers: Unlimited Monthly, Unlimited Annual, Plus Monthly
- Plus Monthly uses metered billing for day passes
- Payment collected on subscription creation via `payment_behavior: 'default_incomplete'`

**Stripe Connect Pattern (Marketplace)**
- Uses Standard accounts (trainers get full Stripe Dashboard access)
- Direct charges: payments go directly to connected account, no platform fees
- Account Links for Stripe-hosted onboarding flow
- Trainers sell "1-hour Personal Training Session" at fixed $100 price
- Payment intents created with `stripe_account` parameter for direct charges

### Key Backend Endpoints

**Customer Management**
- `POST /create-customer` - Creates or retrieves existing customer by email
- `GET /customer-details/<customer_id>` - Get customer info and default payment method
- `GET /customer-payment-methods/<customer_id>` - List saved payment methods with default indicator

**One-time Purchases**
- `GET /api/products` - Fetch non-subscription products only
- `POST /create-payment-intent` - Create Payment Intent with optional save_payment_method flag
- `POST /charge-saved-payment-method` - Charge existing saved payment method off-session

**Payment Methods**
- `POST /create-setup-intent` - Save payment method without charging
- `POST /confirm-setup-intent` - Set saved payment method as default
- `POST /set-default-payment-method` - Change default payment method
- `DELETE /payment-method/<payment_method_id>` - Detach payment method from customer

**Subscriptions**
- `GET /api/subscription-plans` - Fetch recurring products only
- `POST /create-subscription` - Create subscription (with optional existing payment method)
- `GET /customer-subscriptions/<customer_id>` - List all customer subscriptions
- `POST /cancel-subscription/<subscription_id>` - Cancel immediately or at period end
- `POST /report-usage` - Report metered usage for Plus membership day passes

**Stripe Connect (Marketplace)**
- `POST /create-connected-account` - Create Standard connected account for trainer
- `POST /create-account-link` - Generate account onboarding link (type: account_onboarding)
- `GET /connected-accounts` - List all connected trainer accounts (filtered by metadata.role='personal_trainer')
- `GET /connected-account/<account_id>` - Get specific trainer account details
- `POST /create-trainer-payment` - Create direct charge Payment Intent on connected account

**Webhooks**
- `POST /webhook` - Handle Stripe events (handles `payment_intent.succeeded` and `account.updated`)

### Frontend Routes

**E-commerce**
- `/` - Shop page (product catalog)
- `/checkout` - Checkout with embedded Stripe Elements
- `/payment-success` - Post-payment confirmation

**Customer Profile**
- `/profile` - Customer profile with saved payment methods
- `/add-payment-method` - Save new payment method via SetupIntent
- `/setup-complete` - Payment method save confirmation

**Memberships**
- `/membership` - Subscription plans selection
- `/subscription-success` - Post-subscription confirmation

**Marketplace (Stripe Connect)**
- `/admin/trainers` - Admin page to onboard trainers and view connected accounts
- `/browse-trainers` - Customer-facing page to browse and book trainers
- `/trainer-dashboard` - Trainer dashboard after successful onboarding
- `/trainer-payment-success` - Confirmation page after booking trainer session

### Important Configuration Details

**Stripe API Version**: `2024-11-20.acacia` (set in backend/app.py)

**Currency**: SGD (Singapore Dollars) used throughout

**Customer Creation**: Backend checks for existing customer by email before creating new one

**Product Type Separation**: `/api/products` returns only one-time purchases, `/api/subscription-plans` returns only recurring products (filtering by `price.recurring` field)

**Default Payment Method**: Used for `invoice_settings.default_payment_method`, applied to subscription invoices

**Payment Method Saving**:
- During checkout: Set `setup_future_usage: 'off_session'` on Payment Intent creation
- From profile: Use SetupIntent flow
- Both methods save payment method, but SetupIntent doesn't charge

**Stripe Connect Configuration**:
- Account type: Standard (full dashboard access for trainers)
- Charge type: Direct charges (using `stripe_account` parameter)
- Onboarding: Account Links with type='account_onboarding'
- Return URL: `/trainer-dashboard?account_id={ACCOUNT_ID}`
- Refresh URL: `/admin/trainers?refresh={ACCOUNT_ID}`
- Connected accounts filtered by `metadata.role='personal_trainer'`
- No application fees implemented (trainers receive 100% of payment)

### Environment Variables

**Backend (.env)**
- `STRIPE_SECRET_KEY` - Stripe secret key (sk_test_...)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (whsec_...)
- `PORT` - Backend port (default: 5000)

**Frontend (.env)**
- `REACT_APP_API_URL` - Backend API URL (default: http://localhost:5000)

### Testing

**Stripe Test Cards**
- Success: 4242 4242 4242 4242
- Declined: 4000 0000 0000 0002
- Use any future expiry date and any CVC

### Common Patterns

**Backend Error Handling**: Most endpoints return `jsonify({'error': str(e)})` with appropriate HTTP status codes

**Frontend State**: Uses localStorage for customer_id persistence

**Stripe Object Access**: Backend uses both attribute access (`customer.email`) and dictionary access (`customer.get('key')`) depending on object expansion

**Subscription Item Access**: When iterating subscriptions, use `sub.get('items', {})` for safe dictionary access to StripeObject fields
