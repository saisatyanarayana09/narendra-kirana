from django.contrib.auth import get_user_model; from cart.models import Cart, CartItem; from products.models import Product, Category; print('Total products:', Product.objects.count())  
