import stripe
import os
from dotenv import load_dotenv

load_dotenv()
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

products_to_create = [
    {'name': 'T-shirt', 'description': 'Premium gym t-shirt', 'price': 1000},
    {'name': 'Sweatshirt', 'description': 'Comfortable gym sweatshirt', 'price': 2000},
    {'name': 'Water bottle', 'description': 'Reusable gym water bottle', 'price': 800},
]

print("Creating products in Stripe...\n")

for item in products_to_create:
    try:
        # Create product
        product = stripe.Product.create(
            name=item['name'],
            description=item['description'],
        )
        
        # Create price
        price = stripe.Price.create(
            product=product.id,
            unit_amount=item['price'],
            currency='usd',
        )
        
        # Set as default price
        stripe.Product.modify(
            product.id,
            default_price=price.id
        )
        
        print(f"✅ Created: {item['name']} - ${item['price']/100:.2f}")
        print(f"   Product ID: {product.id}")
        print(f"   Price ID: {price.id}\n")
        
    except Exception as e:
        print(f"❌ Error creating {item['name']}: {e}\n")

print("Done! Check: https://dashboard.stripe.com/test/products")