import stripe
import os
from dotenv import load_dotenv

load_dotenv()
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

print("Creating subscription products...\n")

# 1. Unlimited Monthly
try:
    product1 = stripe.Product.create(
        name='Unlimited Membership - Monthly',
        description='Unlimited gym access with day passes included',
        metadata={
            'features': 'Unlimited day passes,24/7 gym access,All equipment included,Group classes'
        }
    )
    
    price1 = stripe.Price.create(
        product=product1.id,
        unit_amount=4999,  # $49.99
        currency='sgd',
        recurring={'interval': 'month'}
    )
    
    stripe.Product.modify(product1.id, default_price=price1.id)
    
    print(f"✅ Created: Unlimited Monthly")
    print(f"   Product ID: {product1.id}")
    print(f"   Price ID: {price1.id}")
    print(f"   Amount: $49.99/month\n")
except Exception as e:
    print(f"❌ Error creating Unlimited Monthly: {e}\n")

# 2. Unlimited Annual
try:
    product2 = stripe.Product.create(
        name='Unlimited Membership - Annual',
        description='12 months of unlimited gym access',
        metadata={
            'features': 'Unlimited day passes,24/7 gym access,All equipment included,Group classes,Save $99.88/year'
        }
    )
    
    price2 = stripe.Price.create(
        product=product2.id,
        unit_amount=50000,  # $500.00
        currency='sgd',
        recurring={'interval': 'year'}
    )
    
    stripe.Product.modify(product2.id, default_price=price2.id)
    
    print(f"✅ Created: Unlimited Annual")
    print(f"   Product ID: {product2.id}")
    print(f"   Price ID: {price2.id}")
    print(f"   Amount: $500.00/year\n")
except Exception as e:
    print(f"❌ Error creating Unlimited Annual: {e}\n")

# 3. Plus Monthly (Base fee)
try:
    product3 = stripe.Product.create(
        name='Plus Membership - Monthly',
        description='Reduced rate day passes',
        metadata={
            'features': 'Reduced day pass rate ($7.49/pass),Member-only classes,Equipment priority,Monthly wellness check-in'
        }
    )
    
    price3 = stripe.Price.create(
        product=product3.id,
        unit_amount=1999,  # $19.99
        currency='sgd',
        recurring={'interval': 'month'}
    )
    
    stripe.Product.modify(product3.id, default_price=price3.id)
    
    print(f"✅ Created: Plus Monthly Base")
    print(f"   Product ID: {product3.id}")
    print(f"   Price ID: {price3.id}")
    print(f"   Amount: $19.99/month\n")
    
    # Create metered price for day passes
    price3_metered = stripe.Price.create(
        product=product3.id,
        unit_amount=749,  # $7.49 per pass
        currency='sgd',
        recurring={
            'interval': 'month',
            'usage_type': 'metered',
            'aggregate_usage': 'sum'
        }
    )
    
    print(f"✅ Created: Plus Day Pass (Metered)")
    print(f"   Price ID: {price3_metered.id}")
    print(f"   Amount: $7.49/pass\n")
    
except Exception as e:
    print(f"❌ Error creating Plus Monthly: {e}\n")

print("Done! Check: https://dashboard.stripe.com/test/products")