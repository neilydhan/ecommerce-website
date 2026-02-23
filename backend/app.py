import time

from flask import Flask, jsonify, request
from flask_cors import CORS
import stripe
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
stripe.api_version = '2024-11-20.acacia'
webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')

@app.route('/create-customer', methods=['POST'])
def create_customer():
    """Create a Stripe Customer"""
    try:
        data = request.get_json()
        email = data.get('email')
        name = data.get('name')
        
        if not email:
            return jsonify({'error': 'Email required'}), 400
        
        # Check if customer already exists
        existing_customers = stripe.Customer.list(email=email, limit=1)
        
        if existing_customers.data:
            customer = existing_customers.data[0]
            print(f"✅ Found existing customer: {customer.id}")
        else:
            # Create new customer
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata={
                    'created_from': 'larrys_gym_shop'
                }
            )
            print(f"✅ Created new customer: {customer.id}")
        
        return jsonify({
            'customerId': customer.id,
            'email': customer.email
        }), 200
        
    except Exception as e:
        print(f'❌ Error creating customer: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/products', methods=['GET'])
def get_products():
    """Fetch all active one-time purchase products (exclude subscriptions)"""
    try:
        # Fetch all active products with their default prices
        products = stripe.Product.list(
            active=True,
            expand=['data.default_price']
        )
        
        # Format the response - ONLY include one-time products
        formatted_products = []
        for product in products.data:
            # Skip if no price
            if not product.default_price:
                continue
            
            # ← KEY: Skip subscription products (recurring prices)
            if hasattr(product.default_price, 'recurring') and product.default_price.recurring:
                print(f"  Skipping subscription product: {product.name}")
                continue
            
            # Only include one-time purchase products
            product_data = {
                'id': product.id,
                'name': product.name,
                'description': product.description,
                'images': product.images,
                'price': {
                    'id': product.default_price.id,
                    'amount': product.default_price.unit_amount / 100,
                    'currency': product.default_price.currency.upper()
                }
            }
            
            formatted_products.append(product_data)
        
        print(f"✅ Returning {len(formatted_products)} one-time purchase products")
        return jsonify({'products': formatted_products}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/create-payment-intent', methods=['POST'])
def create_payment_intent():
    """Create Payment Intent with customer support and save option"""
    try:
        data = request.get_json()
        items = data.get('items', [])
        shipping_option = data.get('shipping_option')
        customer_id = data.get('customer_id')
        save_payment_method = data.get('save_payment_method', False)  # ← Must receive this
        
        if not items or len(items) == 0:
            return jsonify({'error': 'Cart is empty'}), 400
        
        if not shipping_option:
            return jsonify({'error': 'Shipping option required'}), 400
        
        print(f"\n{'='*60}")
        print(f"Creating Payment Intent")
        print(f"  Customer ID: {customer_id}")
        print(f"  Save payment method: {save_payment_method}")  # ← Debug log
        print(f"{'='*60}")
        
        # Calculate total
        total_amount = 0
        items_description = []
        
        for item in items:
            price = stripe.Price.retrieve(item['priceId'])
            product = stripe.Product.retrieve(price.product)
            item_total = price.unit_amount * item['quantity']
            total_amount += item_total
            items_description.append(f"{product.name} x{item['quantity']}")
        
        shipping_costs = {'standard': 500, 'express': 1500}
        shipping_amount = shipping_costs.get(shipping_option, 500)
        total_amount += shipping_amount
        
        # Build Payment Intent parameters
        intent_params = {
            'amount': total_amount,
            'currency': 'sgd',
            'automatic_payment_methods': {'enabled': True},
            'metadata': {
                'shipping_option': shipping_option,
                'shipping_cost': shipping_amount / 100,
                'items': str(items)
            },
            'description': f"Order: {', '.join(items_description)}"
        }
        
        # Add customer and setup_future_usage HERE (at creation time)
        if customer_id:
            intent_params['customer'] = customer_id
            
            if save_payment_method:
                intent_params['setup_future_usage'] = 'off_session'  # ← Set at creation!
                print(f"  ✅ Will save payment method for future use")
        
        intent = stripe.PaymentIntent.create(**intent_params)
        
        print(f"✅ Payment Intent created: {intent.id}")
        print(f"{'='*60}\n")
        
        return jsonify({
            'clientSecret': intent.client_secret,
            'paymentIntentId': intent.id,
            'amount': total_amount / 100
        }), 200
        
    except Exception as e:
        print(f'❌ Error creating payment intent: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/charge-saved-payment-method', methods=['POST'])
def charge_saved_payment_method():
    """Charge a saved payment method"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        payment_method_id = data.get('payment_method_id')
        items = data.get('items', [])
        shipping_option = data.get('shipping_option')
        
        if not customer_id or not payment_method_id:
            return jsonify({'error': 'Customer and payment method required'}), 400
        
        # Calculate total (same as before)
        total_amount = 0
        for item in items:
            price = stripe.Price.retrieve(item['priceId'])
            total_amount += price.unit_amount * item['quantity']
        
        shipping_costs = {'standard': 500, 'express': 1500}
        total_amount += shipping_costs.get(shipping_option, 500)
        
        print(f"\n{'='*60}")
        print(f"Charging saved payment method")
        print(f"  Customer: {customer_id}")
        print(f"  Payment Method: {payment_method_id}")
        print(f"  Amount: ${total_amount/100:.2f}")
        print(f"{'='*60}")
        
        # Create and confirm payment intent with saved payment method
        intent = stripe.PaymentIntent.create(
            amount=total_amount,
            currency='sgd',
            customer=customer_id,
            payment_method=payment_method_id,
            off_session=True,  # Customer not present
            confirm=True,  # Confirm immediately
            metadata={
                'shipping_option': shipping_option,
                'items': str(items)
            }
        )
        
        print(f"✅ Payment charged: {intent.id}")
        print(f"{'='*60}\n")
        
        return jsonify({
            'success': True,
            'paymentIntentId': intent.id,
            'status': intent.status
        }), 200
        
    except stripe.error.CardError as e:
        # Card was declined
        return jsonify({'error': e.user_message}), 400
    except Exception as e:
        print(f'❌ Error charging saved payment method: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/update-payment-intent', methods=['POST'])
def update_payment_intent():
    """Update Payment Intent to add customer and save payment method"""
    try:
        data = request.get_json()
        payment_intent_id = data.get('payment_intent_id')
        customer_id = data.get('customer_id')
        setup_future_usage = data.get('setup_future_usage')
        
        print(f"\n{'='*60}")
        print(f"Updating Payment Intent: {payment_intent_id}")
        print(f"  Adding customer: {customer_id}")
        print(f"  Setting setup_future_usage: {setup_future_usage}")
        print(f"{'='*60}")
        
        # Update the Payment Intent
        update_params = {
            'customer': customer_id
        }
        
        if setup_future_usage:
            update_params['setup_future_usage'] = setup_future_usage
        
        intent = stripe.PaymentIntent.modify(
            payment_intent_id,
            **update_params
        )
        
        print(f"✅ Payment Intent updated successfully")
        print(f"{'='*60}\n")
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        print(f'❌ Error updating payment intent: {str(e)}')
        return jsonify({'error': str(e)}), 500
    
@app.route('/payment-intent-status/<intent_id>', methods=['GET'])
def payment_intent_status(intent_id):
    """Get payment intent status"""
    try:
        intent = stripe.PaymentIntent.retrieve(intent_id)
        
        return jsonify({
            'status': intent.status,
            'amount': intent.amount / 100,
            'metadata': intent.metadata,
            'shipping_option': intent.metadata.get('shipping_option')
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/webhook', methods=['POST'])
def webhook():
    """Handle Stripe webhooks"""
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except ValueError as e:
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        return jsonify({'error': 'Invalid signature'}), 400
    
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        
        print('\n' + '='*60)
        print('💰 PAYMENT SUCCEEDED')
        print('='*60)
        print(f"Payment Intent ID: {payment_intent.get('id')}")
        print(f"Amount: ${payment_intent.get('amount', 0) / 100:.2f}")
        print(f"Shipping Option: {payment_intent.get('metadata', {}).get('shipping_option')}")
        print(f"Shipping Cost: ${payment_intent.get('metadata', {}).get('shipping_cost')}")
        print('='*60 + '\n')
        
        # TODO: Fulfill order with correct shipping method
    
    return jsonify({'success': True}), 200


@app.route('/payment-method/<payment_method_id>', methods=['DELETE'])
def delete_payment_method(payment_method_id):
    """Detach/delete a payment method"""
    try:
        print(f"Deleting payment method: {payment_method_id}")
        
        # Detach payment method from customer
        payment_method = stripe.PaymentMethod.detach(payment_method_id)
        
        print(f"✅ Payment method {payment_method_id} removed")
        
        return jsonify({
            'success': True,
            'payment_method_id': payment_method.id
        }), 200
        
    except Exception as e:
        print(f'❌ Error deleting payment method: {str(e)}')
        return jsonify({'error': str(e)}), 500

@app.route('/create-setup-intent', methods=['POST'])
def create_setup_intent():
    """Create Setup Intent to save payment method without charging"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        
        if not customer_id:
            return jsonify({'error': 'Customer ID required'}), 400
        
        print(f"\n{'='*60}")
        print(f"Creating Setup Intent (Save Payment Method)")
        print(f"  Customer ID: {customer_id}")
        print(f"{'='*60}")
        
        # Create Setup Intent
        setup_intent = stripe.SetupIntent.create(
            customer=customer_id,
            payment_method_types=['card'],  # Only cards
            usage='off_session',  # Can charge later without customer present
            metadata={
                'created_from': 'profile_page',
                'purpose': 'save_payment_method'
            }
        )
        
        print(f"✅ Setup Intent created: {setup_intent.id}")
        print(f"   Client secret: {setup_intent.client_secret[:30]}...")
        print(f"{'='*60}\n")
        
        return jsonify({
            'clientSecret': setup_intent.client_secret,
            'setupIntentId': setup_intent.id
        }), 200
        
    except Exception as e:
        print(f'❌ Error creating setup intent: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/confirm-setup-intent', methods=['POST'])
def confirm_setup_intent():
    """Set payment method as default after Setup Intent succeeds"""
    try:
        data = request.get_json()
        setup_intent_id = data.get('setup_intent_id')
        set_as_default = data.get('set_as_default', True)
        
        if not setup_intent_id:
            return jsonify({'error': 'Setup Intent ID required'}), 400
        
        print(f"\n{'='*60}")
        print(f"Confirming Setup Intent: {setup_intent_id}")
        print(f"{'='*60}")
        
        # Retrieve the Setup Intent
        setup_intent = stripe.SetupIntent.retrieve(setup_intent_id)
        
        if setup_intent.status != 'succeeded':
            return jsonify({
                'error': f'Setup Intent status is {setup_intent.status}'
            }), 400
        
        customer_id = setup_intent.customer
        payment_method_id = setup_intent.payment_method
        
        print(f"  Customer: {customer_id}")
        print(f"  Payment Method: {payment_method_id}")
        
        # Set as default payment method for invoices
        if set_as_default:
            stripe.Customer.modify(
                customer_id,
                invoice_settings={
                    'default_payment_method': payment_method_id
                }
            )
            print(f"✅ Set as default payment method for invoices")
        
        print(f"✅ Setup Intent confirmed")
        print(f"{'='*60}\n")
        
        return jsonify({
            'success': True,
            'customer_id': customer_id,
            'payment_method_id': payment_method_id,
            'is_default': set_as_default
        }), 200
        
    except Exception as e:
        print(f'❌ Error confirming setup intent: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/set-default-payment-method', methods=['POST'])
def set_default_payment_method():
    """Set a payment method as default for invoices"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        payment_method_id = data.get('payment_method_id')
        
        if not customer_id or not payment_method_id:
            return jsonify({'error': 'Customer and payment method required'}), 400
        
        print(f"Setting default payment method for customer {customer_id}")
        
        # Update customer's default payment method
        customer = stripe.Customer.modify(
            customer_id,
            invoice_settings={
                'default_payment_method': payment_method_id
            }
        )
        
        print(f"✅ Default payment method set: {payment_method_id}")
        
        return jsonify({
            'success': True,
            'default_payment_method': payment_method_id
        }), 200
        
    except Exception as e:
        print(f'❌ Error setting default: {str(e)}')
        return jsonify({'error': str(e)}), 500


@app.route('/customer-details/<customer_id>', methods=['GET'])
def get_customer_details(customer_id):
    """Get customer details including default payment method"""
    try:
        print(f"\nRetrieving customer: {customer_id}")
        
        customer = stripe.Customer.retrieve(customer_id)
        
        print(f"  Customer object type: {type(customer)}")
        print(f"  Available keys: {list(customer.keys()) if hasattr(customer, 'keys') else 'N/A'}")
        
        # Safe access to all properties
        default_pm_id = None
        try:
            if hasattr(customer, 'invoice_settings') and customer.invoice_settings:
                default_pm_id = getattr(customer.invoice_settings, 'default_payment_method', None)
        except Exception as e:
            print(f"  Warning: invoice_settings error: {e}")
        
        # Build response with safe access
        response_data = {
            'id': customer.id,
            'email': getattr(customer, 'email', None),
            'name': getattr(customer, 'name', None),
            'created': getattr(customer, 'created', None),
            'default_payment_method': default_pm_id,
            'metadata': dict(customer.metadata) if hasattr(customer, 'metadata') else {}
        }
        
        print(f"✅ Customer details retrieved:")
        print(f"   Email: {response_data['email']}")
        print(f"   Name: {response_data['name']}")
        print(f"   Default PM: {default_pm_id}\n")
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f'❌ Error retrieving customer: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/customer-payment-methods/<customer_id>', methods=['GET'])
def get_customer_payment_methods(customer_id):
    """Get saved payment methods with default indicator"""
    try:
        # Get customer to check default payment method
        customer = stripe.Customer.retrieve(customer_id)
        default_pm_id = None
        if customer.invoice_settings and customer.invoice_settings.default_payment_method:
            default_pm_id = customer.invoice_settings.default_payment_method
        
        # Get all payment methods
        payment_methods = stripe.PaymentMethod.list(
            customer=customer_id,
            type='card'
        )
        
        formatted_methods = []
        for pm in payment_methods.data:
            formatted_methods.append({
                'id': pm.id,
                'brand': pm.card.brand,
                'last4': pm.card.last4,
                'exp_month': pm.card.exp_month,
                'exp_year': pm.card.exp_year,
                'is_default': pm.id == default_pm_id  # ← Mark if default
            })
        
        return jsonify({
            'paymentMethods': formatted_methods,
            'default_payment_method': default_pm_id
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========== SUBSCRIPTION ENDPOINTS ==========

@app.route('/api/subscription-plans', methods=['GET'])
def get_subscription_plans():
    """Get all available subscription plans"""
    try:
        print("Fetching subscription plans...")
        
        # Fetch all recurring products
        products = stripe.Product.list(
            active=True,
            expand=['data.default_price']
        )
        
        subscription_plans = []
        
        for product in products.data:
            # Only include products with recurring prices
            if product.default_price and product.default_price.recurring:
                plan_data = {
                    'id': product.id,
                    'name': product.name,
                    'description': product.description,
                    'images': product.images,
                    'price': {
                        'id': product.default_price.id,
                        'amount': product.default_price.unit_amount / 100,
                        'currency': product.default_price.currency.upper(),
                        'interval': product.default_price.recurring.interval,
                        'interval_count': product.default_price.recurring.interval_count
                    },
                    'features': product.metadata.get('features', '').split(',') if product.metadata.get('features') else []
                }
                subscription_plans.append(plan_data)
        
        print(f"✅ Found {len(subscription_plans)} subscription plans")
        return jsonify({'plans': subscription_plans}), 200
        
    except Exception as e:
        print(f'❌ Error fetching plans: {str(e)}')
        return jsonify({'error': str(e)}), 500


@app.route('/create-subscription', methods=['POST'])
def create_subscription():
    """Create a subscription for a customer"""
    try:
        data = request.get_json()
        customer_id = data.get('customer_id')
        price_id = data.get('price_id')
        payment_method_id = data.get('payment_method_id')
        
        if not customer_id or not price_id:
            return jsonify({'error': 'Customer and price required'}), 400
        
        print(f"\n{'='*60}")
        print(f"Creating Subscription")
        print(f"  Customer: {customer_id}")
        print(f"  Price: {price_id}")
        print(f"{'='*60}")
        
        subscription_params = {
            'customer': customer_id,
            'items': [{'price': price_id}],
            'payment_behavior': 'default_incomplete',
            'payment_settings': {
                'save_default_payment_method': 'on_subscription'
            },
            'expand': ['latest_invoice.payment_intent']
        }
        
        # If payment method provided, use it
        if payment_method_id:
            subscription_params['default_payment_method'] = payment_method_id
        
        subscription = stripe.Subscription.create(**subscription_params)
        
        print(f"✅ Subscription created: {subscription.id}")
        print(f"   Status: {subscription.status}")
        print(f"{'='*60}\n")
        
        return jsonify({
            'subscriptionId': subscription.id,
            'clientSecret': subscription.latest_invoice.payment_intent.client_secret,
            'status': subscription.status
        }), 200
        
    except Exception as e:
        print(f'❌ Error creating subscription: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/customer-subscriptions/<customer_id>', methods=['GET'])
def get_customer_subscriptions(customer_id):
    """Get all subscriptions for a customer"""
    try:
        print(f"\nFetching subscriptions for customer: {customer_id}")
        
        # Fetch subscriptions with proper expansion
        subscriptions = stripe.Subscription.list(
            customer=customer_id,
            status='all',
            limit=100
        )
        
        print(f"Found {len(subscriptions.data)} subscriptions")
        
        formatted_subs = []
        for sub in subscriptions.data:
            try:
                product_name = 'Unknown Product'
                amount = 0
                interval = 'month'
                
                # ← FIX: Access items correctly
                # sub.items is a StripeObject, not a method
                # Access via dictionary notation
                items_list = sub.get('items', {})
                
                if items_list and hasattr(items_list, 'data') and len(items_list.data) > 0:
                    first_item = items_list.data[0]
                    
                    # Get price
                    price = first_item.get('price') or first_item.price
                    
                    if price:
                        amount = getattr(price, 'unit_amount', 0) / 100 if hasattr(price, 'unit_amount') else 0
                        
                        # Get interval
                        if hasattr(price, 'recurring') and price.recurring:
                            interval = price.recurring.interval
                        
                        # Get product name
                        product_id = getattr(price, 'product', None)
                        if product_id:
                            if isinstance(product_id, str):
                                # Product is an ID, fetch it
                                try:
                                    product = stripe.Product.retrieve(product_id)
                                    product_name = product.name
                                except:
                                    product_name = f"Product {product_id[:10]}..."
                            else:
                                # Product is already an object
                                product_name = getattr(product_id, 'name', 'Unknown Product')
                
                formatted_sub = {
                    'id': sub.id,
                    'status': sub.status,
                    'current_period_start': sub.current_period_start,
                    'current_period_end': sub.current_period_end,
                    'cancel_at_period_end': sub.cancel_at_period_end,
                    'product_name': product_name,
                    'amount': amount,
                    'interval': interval,
                    'created': sub.created
                }
                
                formatted_subs.append(formatted_sub)
                print(f"  ✅ Subscription: {product_name} - ${amount}/{interval} ({sub.status})")
                
            except Exception as e:
                print(f"  ⚠️  Warning: Error processing subscription {sub.id}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        print(f"✅ Returning {len(formatted_subs)} subscriptions\n")
        return jsonify({'subscriptions': formatted_subs}), 200
        
    except Exception as e:
        print(f'❌ Error fetching subscriptions: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/cancel-subscription/<subscription_id>', methods=['POST'])
def cancel_subscription(subscription_id):
    """Cancel a subscription"""
    try:
        data = request.get_json()
        cancel_immediately = data.get('cancel_immediately', False)
        
        print(f"\nCanceling subscription: {subscription_id}")
        
        # ← FIX: Check subscription status first
        subscription = stripe.Subscription.retrieve(subscription_id)
        
        print(f"  Current status: {subscription.status}")
        
        # Can only cancel active, trialing, or past_due subscriptions
        if subscription.status in ['incomplete', 'incomplete_expired', 'canceled']:
            print(f"  ❌ Cannot cancel subscription with status: {subscription.status}")
            return jsonify({
                'error': f'Subscription is {subscription.status} and cannot be canceled'
            }), 400
        
        if cancel_immediately:
            # Cancel immediately
            subscription = stripe.Subscription.cancel(subscription_id)
            print(f"✅ Subscription canceled immediately")
        else:
            # Cancel at end of period
            subscription = stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True
            )
            print(f"✅ Subscription will cancel at period end")
        
        return jsonify({
            'success': True,
            'subscription_id': subscription.id,
            'status': subscription.status,
            'cancel_at_period_end': subscription.cancel_at_period_end
        }), 200
        
    except stripe.error.InvalidRequestError as e:
        print(f'❌ Invalid request: {str(e)}')
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        print(f'❌ Error canceling subscription: {str(e)}')
        return jsonify({'error': str(e)}), 500


@app.route('/report-usage', methods=['POST'])
def report_usage():
    """Report metered usage for Plus membership day passes"""
    try:
        data = request.get_json()
        subscription_item_id = data.get('subscription_item_id')
        quantity = data.get('quantity', 1)
        
        if not subscription_item_id:
            return jsonify({'error': 'Subscription item ID required'}), 400
        
        print(f"Recording usage: {quantity} day pass(es)")
        
        # Record usage
        usage_record = stripe.SubscriptionItem.create_usage_record(
            subscription_item_id,
            quantity=quantity,
            timestamp=int(time.time()),
            action='increment'
        )
        
        print(f"✅ Usage recorded: {usage_record.id}")
        
        return jsonify({
            'success': True,
            'usage_record_id': usage_record.id,
            'quantity': quantity
        }), 200
        
    except Exception as e:
        print(f'❌ Error recording usage: {str(e)}')
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"\n🚀 Starting Flask server on port {port}...")
    print(f"📍 Using Deferred Payment Intent pattern")
    print(f"📍 Health check: http://localhost:{port}/health\n")
    app.run(debug=True, port=port, host='0.0.0.0')