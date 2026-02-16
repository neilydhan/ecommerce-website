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
    """Create Payment Intent AFTER customer selects shipping (Deferred Intent)"""
    try:
        data = request.get_json()
        items = data.get('items', [])
        shipping_option = data.get('shipping_option')
        
        if not items or len(items) == 0:
            return jsonify({'error': 'Cart is empty'}), 400
        
        if not shipping_option:
            return jsonify({'error': 'Shipping option required'}), 400
        
        print(f"\n{'='*60}")
        print(f"Creating Payment Intent (Deferred)")
        print(f"{'='*60}")
        
        # Calculate product total
        total_amount = 0
        items_description = []
        
        for item in items:
            price = stripe.Price.retrieve(item['priceId'])
            product = stripe.Product.retrieve(price.product)
            item_total = price.unit_amount * item['quantity']
            total_amount += item_total
            items_description.append(f"{product.name} x{item['quantity']}")
        
        # Add shipping cost
        shipping_costs = {
            'standard': 500,   # $5.00
            'express': 1500    # $15.00
        }
        shipping_amount = shipping_costs.get(shipping_option, 500)
        total_amount += shipping_amount
        
        print(f"Products: {', '.join(items_description)}")
        print(f"  Subtotal: ${(total_amount - shipping_amount)/100:.2f}")
        print(f"  Shipping ({shipping_option}): ${shipping_amount/100:.2f}")
        print(f"  Total: ${total_amount/100:.2f}")
        
        # Create Payment Intent with final amount
        intent = stripe.PaymentIntent.create(
            amount=total_amount,
            currency='usd',
            automatic_payment_methods={'enabled': True},
            metadata={
                'shipping_option': shipping_option,
                'shipping_cost': shipping_amount / 100,
                'items': str(items)
            },
            description=f"Order: {', '.join(items_description)} | Shipping: {shipping_option}"
        )
        
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


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'}), 200


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    print(f"\n🚀 Starting Flask server on port {port}...")
    print(f"📍 Using Deferred Payment Intent pattern")
    print(f"📍 Health check: http://localhost:{port}/health\n")
    app.run(debug=True, port=port, host='0.0.0.0')