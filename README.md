# Larry's Gym Shop

E-commerce website built with React (frontend) and Flask (backend), integrated with Stripe for payments.

## Features

- 🛍️ Product catalog with shopping cart
- 💳 Stripe Checkout integration
- 📱 Responsive design
- 🔒 Secure payment processing

## Tech Stack

- **Frontend:** React, Axios, React Router
- **Backend:** Python, Flask, Flask-CORS
- **Payment:** Stripe API

## Prerequisites

- Python 3.8+
- Node.js 14+
- Stripe Account ([Sign up](https://dashboard.stripe.com/register))

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/larrys-gym-shop.git
cd larrys-gym-shop
```
### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate     # On Windows

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
cp .env.example .env

# Edit .env and add your Stripe keys
# Get your keys from: https://dashboard.stripe.com/test/apikeys
nano .env  # or use your preferred editor
```
### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file from example
cp .env.example .env

# Edit if needed (default should work)
```

### 4. Create Products in Stripe
```bash
cd ../backend
source venv/bin/activate
python create_products.py
```

This creates:

T-shirt ($10)
Sweatshirt ($20)
Water bottle ($8)

### 5. Run the Application

Terminal 1 - Backend:

```bash
cd backend
source venv/bin/activate
python app.py
```

Terminal 2 - Stripe Webhooks (Optional for local testing):

```bash
stripe listen --forward-to localhost:5000/webhook
# Copy the webhook secret to backend/.env
```

Terminal 3 - Frontend:

```bash
cd frontend
npm start
```

Visit: http://localhost:3000

### Test Payments
Use Stripe test cards:

Success: 4242 4242 4242 4242
Declined: 4000 0000 0000 0002
Any future expiry date, any CVC

## Environment Variables

### Backend (.env)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Your Stripe secret key (sk_test_...) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (whsec_...) |
| `PORT` | Backend port (default: 5000) |

### Frontend (.env)

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | Backend API URL (default: http://localhost:5000) |

## Deployment

### Backend (Heroku example)

```bash
# Set environment variables
heroku config:set STRIPE_SECRET_KEY=sk_live_...
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_...

# Deploy
git push heroku main
```
### Frontend (Vercel example)
```bash
# Set environment variables in Vercel dashboard
REACT_APP_API_URL=https://your-backend-url.herokuapp.com

# Deploy
vercel --prod
```
## License
MIT