from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import stripe
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Configure Stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
stripe.api_version = '2026-01-28.clover'  # This is correct
webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')

@app.route('/api/products', methods=['GET'])
def get_products():
    """Fetch all active products from Stripe API"""
    try:
        # Fetch all active products with their default prices
        products = stripe.Product.list(
            active=True,
            expand=['data.default_price']
        )
        
        # Format the response
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


@app.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    """Create Stripe Checkout Session with Custom UI"""
    try:
        data = request.get_json()
        items = data.get('items', [])
        shipping_option = data.get('shipping_option', 'standard') 
        
        print(f"Creating custom checkout session for {len(items)} items")
        print(f"Shipping option: {shipping_option}") 
        
        if not items or len(items) == 0:
            return jsonify({'error': 'Cart is empty'}), 400
        
        # Format line items for Stripe
        line_items = []
        for item in items:
            line_items.append({
                'price': item['priceId'],
                'quantity': item['quantity']
            })
        
        shipping_prices = {
            'standard': 500,  # $5.00 in cents
            'express': 1500   # $15.00 in cents
        }

        shipping_amount = shipping_prices.get(shipping_option, 500)

        # Create Checkout Session with CUSTOM UI mode
        session = stripe.checkout.Session.create(
            ui_mode='custom',
            line_items=line_items,
            mode='payment',
            return_url='http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}',
            automatic_tax={'enabled': True},
            shipping_options=[  
                {
                    'shipping_rate_data': {
                        'type': 'fixed_amount',
                        'fixed_amount': {
                            'amount': 500,
                            'currency': 'sgd',
                        },
                        'display_name': 'Standard Shipping',
                        'delivery_estimate': {
                            'minimum': {'unit': 'business_day', 'value': 5},
                            'maximum': {'unit': 'business_day', 'value': 7},
                        }
                    },
                },
                {
                    'shipping_rate_data': {
                        'type': 'fixed_amount',
                        'fixed_amount': {
                            'amount': 1500,
                            'currency': 'sgd',
                        },
                        'display_name': 'Express Shipping',
                        'delivery_estimate': {
                            'minimum': {'unit': 'business_day', 'value': 1},
                            'maximum': {'unit': 'business_day', 'value': 2},
                        }
                    },
                },
            ],
            metadata={  # ← NEW: Store shipping option in metadata
                'shipping_option': shipping_option,
                'items': str(items)  # Store items for reference
            }
        )
        
        print(f"✅ Checkout session created: {session.id}")
        print(f"   Client secret (first 30 chars): {session.client_secret[:30]}...")
        print(f"   Shipping: {shipping_option} (${shipping_amount/100:.2f})")
        
        # Return the client secret - make sure it's not double-encoded
        return jsonify(clientSecret=session.client_secret), 200
        
    except Exception as e:
        print(f'❌ Error creating checkout session: {str(e)}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/session-status', methods=['GET'])
def session_status():
    """Get checkout session status"""
    try:
        session_id = request.args.get('session_id')
        
        if not session_id:
            return jsonify({'error': 'session_id required'}), 400
        
        session = stripe.checkout.Session.retrieve(session_id)
        
        return jsonify({
            'status': session.status,
            'payment_status': session.payment_status,
            'customer_email': session.customer_details.email if session.customer_details else None,
            'amount_total': session.amount_total / 100 if session.amount_total else 0
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    
@app.route('/verify-session/<session_id>', methods=['GET'])
def verify_session(session_id):
    """Verify payment was successful"""
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        return jsonify({
            'status': session.payment_status,
            'customer_email': session.customer_details.email if session.customer_details else None,
            'amount_total': session.amount_total / 100 if session.amount_total else 0
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/webhook', methods=['POST'])
def webhook():
    """Handle Stripe webhooks"""
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError as e:
        print(f'Invalid payload: {str(e)}')
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        print(f'Invalid signature: {str(e)}')
        return jsonify({'error': 'Invalid signature'}), 400
    
    # Handle the checkout.session.completed event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        print('Order completed:')
        print(f"  Session ID: {session.get('id')}")
        print(f"  Customer Email: {session.get('customer_details', {}).get('email')}")
        print(f"  Amount Total: ${session.get('amount_total', 0) / 100:.2f}")

        #Log shipping information
        print(f"  Shipping Option: {session.get('metadata', {}).get('shipping_option')}")
        if session.get('shipping_cost'):
            print(f"  Shipping Cost: ${session.get('shipping_cost', {}).get('amount_total', 0) / 100:.2f}")
        
        # TODO: Fulfill the order with correct shipping method
    
    return jsonify({'success': True}), 200


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"\n🚀 Starting Flask server on port {port}...")
    print(f"📍 Stripe API Version: {stripe.api_version}")
    print(f"📍 Health check: http://localhost:{port}/health\n")
    app.run(debug=True, port=port, host='0.0.0.0')