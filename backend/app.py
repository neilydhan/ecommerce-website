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
    """Fetch all active products from Stripe API"""
    try:
        products = stripe.Product.list(active=True, expand=['data.default_price'])
        
        formatted_products = []
        for product in products.data:
            product_data = {
                'id': product.id,
                'name': product.name,
                'description': product.description,
                'images': product.images,
                'price': None
            }
            
            if product.default_price:
                product_data['price'] = {
                    'id': product.default_price.id,
                    'amount': product.default_price.unit_amount / 100,
                    'currency': product.default_price.currency.upper()
                }
            
            formatted_products.append(product_data)
        
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
        customer = stripe.Customer.retrieve(customer_id)
        
        # Get default payment method ID
        default_pm_id = None
        if customer.invoice_settings and customer.invoice_settings.default_payment_method:
            default_pm_id = customer.invoice_settings.default_payment_method
        
        return jsonify({
            'id': customer.id,
            'email': customer.email,
            'name': customer.name,
            'created': customer.created,
            'default_payment_method': default_pm_id,
            'metadata': customer.metadata
        }), 200
        
    except Exception as e:
        print(f'❌ Error retrieving customer: {str(e)}')
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

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"\n🚀 Starting Flask server on port {port}...")
    print(f"📍 Using Deferred Payment Intent pattern")
    print(f"📍 Health check: http://localhost:{port}/health\n")
    app.run(debug=True, port=port, host='0.0.0.0')