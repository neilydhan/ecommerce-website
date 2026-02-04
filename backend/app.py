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
    """Create a Stripe Checkout session with cart items"""
    try:
        data = request.get_json()
        items = data.get('items', [])
        
        # Validate that items were provided
        if not items or len(items) == 0:
            return jsonify({'error': 'Cart is empty'}), 400
        
        # Format items for Stripe Checkout
        line_items = []
        for item in items:
            line_items.append({
                'price': item['priceId'],
                'quantity': item['quantity']
            })
        
        # Get the origin for success/cancel URLs
        origin = request.headers.get('Origin', 'http://localhost:3000')
        
        # Create Stripe Checkout Session
        session = stripe.checkout.Session.create(
            ui_mode = 'custom',
            line_items=line_items,
            mode='payment',
            success_url=f'{origin}/success?session_id={{CHECKOUT_SESSION_ID}}',
            cancel_url=f'{origin}/',
            return_url=f'{origin}/complete?session_id={{CHECKOUT_SESSION_ID}}',
            automatic_tax={'enabled': True},
            shipping_address_collection={
                'allowed_countries': ['US', 'CA'],
            },
        )
        
        return jsonify({'url': session.url}), 200
        
    except Exception as e:
        print(f'Error creating checkout session: {str(e)}')
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
        # Invalid payload
        print(f'Invalid payload: {str(e)}')
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        print(f'Invalid signature: {str(e)}')
        return jsonify({'error': 'Invalid signature'}), 400
    
    # Handle the checkout.session.completed event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # Fulfill the order
        print('Order completed:')
        print(f"  Session ID: {session.get('id')}")
        print(f"  Customer Email: {session.get('customer_details', {}).get('email')}")
        print(f"  Amount Total: {session.get('amount_total', 0) / 100}")
        
        # TODO: Add your custom logic here:
        # - Save to database
        # - Send confirmation email
        # - Update inventory
        # - Grant access/ship products
    
    return jsonify({'success': True}), 200


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(debug=True, port=port)