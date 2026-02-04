import stripe
import os
from dotenv import load_dotenv

load_dotenv()

stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

print("Testing Stripe connection...")
print(f"API Key: {stripe.api_key[:20]}..." if stripe.api_key else "NO API KEY!")

try:
    # Test API connection - fetch products WITHOUT expand first
    products = stripe.Product.list(limit=10, active=True)
    print(f"\n✅ Stripe connection successful!")
    print(f"Found {len(products.data)} products\n")
    
    if len(products.data) == 0:
        print("⚠️  No products found!")
        print("   Please create products in Stripe Dashboard:")
        print("   https://dashboard.stripe.com/test/products")
    
    for product in products.data:
        print(f"Product: {product.name}")
        print(f"  ID: {product.id}")
        print(f"  Active: {product.active}")
        print(f"  Default Price ID: {product.default_price}")
        
        # Try to fetch the price separately
        if product.default_price:
            try:
                # If default_price is a string, retrieve it
                if isinstance(product.default_price, str):
                    price = stripe.Price.retrieve(product.default_price)
                else:
                    # If it's already an object
                    price = product.default_price
                
                print(f"  Price: ${price.unit_amount / 100:.2f} {price.currency.upper()}")
                print(f"  Price ID: {price.id}")
            except Exception as e:
                print(f"  ⚠️  Error fetching price: {e}")
        else:
            print(f"  ❌ NO DEFAULT PRICE SET!")
            print(f"     Go to: https://dashboard.stripe.com/test/products/{product.id}")
            print(f"     Add a price and set it as default")
        
        print()
            
except stripe.error.AuthenticationError as e:
    print(f"\n❌ Authentication Error: {e}")
    print("   Check your STRIPE_SECRET_KEY in .env file")
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()