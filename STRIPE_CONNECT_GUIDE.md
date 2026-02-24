# Stripe Connect Marketplace Guide

This guide walks you through testing the Personal Trainer marketplace powered by Stripe Connect.

## Overview

Larry's Gym has added a marketplace feature that allows personal trainers to offer their services directly to customers. The implementation uses:

- **Stripe Connect Standard Accounts**: Trainers get full access to their own Stripe Dashboard
- **Direct Charges**: Payments go directly to the trainer's account (no platform fees)
- **Account Links**: Stripe-hosted onboarding for quick trainer setup

## Quick Start

### 1. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python app.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

**Terminal 3 - Webhooks (Optional):**
```bash
stripe listen --forward-to localhost:5000/webhook
```

### 2. Onboard Trainers (Admin Flow)

1. Navigate to: http://localhost:3000/admin/trainers
2. Enter a trainer's email address (use a real email you can access)
3. Click "Onboard Trainer"
4. You'll be redirected to Stripe's hosted onboarding flow
5. Complete the following steps:
   - **Business Details**: Enter business name (or use personal name)
   - **Personal Information**: Name, date of birth, address
   - **Verification**: May require ID upload (can skip in test mode)
   - **Bank Account**: Add test bank account details:
     - Routing: 110000000
     - Account: 000123456789
6. After completion, you'll be redirected to the Trainer Dashboard

**Onboard 2-3 trainers** to populate the marketplace.

### 3. Browse and Book Trainers (Customer Flow)

1. Click "💪 Personal Trainers" in the header navigation
2. Browse available trainers (only fully onboarded trainers are shown)
3. Click "Book Session" on a trainer
4. If you don't have a customer profile, you'll be prompted for name/email
5. Complete payment using Stripe test card:
   - Card: 4242 4242 4242 4242
   - Expiry: Any future date
   - CVC: Any 3 digits
6. You'll be redirected to the success page

### 4. View Trainer Dashboard

After onboarding, trainers can access their dashboard at:
http://localhost:3000/trainer-dashboard

The dashboard shows:
- Account status (charges enabled, payouts enabled)
- Service offering details
- Quick links to Stripe Dashboard
- Instructions for managing payouts

## Testing Scenarios

### Scenario 1: Complete Onboarding Flow
1. Go to `/admin/trainers`
2. Onboard a new trainer with test email
3. Complete Stripe onboarding
4. Verify trainer appears in admin list with "Active" status
5. Check trainer dashboard shows correct account details

### Scenario 2: Customer Books Session
1. Browse trainers at `/browse-trainers`
2. Book a session with an active trainer
3. Complete payment with test card
4. Verify payment success page appears
5. Check backend logs for payment confirmation

### Scenario 3: Direct Charge Verification
1. Complete a booking
2. Log into Stripe Dashboard (dashboard.stripe.com)
3. Switch to the connected account (trainer's account)
4. Verify the $100 payment appears in their account
5. Confirm no application fees were taken

### Scenario 4: Incomplete Onboarding
1. Start trainer onboarding
2. Close the window before completing
3. Trainer should appear in admin list with "Incomplete" status
4. Admin can click "🔄 Refresh Link" to generate new onboarding link
5. Complete onboarding via refreshed link

## Architecture Details

### Connected Account Flow
```
1. Admin creates connected account
   POST /create-connected-account { email }
   → Returns: { account_id }

2. Generate account link
   POST /create-account-link { account_id }
   → Returns: { url } (Stripe-hosted onboarding)

3. Trainer completes onboarding
   → Stripe redirects to: /trainer-dashboard?account_id={ID}

4. Webhook receives account.updated
   → Backend logs account status changes
```

### Payment Flow
```
1. Customer clicks "Book Session"
   → Frontend checks for customer ID

2. Create payment intent on connected account
   POST /create-trainer-payment {
     trainer_account_id,
     customer_id,
     amount: 10000  // $100.00
   }
   → Payment Intent created with stripe_account parameter

3. Customer completes payment
   → Stripe Elements handles payment confirmation

4. Redirect to success page
   → /trainer-payment-success
```

### Direct Charges vs Destination Charges

This implementation uses **Direct Charges**:
- Payment Intent created ON the connected account (`stripe_account` parameter)
- Money goes directly to trainer
- Trainer sees customer in their Stripe Dashboard
- Platform (Larry's Gym) has no visibility into payment details
- No application fees (trainer receives 100%)

**If you wanted Destination Charges** (for taking platform fees):
- Create Payment Intent on platform account
- Use `transfer_data: { destination: trainer_account_id }`
- Add `application_fee_amount` for platform cut

## Troubleshooting

### Trainer Not Showing in Browse Page
**Issue**: Trainer completed onboarding but not visible
**Solution**: Check account status:
- Go to `/admin/trainers`
- Verify status shows "✅ Active"
- Both `charges_enabled` and `payouts_enabled` must be true

### Account Link Expired
**Issue**: "This link has expired" error
**Solution**: Account links expire after a few minutes
- Return to `/admin/trainers`
- Click "🔄 Refresh Link" for the trainer
- Complete onboarding with new link

### Payment Failed
**Issue**: Cannot complete booking payment
**Solution**: Verify:
- Trainer account is active (charges_enabled = true)
- Using correct test card: 4242 4242 4242 4242
- Customer profile exists (check localStorage for customerId)
- Check browser console for errors

### Webhook Events Not Received
**Issue**: Not seeing `account.updated` events
**Solution**:
- Ensure `stripe listen` is running in Terminal 3
- Webhook secret is set in `backend/.env`
- Check Stripe CLI output for forwarded events

## Next Steps

To enhance the marketplace, consider adding:

1. **Application Fees**: Take a percentage of each booking
2. **Trainer Profiles**: Let trainers add bio, specialties, photos
3. **Booking System**: Schedule-based availability and booking
4. **Reviews**: Customer ratings and reviews for trainers
5. **Payouts Dashboard**: Show trainers their earnings and payout schedule
6. **Multiple Services**: Different session types (30min, 60min, packages)

## Resources

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Account Types Comparison](https://stripe.com/docs/connect/accounts)
- [Direct Charges Guide](https://stripe.com/docs/connect/direct-charges)
- [Account Links API](https://stripe.com/docs/api/account_links)
